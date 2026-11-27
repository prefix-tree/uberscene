// The ratchet on element kinds: counts the places a package asks "which element kind is this" by name, against a
// committed budget. A count may only go down. What an element kind is lives in one table
// (packages/kit/src/jsx/capabilities.ts); a new question about a kind is a trait there, not a new list in a package.
//
//   tsx scripts/kind-branches.ts            print the counts and how they differ from scripts/kind-branches.json
//   tsx scripts/kind-branches.ts --strict   fail on any difference from the budget (what `pnpm kinds` and CI run)
//   tsx scripts/kind-branches.ts --update   write the counts; refuses to raise one
//   tsx scripts/kind-branches.ts --list     print every place counted
//
// What it counts, per package:
//   compare  `x.kind === "title"`, `kind !== "gap"`, `case "shape":`
//   list     an array of two or more kinds written out, and a handler's one-kind `kinds: ["nested"]`
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
/** Receivers whose `kind` is never an element's: a manifest asset, a probed file, a draw op. */
const NOT_AN_ELEMENT = /asset|media|source|draw|probed|op\.?$|\bo\.$/i;

interface Hit {
  readonly file: string;
  readonly line: number;
  readonly what: "compare" | "list";
  readonly text: string;
}
type Counts = Record<string, { compare: number; list: number }>;
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
  return out;
}

const hits: Record<string, Hit[]> = {};
const counts: Counts = {};
for (const [name, dirs] of Object.entries(PACKAGES)) {
  hits[name] = dirs.flatMap((d) => files(join(root, d))).flatMap(hitsIn);
  counts[name] = {
    compare: hits[name].filter((h) => h.what === "compare").length,
    list: hits[name].filter((h) => h.what === "list").length,
  };
}

if (process.argv.includes("--list"))
  for (const list of Object.values(hits))
    for (const h of list) console.log(`${h.file}:${h.line}  ${h.what}  ${h.text}`);

console.log(
  Object.entries(counts)
    .map(
      ([name, c]) => `${name.padEnd(7)} compare ${String(c.compare).padStart(3)}  list ${String(c.list).padStart(2)}`,
    )
    .join("\n"),
);

const over: string[] = [];
const under: string[] = [];
for (const [name, c] of Object.entries(counts))
  for (const what of ["compare", "list"] as const) {
    const allowed = budget.counts[name]?.[what] ?? 0;
    if (c[what] > allowed) over.push(`${name} ${what}: ${c[what]}, the budget is ${allowed}`);
    if (c[what] < allowed) under.push(`${name} ${what}: ${c[what]}, the budget is ${allowed}`);
  }
const stale = budget.ignore.filter((key) => !usedIgnores.has(key));

if (over.length > 0) {
  console.error(
    `\nMore code names an element kind than before:\n  ${over.join("\n  ")}\n\nAsk the kind's entry instead (capabilitiesOf, kindsWhere, kindsWithProp in @uberscene/kit/schema), adding a trait to packages/kit/src/jsx/capabilities.ts if the question is new. \`pnpm kinds --list\` prints every place.`,
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
