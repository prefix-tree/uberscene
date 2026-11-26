// The synced sections of the skill's pages: filled between their markers, the rest of the page untouched, and every
// marker mistake named with its line.
import assert from "node:assert/strict";
import { test } from "node:test";

import { fence, fillSections } from "./skill-sync";

const generators = {
  echo: (args: readonly string[]) => args.join(" "),
  fails: () => {
    throw new Error("no such thing");
  },
};

test("a section is filled from its generator, and the text around it is kept", () => {
  const page = ["# Title", "", "<!-- sync: echo a b -->", "old", "text", "<!-- /sync -->", "", "After."].join("\n");
  const out = fillSections("p.md", page, generators);
  assert.deepEqual(out.problems, []);
  assert.equal(out.text, ["# Title", "", "<!-- sync: echo a b -->", "a b", "<!-- /sync -->", "", "After."].join("\n"));
  assert.deepEqual(out.sections, [{ kind: "echo", args: ["a", "b"] }]);
});

test("filling a filled page changes nothing", () => {
  const page = "<!-- sync: echo x -->\n<!-- /sync -->\n";
  const once = fillSections("p.md", page, generators).text;
  assert.equal(fillSections("p.md", once, generators).text, once);
});

test("a section inside a list item takes the marker's indent", () => {
  const page = "1. Step\n   <!-- sync: echo x -->\n   <!-- /sync -->";
  assert.equal(
    fillSections("p.md", page, generators).text,
    "1. Step\n   <!-- sync: echo x -->\n   x\n   <!-- /sync -->",
  );
});

test("an unknown generator, a failing one, and broken markers are problems with their line; the old text stays", () => {
  const page = [
    "<!-- sync: nope -->",
    "kept",
    "<!-- /sync -->",
    "<!-- sync: fails -->",
    "kept too",
    "<!-- /sync -->",
    "<!-- /sync -->",
    "<!-- sync: echo open -->",
  ].join("\n");
  const out = fillSections("p.md", page, generators);
  assert.equal(out.text, page);
  assert.equal(out.problems.length, 4);
  assert.match(out.problems[0] as string, /^p\.md:1: no sync generator "nope"/);
  assert.match(out.problems[1] as string, /^p\.md:4: sync: fails: no such thing/);
  assert.match(out.problems[2] as string, /^p\.md:7: .* with no section open/);
  assert.match(out.problems[3] as string, /^p\.md:8: section is not closed/);
});

test("a fence takes its language from the file's extension", () => {
  assert.equal(fence("a.tsx", "x\n\n"), "```tsx\nx\n```");
  assert.equal(fence("a.mjs", "x"), "```js\nx\n```");
});
