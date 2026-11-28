// Starts a new element kind: `pnpm new:element chart` writes the kind's folder in the kit, the SDK and the player from
// templates, and adds it to each package's registry and to the kit's table of tags. What it starts is an overlay
// drawn as DOM (a labelled box), which type-checks and passes the conformance suite as it stands; the author then
// writes its props and its drawing.
//
//   tsx scripts/new-element.ts <kind>          write the files, then format them
//   tsx scripts/new-element.ts <kind> --dry    print what would be written
//
// Every edit is found by the text around it (`edit` below). When a file has changed shape and a place is not found,
// the script stops and names the file and the place, and writes nothing: fix the place here, in one spot.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = join(import.meta.dirname, "..");

/** What a new kind is made of: the files written new, and the files changed, each by its path from the repo's root. */
export interface Scaffold {
  readonly created: Readonly<Record<string, string>>;
  readonly edited: Readonly<Record<string, string>>;
}

/** A change to one file's text; `place` says what it looks for, for the message when it is not there. */
type Edit = (text: string, file: string) => string;

function missing(file: string, place: string): never {
  throw new Error(`new:element: ${file} has no ${place}; the file changed shape, so update scripts/new-element.ts`);
}

/** `added` right after the first `anchor`. */
const after =
  (anchor: string, added: string): Edit =>
  (text, file) => {
    const i = text.indexOf(anchor);
    if (i < 0) missing(file, `"${anchor.trim()}"`);
    return text.slice(0, i + anchor.length) + added + text.slice(i + anchor.length);
  };

/** `added` right after the first match of `anchor`, an import line that may name more than one thing. */
const afterMatch =
  (anchor: RegExp, added: string): Edit =>
  (text, file) => {
    const m = anchor.exec(text);
    if (!m) missing(file, String(anchor));
    const end = m.index + m[0].length;
    return text.slice(0, end) + added + text.slice(end);
  };

/** `added` right before the first `anchor`. */
const before =
  (anchor: string, added: string): Edit =>
  (text, file) => {
    const i = text.indexOf(anchor);
    if (i < 0) missing(file, `"${anchor.trim()}"`);
    return text.slice(0, i) + added + text.slice(i);
  };

/** `entry` as the last entry of a list: `pattern` captures what opens it, its entries, and what closes it. */
const lastIn =
  (place: string, pattern: RegExp, entry: string, separator = ", "): Edit =>
  (text, file) => {
    if (!pattern.test(text)) missing(file, place);
    // What a formatter would lay out is left to it: the entry goes last, after a comma, whatever the lines are.
    return text.replace(pattern, (_all, open: string, entries: string, close: string) => {
      const kept = entries.replace(/[\s,]+$/, "");
      return `${open}${kept}${separator}${entry}${close.startsWith("}") ? " " : ""}${close}`;
    });
  };

/** The registry object literal assigned to `name`, as `lastIn` reads it. */
const registry = (name: string): RegExp => new RegExp(`(export const ${name}:[^=]*= \\{)([^}]*)(\\};)`);

const isKindName = (kind: string): boolean => /^[a-z][a-zA-Z0-9]*$/.test(kind);

/**
 * The files a new overlay kind is made of, from the repo's files as `read` gives them. Nothing is written here: the
 * caller writes them (or, in the test, type-checks them in memory).
 */
