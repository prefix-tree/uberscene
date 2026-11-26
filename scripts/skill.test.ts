// The agent skill in plugins/uberscene: a valid Agent Skill and Claude Code plugin, links that resolve, examples that
// resolve with no errors, and nothing that names an API UberScene no longer has.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";

import { COMPONENTS, ELEMENTS, TRANSITION_TYPES, VIDEO_EFFECT_TYPES } from "../packages/kit/src/schema";
import { collectModule, loadModule, resolve } from "../packages/sdk/src/index";

const root = join(import.meta.dirname, "..");
const plugin = join(root, "plugins", "uberscene");
const skill = join(plugin, "skills", "uberscene");
const text = readFileSync(join(skill, "SKILL.md"), "utf8");
const references = readdirSync(join(skill, "references")).map((f) => join(skill, "references", f));

/** The frontmatter's keys and values, one `key: value` per line. */
function frontmatter(md: string): Record<string, string> {
  const block = /^---\n([\s\S]*?)\n---\n/.exec(md);
  assert.ok(block, "SKILL.md starts with a frontmatter block");
  return Object.fromEntries(
    (block[1] as string).split("\n").map((line) => {
      const at = line.indexOf(":");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }),
  );
}

test("SKILL.md has the frontmatter the Agent Skills format asks for, and only its portable keys", () => {
  const fm = frontmatter(text);
  assert.equal(fm.name, "uberscene");
  assert.match(fm.name ?? "", /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.equal(fm.name, skill.split("/").at(-1), "the name is the folder's");
  assert.ok((fm.description ?? "").length > 0 && (fm.description ?? "").length <= 1024);
  const portable = ["name", "description", "license", "compatibility", "metadata", "allowed-tools"];
  assert.deepEqual(
    Object.keys(fm).filter((k) => !portable.includes(k)),
    [],
  );
});

test("SKILL.md stays under 500 lines", () => {
  assert.ok(text.split("\n").length < 500);
});

test("every relative link in the skill resolves", () => {
  for (const file of [join(skill, "SKILL.md"), ...references]) {
    const md = readFileSync(file, "utf8");
    for (const [, target] of md.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
      if (/^[a-z]+:/.test(target as string)) continue;
      assert.ok(existsSync(join(dirname(file), target as string)), `${file}: ${target} does not exist`);
    }
  }
});

test("the whole files in SKILL.md resolve with no errors", () => {
  const words = Array.from({ length: 40 }, (_, i) => ({ i, text: `w${i}`, start: i * 0.4, end: i * 0.4 + 0.3 }));
  const manifest = {
    assets: {
      talk: { id: "talk", kind: "video", duration: 20, fps: 30, width: 1920, height: 1080, transcript: { words } },
      broll: {
        id: "broll",
        kind: "video",
        duration: 12,
        fps: 30,
        width: 1920,
        height: 1080,
        shots: [
          { i: 0, start: 0, end: 4 },
          { i: 1, start: 4, end: 9 },
          { i: 2, start: 9, end: 12 },
        ],
      },
    },
  };
  const files = [...text.matchAll(/```tsx\n([\s\S]*?)```/g)]
    .map((m) => m[1] as string)
    .filter((code) => code.includes("export default"));
  assert.ok(files.length > 0, "SKILL.md shows at least one whole file");
  for (const code of files) {
    const state = resolve(collectModule(loadModule(code) as never), manifest as never);
    assert.deepEqual(state.errors, []);
  }
});

test("the skill names no API UberScene has removed", () => {
  for (const file of [join(skill, "SKILL.md"), ...references]) {
    const md = readFileSync(file, "utf8");
    for (const gone of [
      "<Graphic",
      'src="icon:',
      "captureSheet",
      "<ColorGrade",
      "--engine",
      "<Keyframe",
      "<Effect",
      "<SpeedKey",
      "<Freeze",
      "automation=",
    ])
      assert.ok(!md.includes(gone), `${file} mentions ${gone}`);
  }
});

test("SKILL.md names every element, effect, transition and component the kit has", () => {
  // An agent only reaches for a tool it has heard of. Adding one to the kit without a word in the skill fails here.
  const missing = [
    ...Object.keys(ELEMENTS).filter((name) => !text.includes(`<${name}`)),
    ...[...VIDEO_EFFECT_TYPES, ...TRANSITION_TYPES, ...Object.keys(COMPONENTS)].filter(
      (name) => !text.includes(`\`${name}\``),
    ),
  ];
  assert.deepEqual(missing, [], `SKILL.md does not name: ${missing.join(", ")}`);
});

test("the marketplace lists the plugin, and both name it the same", () => {
  const marketplace = JSON.parse(readFileSync(join(root, ".claude-plugin", "marketplace.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(plugin, ".claude-plugin", "plugin.json"), "utf8"));
  assert.equal(typeof marketplace.name, "string");
  assert.equal(typeof marketplace.owner?.name, "string");
  const entry = marketplace.plugins.find((p: { name: string }) => p.name === manifest.name);
  assert.ok(entry, "the marketplace lists the plugin");
  assert.ok(!String(entry.source).includes(".."));
  assert.ok(existsSync(join(root, entry.source, ".claude-plugin", "plugin.json")));
});

// The setup skill beside it: how an agent installs, checks and upgrades UberScene before it makes a video.
const setup = join(plugin, "skills", "uberscene-setup");
const setupText = readFileSync(join(setup, "SKILL.md"), "utf8");

test("the setup skill has the Agent Skills frontmatter, its folder's name, and stays short", () => {
  const fm = frontmatter(setupText);
  assert.equal(fm.name, "uberscene-setup");
  assert.equal(fm.name, setup.split("/").at(-1), "the name is the folder's");
  assert.ok((fm.description ?? "").length > 0 && (fm.description ?? "").length <= 1024);
  assert.ok(setupText.split("\n").length < 500);
});

test("the setup skill's check file resolves with no errors and no media", () => {
  const files = [...setupText.matchAll(/```tsx\n([\s\S]*?)```/g)]
    .map((m) => m[1] as string)
    .filter((code) => code.includes("export default"));
  assert.equal(files.length, 1, "the setup skill shows one whole file");
  const state = resolve(collectModule(loadModule(files[0] as string) as never), { assets: {} } as never);
  assert.deepEqual(state.errors, []);
});

test("the setup skill installs what the main skill's loop needs, and names commands the CLI has", () => {
  assert.ok(text.includes("npm install uberscene @uberscene/kit react zod"));
  assert.ok(setupText.includes("npm install uberscene @uberscene/kit react zod"));
  const cli = readFileSync(join(root, "packages", "render", "src", "cli.ts"), "utf8");
  for (const command of ["browser install", "skills install", "codecs install", "blocks update", "inspect", "look"])
    assert.ok(cli.includes(`uberscene ${command}`), `the CLI has uberscene ${command}`);
});
