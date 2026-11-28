// The ratchet on element kinds: counts the places a package asks "which element kind is this" by name, and the places
// it reads an element's props as unknown values, against a committed budget. A count may only go down. What an element
// kind is lives in its own folder in each package (`packages/*/src/elements/<kind>/`) or, for a kind that has none
// yet, in one table (packages/kit/src/jsx/capabilities.ts); a new question about a kind is asked there, not in a new
// list in a package.
//
//   tsx scripts/kind-branches.ts            print the counts and how they differ from scripts/kind-branches.json
//   tsx scripts/kind-branches.ts --strict   fail on any difference from the budget (what `pnpm kinds` and CI run)
//   tsx scripts/kind-branches.ts --update   write the counts; refuses to raise one
//   tsx scripts/kind-branches.ts --list     print every place counted
//
// It walks each package's program with the type checker (as the time lint does), so a kind is told by its type and
// not by what the variable holding it is called. What it counts, per package:
//   compare  a kind compared with a name: `p.kind === "title"`, `const k = p.kind; k !== "gap"`, `case "shape":`.
//            The other side's type must be kinds (`Kind`, or some of them); a string named `kind` counts too, since
//            a kind read off the page or out of JSON is one. A manifest asset's kind or a draw op's is not counted:
//            its type holds names that are no element kind.
//   list     an array of two or more kinds written out, and a handler's one-kind `kinds: ["nested"]`
//   cast     an `as` on a line that reads props (`props.stroke as Stroke`, `p.props as Record<string, unknown>`)
//   read     a prop read as an unknown value: `Number(props.size ?? 48)`, `typeof p.props.fit === "string"`
// The last two count what a placement typed by its kind takes away: a cast says what the schema already says, and a
// coercion with a default says it a second time. Narrow the placement (`placed`, `hasProp`, `p.kind === … && p.parsed`
// from @uberscene/sdk) and read the prop as its type.
// A match that is not an element's kind though its type is all kind names (a shader's `"effect" | "transition"`, a
// parsed time ref's) is named once in the budget file's `ignore`, as "file: matched text".
//
// Sealed kinds are stricter: a sealed kind may be named only in its own folders. They are the kinds that have folders
// (the kit's `KIT_ELEMENTS`), so a kind is sealed the moment it gets them, and no list of them is kept here. Any
// comparison or list that names one, and any place its name is written where a kind is expected (`placed(p, "title")`,
// `capabilitiesOf("shape")`), outside `packages/*/src/elements/`, the editor's `registry/editor/elements.tsx` and the
// files the budget's `allow` lists with a reason, fails outright, whatever the counts.
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";

import { KIT_ELEMENTS } from "../packages/kit/src/elements";
import { KIND_CAPABILITIES } from "../packages/kit/src/jsx/capabilities";
import { DERIVED_KINDS } from "../packages/kit/src/jsx/elements";

const root = join(import.meta.dirname, "..");
const budgetFile = join(import.meta.dirname, "kind-branches.json");

/** Every kind, and the kinds a file writes: the table's, less what the resolver makes from props (a keyframe, an effect). */
const ALL_KINDS = new Set(Object.keys(KIND_CAPABILITIES));
const KINDS = new Set([...ALL_KINDS].filter((k) => !(DERIVED_KINDS as ReadonlySet<string>).has(k)));

/** Each package's program, and where its source lives. */
const PACKAGES: Record<string, { readonly project: string; readonly dirs: readonly string[] }> = {
  kit: { project: "packages/kit", dirs: ["packages/kit/src"] },
  sdk: { project: "packages/sdk", dirs: ["packages/sdk/src"] },
  player: { project: "packages/player", dirs: ["packages/player/src"] },
  render: { project: "packages/render", dirs: ["packages/render/src"] },
  editor: { project: "packages/editor/app", dirs: ["packages/editor/src", "packages/editor/registry"] },
};
/** The table itself is the one place the kinds without folders are meant to be named. */
const SKIP = new Set(["packages/kit/src/jsx/capabilities.ts"]);
/** A kind's own folders, where its name belongs: no comparison or list there is counted, and a sealed kind is at home. */
const ELEMENT_FOLDER = /^packages\/[^/]+\/src\/elements\/|^packages\/editor\/registry\/editor\/elements\.tsx$/;

