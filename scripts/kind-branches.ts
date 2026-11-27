// The ratchet on element kinds: counts the places a package asks "which element kind is this" by name, and the places
// it reads an element's props as unknown values, against a committed budget. A count may only go down. What an element
// kind is lives in one table (packages/kit/src/jsx/capabilities.ts); a new question about a kind is a trait there, not
// a new list in a package.
//
//   tsx scripts/kind-branches.ts            print the counts and how they differ from scripts/kind-branches.json
//   tsx scripts/kind-branches.ts --strict   fail on any difference from the budget (what `pnpm kinds` and CI run)
//   tsx scripts/kind-branches.ts --update   write the counts; refuses to raise one
//   tsx scripts/kind-branches.ts --list     print every place counted
//
// What it counts, per package:
//   compare  `x.kind === "title"`, `kind !== "gap"`, `case "shape":`
//   list     an array of two or more kinds written out, and a handler's one-kind `kinds: ["nested"]`
//   cast     an `as` on a line that reads props (`props.stroke as Stroke`, `p.props as Record<string, unknown>`)
//   read     a prop read as an unknown value: `Number(props.size ?? 48)`, `typeof p.props.fit === "string"`
// The last two count what a placement typed by its kind takes away: a cast says what the schema already says, and a
// coercion with a default says it a second time. Narrow the placement (`placed`, `hasProp`, `p.kind === … && p.parsed`
// from @uberscene/sdk) and read the prop as its type.
// A kind compared by another name is not seen (`const k = p.kind; k !== "adjustment"`), nor one in a `Set` built from
// spread values; review still has to catch those. A match that is not an element's kind (a shader's kind, a parsed
// time ref's, a sync event's) is named once in the budget file's `ignore`, as "file: matched text".
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import { KIND_CAPABILITIES } from "../packages/kit/src/jsx/capabilities";
import { DERIVED_KINDS } from "../packages/kit/src/jsx/elements";

const root = join(import.meta.dirname, "..");
const budgetFile = join(import.meta.dirname, "kind-branches.json");

/** The element kinds: the table's, less what the resolver makes from props (a keyframe, an effect, a freeze). */
const KINDS = Object.keys(KIND_CAPABILITIES).filter((k) => !DERIVED_KINDS.has(k));
const kind = `"(?:${KINDS.join("|")})"`;

/** Where the packages' source lives. The table itself is the one place kinds are meant to be named. */
const PACKAGES: Record<string, string[]> = {
  kit: ["packages/kit/src"],
  sdk: ["packages/sdk/src"],
  player: ["packages/player/src"],
  render: ["packages/render/src"],
  editor: ["packages/editor/src", "packages/editor/registry"],
};
const SKIP = new Set(["packages/kit/src/jsx/capabilities.ts"]);

const COMPARE = new RegExp(`(\\b[\\w.?]*)\\b[kK]ind\\s*[!=]==\\s*${kind}|\\bcase\\s+${kind}\\s*:`, "g");
const LIST = new RegExp(`\\[\\s*${kind}(?:\\s*,\\s*${kind})+\\s*,?\\s*\\]|\\bkinds:\\s*\\[\\s*${kind}\\s*\\]`, "g");
/** A line that reads props, less comments. */
const PROPS_LINE = /\bprops\b/i;
const COMMENT = /^\s*(?:\/\/|\*|\/\*)/;
const CAST = /\bas\s+(?!const\b)[A-Za-z_{([]/g;
const READ = /\b(?:Number|String|Boolean)\(\s*[\w.?!]*\bprops\b|\btypeof\s+[\w.?!]*\bprops\b[\w.?![\]"']*\s*[!=]==/gi;
/** Receivers whose `kind` is never an element's: a manifest asset, a probed file, a draw op. */
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
}

const budget = JSON.parse(readFileSync(budgetFile, "utf8")) as Budget;
const ignored = new Set(budget.ignore);
const usedIgnores = new Set<string>();

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...files(path));
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|d)\.tsx?$/.test(name) && !name.endsWith(".generated.ts"))
      out.push(path);
  }
  return out;
}

function hitsIn(path: string): Hit[] {
  const file = relative(root, path);
  if (SKIP.has(file)) return [];
  const text = readFileSync(path, "utf8");
  const lineOf = (index: number) => text.slice(0, index).split("\n").length;
  const out: Hit[] = [];
  const add = (index: number, what: Hit["what"], matched: string): void => {
    const key = `${file}: ${matched}`;
    if (ignored.has(key)) usedIgnores.add(key);
    else out.push({ file, line: lineOf(index), what, text: matched });
  };
  for (const m of text.matchAll(COMPARE))
    if (!NOT_AN_ELEMENT.test(m[1] ?? "")) add(m.index, "compare", m[0].replace(/\s+/g, " "));
  for (const m of text.matchAll(LIST)) add(m.index, "list", m[0].replace(/\s+/g, " "));
  let line = 0;
  for (const source of text.split("\n")) {
    line += 1;
    if (!PROPS_LINE.test(source) || COMMENT.test(source)) continue;
    for (const _ of source.matchAll(CAST)) out.push({ file, line, what: "cast", text: source.trim() });
    for (const _ of source.matchAll(READ)) out.push({ file, line, what: "read", text: source.trim() });
  }
  return out;
}

const hits: Record<string, Hit[]> = {};
const counts: Counts = {};
for (const [name, dirs] of Object.entries(PACKAGES)) {
  hits[name] = dirs.flatMap((d) => files(join(root, d))).flatMap(hitsIn);
  const of = (what: What) => (hits[name] as Hit[]).filter((h) => h.what === what).length;
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

const over: string[] = [];
const under: string[] = [];
for (const [name, c] of Object.entries(counts))
  for (const what of WHAT) {
    const allowed = budget.counts[name]?.[what];
    // A count the budget has never held: `--update` writes it, and until then it is a difference like any other.
    if (allowed === undefined) {
      under.push(`${name} ${what}: ${c[what]}, and the budget has none yet`);
      continue;
    }
    if (c[what] > allowed) over.push(`${name} ${what}: ${c[what]}, the budget is ${allowed}`);
    if (c[what] < allowed) under.push(`${name} ${what}: ${c[what]}, the budget is ${allowed}`);
  }
const stale = budget.ignore.filter((key) => !usedIgnores.has(key));

if (over.length > 0) {
  console.error(
    `\nMore than the budget allows:\n  ${over.join("\n  ")}\n\ncompare, list: code names an element kind. Ask the kind's entry instead (capabilitiesOf, kindsWhere, kindsWithProp in @uberscene/kit/schema), adding a trait to packages/kit/src/jsx/capabilities.ts if the question is new.\ncast, read: code reads a prop as an unknown value. Narrow the placement to its kind (placed, hasProp, or \`p.kind === "title" && p.parsed\`, from @uberscene/sdk) and read the prop as its type; the schema has already set its default.\n\`pnpm kinds --list\` prints every place.`,
  );
  process.exit(1);
}
if (process.argv.includes("--update")) {
  const kept = budget.ignore.filter((key) => usedIgnores.has(key));
  writeFileSync(budgetFile, `${JSON.stringify({ counts, ignore: kept }, null, 2)}\n`);
  console.log("\nscripts/kind-branches.json written.");
} else if (under.length > 0 || stale.length > 0) {
  const lines = [
    ...under.map((line) => `below the budget: ${line}`),
    ...stale.map((key) => `ignored, but no longer in the code: ${key}`),
  ];
  console.log(`\n${lines.join("\n")}\n\nRun \`pnpm kinds --update\` to write the lower counts.`);
  if (process.argv.includes("--strict")) process.exit(1);
}
