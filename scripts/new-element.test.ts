import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";

import ts from "typescript";

import { scaffoldElement } from "./new-element";

// `pnpm new:element chart`, run in memory: the files it would write are laid over the repo's, and the packages are
// type-checked with them. So the scaffold is held to two things: what it writes compiles in every package, and the
// files a new kind costs are exactly the ones listed here.

const root = join(import.meta.dirname, "..");
const read = (file: string): string => readFileSync(join(root, file), "utf8");

const CREATED = [
  "packages/kit/src/elements/chart/index.ts",
  "packages/kit/src/elements/chart/schema.ts",
  "packages/player/src/elements/chart/Chart.tsx",
  "packages/player/src/elements/chart/dom.tsx",
  "packages/player/src/elements/chart/index.ts",
  "packages/sdk/src/elements/chart/index.ts",
];

const EDITED = [
  "packages/editor/registry/editor/elements.tsx",
  "packages/kit/src/elements/index.ts",
  "packages/kit/src/index.ts",
  "packages/kit/src/jsx/capabilities.ts",
  "packages/kit/src/jsx/elements.ts",
  "packages/player/src/elements/dom.tsx",
  "packages/player/src/elements/index.ts",
  "packages/sdk/src/elements/index.ts",
  "packages/sdk/src/elements/placement.ts",
  "scripts/gen-docs.ts",
  "scripts/kind-branches.json",
];

/**
 * The errors of a package's program with what the scaffold made laid over the disk, each as `file(line): message`.
 * The new files join the program; a changed file is read changed wherever the program already reads it.
 */
function errorsWith(project: string, made: ReturnType<typeof scaffoldElement>): string[] {
  const over = new Map(
    Object.entries({ ...made.created, ...made.edited }).map(([file, text]) => [join(root, file), text]),
  );
  const folders = new Set([...over.keys()].map(dirname));
  const configFile = join(root, project, "tsconfig.json");
  // The packages build with their own TypeScript; this one is the repo's, which warns of an option they still use.
  const config = ts.getParsedCommandLineOfConfigFile(
    configFile,
    { ignoreDeprecations: "6.0" },
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (d) => assert.fail(ts.flattenDiagnosticMessageText(d.messageText, "\n")),
    },
  );
  assert.ok(config, `${configFile} is read`);
  const host = ts.createCompilerHost(config.options);
  const disk = { fileExists: host.fileExists, readFile: host.readFile, directoryExists: host.directoryExists };
  host.fileExists = (file) => over.has(file) || disk.fileExists(file);
  host.readFile = (file) => over.get(file) ?? disk.readFile(file);
  host.directoryExists = (dir) => folders.has(dir) || (disk.directoryExists?.(dir) ?? false);
  const added = Object.keys(made.created).map((file) => join(root, file));
  const program = ts.createProgram({ rootNames: [...config.fileNames, ...added], options: config.options, host });
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const where = d.file
      ? `${relative(root, d.file.fileName)}(${d.file.getLineAndCharacterOfPosition(d.start ?? 0).line + 1})`
      : "";
    return `${where}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`;
  });
}

test("a new kind is six new files and eleven changed ones, and they compile", () => {
  const made = scaffoldElement("chart", read);
  assert.deepEqual(Object.keys(made.created).sort(), CREATED);
  assert.deepEqual(Object.keys(made.edited).sort(), EDITED);
  for (const [file, text] of Object.entries(made.edited)) assert.notEqual(text, read(file), `${file} is changed`);
  // The player's program reads the kit and the SDK from their sources, so it checks all three; the editor's checks
  // its own map of the kinds.
  assert.deepEqual(errorsWith("packages/player", made), []);
  assert.deepEqual(errorsWith("packages/editor/app", made), []);
});

test("a kind listed in the kit and left out of a package does not compile", () => {
  const made = scaffoldElement("chart", read);
  // The SDK's registry as it is on disk, without the new kind.
  const { "packages/sdk/src/elements/index.ts": _left, ...edited } = made.edited;
  const errors = errorsWith("packages/player", { created: made.created, edited });
  assert.ok(
    errors.some((e) => e.startsWith("packages/sdk/src/elements/index.ts") && e.includes("Property 'chart' is missing")),
    errors.join("\n"),
  );
});

test("it lists the new kind where the kinds are listed", () => {
  const { edited } = scaffoldElement("chart", read);
  assert.match(edited["packages/kit/src/elements/index.ts"] ?? "", /export type MigratedKind =[^;]*\| "chart";/);
  assert.match(edited["packages/kit/src/elements/index.ts"] ?? "", /\n {2}chart: ChartProps;\n/);
  assert.match(edited["packages/kit/src/index.ts"] ?? "", /\n {2}Chart,\n/);
  assert.match(edited["packages/sdk/src/elements/placement.ts"] ?? "", /\n {2}chart: PlacedChart;\n/);
  const sealed = (JSON.parse(edited["scripts/kind-branches.json"] ?? "{}") as { sealed: string[] }).sealed;
  assert.equal(sealed.at(-1), "chart");
});

test("it refuses a kind there is already, and a name that is not a kind's", () => {
  assert.throws(() => scaffoldElement("title", read), /there is a kind "title" already/);
  assert.throws(() => scaffoldElement("Chart", read), /not a kind's name/);
  assert.throws(() => scaffoldElement("pie-chart", read), /not a kind's name/);
});

test("it says which file changed shape when a place it writes at is gone", () => {
  const moved = (file: string): string =>
    file === "packages/sdk/src/elements/index.ts" ? read(file).replace("SDK_ELEMENTS", "SDK_PARTS") : read(file);
  assert.throws(
    () => scaffoldElement("chart", moved),
    /packages\/sdk\/src\/elements\/index\.ts has no SDK_ELEMENTS; the file changed shape/,
  );
});