export function scaffoldElement(kind: string, read: (file: string) => string): Scaffold {
  if (!isKindName(kind))
    throw new Error(`new:element: "${kind}" is not a kind's name: letters and digits, lower case first`);
  const Tag = kind[0]!.toUpperCase() + kind.slice(1);
  const kitIndex = "packages/kit/src/elements/index.ts";
  if (new RegExp(`^  ${kind}: `, "m").test(read(kitIndex)))
    throw new Error(`new:element: there is a kind "${kind}" already`);

  const created: Record<string, string> = {
    [`packages/kit/src/elements/${kind}/schema.ts`]: `import { z } from "zod";

import { entranceProps, overlayProps, timedProps } from "../../jsx/schemas/common";

export const ${kind}Schema = z.strictObject({
  ...timedProps,
  ...overlayProps,
  ...entranceProps,
  /** The words in its box. Replace this with the kind's own props, each with a line that says what it is. */
  label: z.string().default("${kind}"),
});
`,
    [`packages/kit/src/elements/${kind}/index.ts`]: `// A \`<${Tag}>\`: say here, in a line, what it is.
import type { KitElement } from "../element";
import { overlayTraits } from "../traits";
import { ${kind}Schema } from "./schema";

/** The kit's part of a ${kind}: its schema, its row in the kind table, and a sample. */
export interface ${Tag}Element extends KitElement<"${kind}", "dom"> {
  readonly schema: typeof ${kind}Schema;
}

export const ${kind}: ${Tag}Element = {
  kind: "${kind}",
  summary: "Say here, in a sentence, what a ${kind} is.",
  group: "Text and graphics",
  schema: ${kind}Schema,
  traits: overlayTraits(),
  sample: \`<${Tag} id="sample" start={0} duration={3} box={{ x: 960, y: 540, width: 480, height: 270, origin: "center" }} />\`,
};
`,
    [`packages/sdk/src/elements/${kind}/index.ts`]: `// The SDK's part of a \`<${Tag}>\`: nothing of its own yet. What the resolver or a tool must ask of this kind alone
// (its size at rest, a key it renamed) goes here, as a member of \`SdkElement\`.
import type { SdkElement } from "../element";

export const ${kind}: SdkElement<"${kind}"> = { kind: "${kind}" };
`,
    [`packages/player/src/elements/${kind}/index.ts`]: `// The player's part of a \`<${Tag}>\` that the engine asks: its size. No React here.
import type { PlayerElement } from "../element";

export const ${kind}: PlayerElement<"${kind}"> = {
  kind: "${kind}",
  // Its box's size, and 480 by 270 where the file writes none.
  size: (_state, placement) => ({
    size: { width: placement.props.box?.width ?? 480, height: placement.props.box?.height ?? 270 },
    fit: "none",
  }),
};
`,
    [`packages/player/src/elements/${kind}/${Tag}.tsx`]: `import { secondsSinceStart } from "@uberscene/sdk/resolver";

import { dataAttrs, overlayStyle } from "../../overlays/layout";
import { overlaySize } from "../../overlays/size";
import type { ElementPropsOf } from "../dom-drawing";

/** A \`<${Tag}>\`, drawn from its props: a labelled box until its own drawing is written here. */
export function ${Tag}(p: ElementPropsOf<"${kind}">) {
  const { size } = overlaySize(p.state, p.placement, p.children, secondsSinceStart(p.placement, p.time));
  return (
    <div
      {...dataAttrs(p.placement)}
      style={{
        ...overlayStyle(p, size),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#333333",
        color: "#ffffff",
        font: "32px sans-serif",
      }}
    >
      {p.placement.props.label}
    </div>
  );
}
`,
    [`packages/player/src/elements/${kind}/dom.tsx`]: `// How a \`<${Tag}>\` is drawn as DOM.
import type { DomDrawingOf } from "../dom-drawing";
import { ${Tag} } from "./${Tag}";

export const ${kind}Dom: DomDrawingOf<"${kind}"> = {
  render: (props) => <${Tag} {...props} />,
  where: "track",
  effects: "pipeline",
};
`,
  };

  const edits: Record<string, readonly Edit[]> = {
    // The kit: its props, its place in the list of kinds, and its entry among the kinds with folders. The kind table,
    // the key paths, the typed placements, the sealed kinds and the reference page all read from these.
    [kitIndex]: [
      after(
        `import type { KitElement } from "./element";\n`,
        `import { ${kind} } from "./${kind}";\nimport type { ${kind}Schema } from "./${kind}/schema";\n`,
      ),
      after(
        `export type { ElementGroup, KitElement } from "./element";\n`,
        `export type { ${Tag}Element } from "./${kind}";\n`,
      ),
      before(
        `/**\n * Every kind, with the props`,
        `/** The props of a \`<${Tag}>\`, as its schema parses them. */\nexport interface ${Tag}Props extends z.output<typeof ${kind}Schema> {}\n`,
      ),
      after(`  layer: LayerProps;\n`, `  ${kind}: ${Tag}Props;\n`),
      lastIn("KIT_ELEMENTS", /(export const KIT_ELEMENTS = \{)([^}]*)(\} satisfies)/, kind),
    ],
    // The tag a file writes, and the table of tags.
    "packages/kit/src/jsx/elements.ts": [
      lastIn(`import from "../elements"`, /(import \{)([^}]*)(\} from "\.\.\/elements";)/, `type ${Tag}Element`),
      after(
        `export const Layer = layerTag as unknown as WithEffects<TagOf<LayerElement>>;\n`,
        `const ${kind}Tag: TagOf<${Tag}Element> = tag(KIT_ELEMENTS.${kind});\nexport const ${Tag} = ${kind}Tag as unknown as WithEffects<TagOf<${Tag}Element>>;\n`,
      ),
      after(`  readonly Layer: typeof Layer;\n`, `  readonly ${Tag}: typeof ${Tag};\n`),
      after(`  Cut,\n  Layer,\n`, `  ${Tag},\n`),
    ],
    // What a video file imports.
    "packages/kit/src/index.ts": [after(`  Layer,\n`, `  ${Tag},\n`)],
    "packages/sdk/src/elements/index.ts": [
      after(`import type { SdkElement } from "./element";\n`, `import { ${kind} } from "./${kind}";\n`),
      lastIn("SDK_ELEMENTS", registry("SDK_ELEMENTS"), kind),
    ],
    "packages/player/src/elements/index.ts": [
      afterMatch(
        /import type \{[^}]*\bPlayerElement\b[^}]*\} from "\.\/element";\n/,
        `import { ${kind} } from "./${kind}";\n`,
      ),
      lastIn("PLAYER_ELEMENTS", registry("PLAYER_ELEMENTS"), kind),
    ],
    "packages/player/src/elements/dom.tsx": [
      after(
        `import type { DomDrawingOf, DomKind } from "./dom-drawing";\n`,
        `import { ${kind}Dom } from "./${kind}/dom";\n`,
      ),
      lastIn("PLAYER_DOM", registry("PLAYER_DOM"), `${kind}: ${kind}Dom`),
    ],
    // Its icon in the editor's layers.
    "packages/editor/registry/editor/elements.tsx": [
      lastIn(
        "EDITOR_ELEMENTS",
        /(export const EDITOR_ELEMENTS:[^=]*= \{)([\s\S]*?)(\n\};)/,
        `${kind}: { kind: "${kind}", icon: Shapes }`,
      ),
    ],
  };

  const edited: Record<string, string> = {};
  for (const [file, changes] of Object.entries(edits))
    edited[file] = changes.reduce((text, change) => change(text, file), read(file));
  return { created, edited };
}