/** A line that reads props, less comments. */
const PROPS_LINE = /\bprops\b/i;
const COMMENT = /^\s*(?:\/\/|\*|\/\*)/;
const CAST = /\bas\s+(?!const\b)[A-Za-z_{([]/g;
const READ = /\b(?:Number|String|Boolean)\(\s*[\w.?!]*\bprops\b|\btypeof\s+[\w.?!]*\bprops\b[\w.?![\]"']*\s*[!=]==/gi;
/** A string that holds a kind is called one. */
const NAMED_KIND = /[kK]ind$/;
/** Receivers whose string `kind` is never an element's: a manifest asset, a probed file, a draw op. */
const NOT_AN_ELEMENT = /asset|media|source|draw|probed|op\.?$|\bo\.$/i;

interface Hit {
  readonly file: string;
  readonly line: number;
  readonly what: What;
  readonly text: string;
}
const WHAT = ["compare", "list", "cast", "read"] as const;
type What = (typeof WHAT)[number];
type Counts = Record<string, Record<What, number>>;
interface Budget {
  readonly counts: Counts;
  readonly ignore: readonly string[];
  /**
   * Files outside those folders that may name a sealed kind, each with why: any sealed kind, or only those in
   * `kinds`.
   */
  readonly allow?: readonly { readonly file: string; readonly kinds?: readonly string[]; readonly why: string }[];
}

const budget = JSON.parse(readFileSync(budgetFile, "utf8")) as Budget;
const ignored = new Set(budget.ignore);
const usedIgnores = new Set<string>();
/** Kinds that may be named only in their own folders: every kind that has them. */
const sealed = new Set<string>(Object.keys(KIT_ELEMENTS));
/** The sealed kinds each allowed file may name: every one, where its entry lists none. */
const allowed = new Map((budget.allow ?? []).map((a) => [a.file, a.kinds ? new Set(a.kinds) : null] as const));
const usedAllows = new Set<string>();
/** Where a sealed kind is named outside its folders: `file:line  what was written`. */
const breaches: string[] = [];

/**
 * A shader's kind, `"effect" | "transition"`: the names of two element kinds, but what a shader is declared as (an
 * effect's or a transition's), and no element's kind. A type of exactly these names is not counted as kinds.
 */
const SHADER_KINDS = new Set(["effect", "transition"]);

/** What a type says of a value compared with a kind's name: it is a kind, it is any string, or it is something else. */
function holds(checker: ts.TypeChecker, type: ts.Type): "kinds" | "string" | "other" {
  const of = checker.getBaseConstraintOfType(type) ?? type;
  const parts = (of.isUnion() ? of.types : [of]).filter(
    (t) => (t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) === 0,
  );
  if (parts.length === 0) return "other";
  const names = parts.map((t) => (t.isStringLiteral() ? t.value : null));
  if (names.length === SHADER_KINDS.size && names.every((n) => n !== null && SHADER_KINDS.has(n))) return "other";
  if (parts.every((t) => t.isStringLiteral() && ALL_KINDS.has(t.value))) return "kinds";
  if (parts.every((t) => (t.flags & ts.TypeFlags.String) !== 0)) return "string";
  return "other";
}

const kindName = (node: ts.Node): string | undefined =>
  (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && KINDS.has(node.text)
    ? node.text
    : undefined;

const EQUALITY = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

function hitsIn(source: ts.SourceFile, checker: ts.TypeChecker): Hit[] {
  const file = relative(root, source.fileName);
  if (SKIP.has(file)) return [];
  const home = ELEMENT_FOLDER.test(file);
  const out: Hit[] = [];
  const lineOf = (node: ts.Node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const words = (node: ts.Node) => node.getText(source).replace(/\s+/g, " ");

  /** A sealed kind named here: at home in its folders and in an allowed file, a breach anywhere else. */
  const names = (node: ts.Node, kinds: readonly string[]): void => {
    const named = kinds.filter((k) => sealed.has(k));
    if (home || named.length === 0) return;
    const may = allowed.get(file);
    if (may !== undefined && named.every((k) => may === null || may.has(k))) usedAllows.add(file);
    else breaches.push(`${file}:${lineOf(node)}  ${words(node).slice(0, 100)}`);
  };
  const add = (node: ts.Node, what: What, kinds: readonly string[]): void => {
    names(node, kinds);
    // A kind's own folders are where it is named: nothing there is counted.
    if (home) return;
    const text = words(node);
    const key = `${file}: ${text}`;
    if (ignored.has(key)) usedIgnores.add(key);
    else out.push({ file, line: lineOf(node), what, text });
  };
  /** Whether `other`, compared with a kind's name, is a kind: by its type, or a string that is called one. */
  const isKind = (other: ts.Expression): boolean => {
    const held = holds(checker, checker.getTypeAtLocation(other));
    if (held === "kinds") return true;
    const text = other.getText(source);
    return held === "string" && NAMED_KIND.test(text) && !NOT_AN_ELEMENT.test(text.replace(/[kK]ind$/, ""));
  };

  const visit = (node: ts.Node): void => {
    if (ts.isBinaryExpression(node) && EQUALITY.has(node.operatorToken.kind)) {
      const left = kindName(node.left);
      const right = kindName(node.right);
      const name = right ?? left;
      const other = right !== undefined ? node.left : node.right;
      if (name !== undefined && (left === undefined || right === undefined) && isKind(other))
        add(node, "compare", [name]);
    } else if (ts.isCaseClause(node)) {
      const name = kindName(node.expression);
      if (name !== undefined && isKind(node.parent.parent.expression)) {
        names(node.expression, [name]);
        if (!home) {
          const text = `case ${words(node.expression)}:`;
          const key = `${file}: ${text}`;
          if (ignored.has(key)) usedIgnores.add(key);
          else out.push({ file, line: lineOf(node), what: "compare", text });
        }
      }
    } else if (ts.isArrayLiteralExpression(node) && node.elements.length > 0) {
      const kinds = node.elements.map(kindName);
      const all = kinds.every((k): k is string => k !== undefined);
      const one =
        node.elements.length === 1 &&
        ts.isPropertyAssignment(node.parent) &&
        node.parent.name.getText(source) === "kinds";
      if (all && (node.elements.length > 1 || one)) add(one ? node.parent : node, "list", kinds as string[]);
    } else if (ts.isStringLiteral(node) && sealed.has(node.text) && !home) {
      // A sealed kind's name written where a kind is expected: an argument, a property, an element of a typed list.
      const expected = checker.getContextualType(node);
      const parent = node.parent;
      const counted =
        (ts.isBinaryExpression(parent) && EQUALITY.has(parent.operatorToken.kind)) ||
        ts.isCaseClause(parent) ||
        ts.isArrayLiteralExpression(parent);
      if (!counted && expected && holds(checker, expected) === "kinds") names(node, [node.text]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  let line = 0;
  for (const text of source.text.split("\n")) {
    line += 1;
    if (!PROPS_LINE.test(text) || COMMENT.test(text)) continue;
    for (const _ of text.matchAll(CAST)) out.push({ file, line, what: "cast", text: text.trim() });
    for (const _ of text.matchAll(READ)) out.push({ file, line, what: "read", text: text.trim() });
  }
  return out;
}

function programOf(project: string): ts.Program {
  const configPath = join(root, project, "tsconfig.json");
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (d) => {
        throw new Error(ts.flattenDiagnosticMessageText(d.messageText, "\n"));
      },
    },
  );
  if (!parsed) throw new Error(`cannot read ${configPath}`);
  return ts.createProgram(parsed.fileNames, parsed.options);
}

const hits: Record<string, Hit[]> = {};
const counts: Counts = {};
for (const [name, { project, dirs }] of Object.entries(PACKAGES)) {
  const program = programOf(project);
  const checker = program.getTypeChecker();
  const own = dirs.map((d) => `${join(root, d)}/`);
  const sources = program
    .getSourceFiles()
    .filter(
      (f) =>
        own.some((dir) => f.fileName.startsWith(dir)) &&
        !/\.(test|d)\.tsx?$/.test(f.fileName) &&
        !f.fileName.endsWith(".generated.ts"),
    )
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
  const found = sources.flatMap((f) => hitsIn(f, checker));
  hits[name] = found;
  const of = (what: What) => found.filter((h) => h.what === what).length;
  counts[name] = { compare: of("compare"), list: of("list"), cast: of("cast"), read: of("read") };
}

if (process.argv.includes("--list"))
  for (const list of Object.values(hits))
    for (const h of list) console.log(`${h.file}:${h.line}  ${h.what}  ${h.text}`);

console.log(
  Object.entries(counts)
    .map(
      ([name, c]) =>
        `${name.padEnd(7)} compare ${String(c.compare).padStart(3)}  list ${String(c.list).padStart(2)}  cast ${String(c.cast).padStart(3)}  read ${String(c.read).padStart(3)}`,
    )
    .join("\n"),
);

if (breaches.length > 0) {
  console.error(
    `\nA sealed kind (${[...sealed].join(", ")}) is named outside its own folders:\n  ${[...new Set(breaches)].join("\n  ")}\n\nA sealed kind has a folder in each package (packages/*/src/elements/<kind>/), and only code there knows its name. Ask the kind's part instead: add what you need to its entry (KitElement, SdkElement, PlayerElement) and read it through the registry, or ask a trait (capabilitiesOf). A file that has to name it is listed in scripts/kind-branches.json under "allow", with why.`,
  );
  process.exit(1);
}

const over: string[] = [];
const under: string[] = [];
for (const [name, c] of Object.entries(counts))
  for (const what of WHAT) {
    const budgeted = budget.counts[name]?.[what];
    // A count the budget has never held: `--update` writes it, and until then it is a difference like any other.
    if (budgeted === undefined) {
      under.push(`${name} ${what}: ${c[what]}, and the budget has none yet`);
      continue;
    }
    if (c[what] > budgeted) over.push(`${name} ${what}: ${c[what]}, the budget is ${budgeted}`);
    if (c[what] < budgeted) under.push(`${name} ${what}: ${c[what]}, the budget is ${budgeted}`);
  }
const stale = [
  ...budget.ignore.filter((key) => !usedIgnores.has(key)).map((key) => `ignored, but no longer in the code: ${key}`),
  ...(budget.allow ?? [])
    .filter((a) => !usedAllows.has(a.file))
    .map((a) => `allowed to name a sealed kind, but no longer does: ${a.file}`),
];

if (over.length > 0) {
  console.error(
    `\nMore than the budget allows:\n  ${over.join("\n  ")}\n\ncompare, list: code names an element kind. Ask the kind's entry instead (capabilitiesOf, kindsWhere, kindsWithProp in @uberscene/kit/schema), adding a trait to packages/kit/src/jsx/capabilities.ts if the question is new; a kind with a folder of its own (packages/*/src/elements/<kind>/) is asked through its registry.\ncast, read: code reads a prop as an unknown value. Narrow the placement to its kind (placed, hasProp, or \`p.kind === "clip" && p.parsed\`, from @uberscene/sdk) and read the prop as its type; the schema has already set its default.\n\`pnpm kinds --list\` prints every place.`,
  );
  process.exit(1);
}
if (process.argv.includes("--update")) {
  const next: Budget = {
    counts,
    ignore: budget.ignore.filter((key) => usedIgnores.has(key)),
    allow: (budget.allow ?? []).filter((a) => usedAllows.has(a.file)),
  };
  writeFileSync(budgetFile, `${JSON.stringify(next, null, 2)}\n`);
  console.log("\nscripts/kind-branches.json written.");
} else if (under.length > 0 || stale.length > 0) {
  const lines = [...under.map((line) => `below the budget: ${line}`), ...stale];
  console.log(`\n${lines.join("\n")}\n\nRun \`pnpm kinds --update\` to write the lower counts.`);
  if (process.argv.includes("--strict")) process.exit(1);
}
