// The decision records in docs/decisions: one number each, the number their heading gives, and each listed in the
// index once. Two branches written at the same time can each take "the next number"; this fails the second one to
// land (and main, if both land), instead of leaving two records with one number.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const dir = join(import.meta.dirname, "..", "docs", "decisions");
const records = readdirSync(dir).filter((f) => /^\d{4}-.+\.md$/.test(f));
const index = readFileSync(join(dir, "README.md"), "utf8");

test("every decision record has a number of its own", () => {
  const byNumber = new Map<string, string[]>();
  for (const f of records) byNumber.set(f.slice(0, 4), [...(byNumber.get(f.slice(0, 4)) ?? []), f]);
  const taken = [...byNumber].filter(([, files]) => files.length > 1).map(([n, files]) => `${n}: ${files.join(", ")}`);
  assert.deepEqual(taken, [], "renumber the later record to the next free number, and its row in README.md");
});

test("a record's heading gives its file's number", () => {
  const wrong = records.filter((f) => !readFileSync(join(dir, f), "utf8").startsWith(`# ${f.slice(0, 4)}. `));
  assert.deepEqual(wrong, []);
});

test("the index lists every record once, and links only to records that exist", () => {
  const links = [...index.matchAll(/\]\(\.\/(\d{4}-[^)]+\.md)\)/g)].map((m) => m[1] as string);
  assert.deepEqual(
    records.filter((f) => links.filter((l) => l === f).length !== 1),
    [],
    "each record has one row",
  );
  assert.deepEqual(
    links.filter((l) => !records.includes(l)),
    [],
    "each row links to a record",
  );
  // A row's number is its record's.
  const rows = [...index.matchAll(/^\| \[(\d{4})\]\(\.\/(\d{4})-/gm)].filter((m) => m[1] !== m[2]);
  assert.deepEqual(
    rows.map((m) => m[0]),
    [],
  );
});