function main(): void {
  const args = process.argv.slice(2);
  const kind = args.find((a) => !a.startsWith("--"));
  if (!kind) {
    console.error("usage: pnpm new:element <kind> [--dry]");
    process.exit(2);
  }
  let made: Scaffold;
  try {
    made = scaffoldElement(kind, (file) => readFileSync(join(root, file), "utf8"));
    for (const file of Object.keys(made.created))
      if (existsSync(join(root, file))) throw new Error(`new:element: ${file} is there already`);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
  const files = { ...made.created, ...made.edited };
  for (const file of Object.keys(made.created)) console.log(`new      ${file}`);
  for (const file of Object.keys(made.edited)) console.log(`changed  ${file}`);
  if (args.includes("--dry")) return;
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  // Imports in order and lists on one line or many, as the formatter has them.
  execFileSync("pnpm", ["exec", "biome", "check", "--write", ...Object.keys(files)], { cwd: root, stdio: "inherit" });
  console.log(
    [
      "",
      `A ${kind} is a labelled box for now. Next:`,
      `  1. its props, in packages/kit/src/elements/${kind}/schema.ts, with its sentence and its sample beside it;`,
      `  2. its drawing, in packages/player/src/elements/${kind}/;`,
      "  3. `pnpm docs:gen` and `pnpm registry:build`;",
      "  4. `pnpm check`: the conformance suite runs its sample through every package.",
    ].join("\n"),
  );
}

if (process.argv[1] && import.meta.filename === process.argv[1]) main();
