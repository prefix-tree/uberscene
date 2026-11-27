import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ENGINE_SCHEMAS, SCHEMAS_BY_KIND } from "@uberscene/kit/schema";
import { type AssetManifest, type Placement, resolve } from "@uberscene/sdk";

import { CORPUS, type CorpusFile, treeOf } from "./editing/corpus";

// A placement typed by its kind says its props are what its schema parses to. This holds the resolver to it, on every
// example and recipe: each placement that says it parsed holds props its own schema accepts, and accepts again as
// they are (nothing left to fill or turn). A placement the resolver makes itself (a key, a caption cue, a camera
// angle's clip) is held to the same, since code reads it by its kind too.

const schemaOf = (p: Placement) => {
  const engine = p.props.engine;
  return (typeof engine === "string" && ENGINE_SCHEMAS[engine]) || SCHEMAS_BY_KIND[p.kind];
};

/** What a placement's props are checked without: values a schema keeps by identity, which JSON cannot compare. */
const plain = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value, (_key, v) => (typeof v === "function" ? "[function]" : v)));

/** The guide's small films too: each shows one thing the resolver makes items for (a link's keys, a follow, shape keys). */
const showcase = join(import.meta.dirname, "..", "..", "..", "examples", "showcase");
const GUIDE: CorpusFile[] = readdirSync(join(showcase, "guide"))
  .filter((f) => f.endsWith(".tsx"))
  .sort()
  .map((f) => ({
    name: join("examples/showcase/guide", f),
    text: readFileSync(join(showcase, "guide", f), "utf8"),
    manifest: JSON.parse(readFileSync(join(showcase, "uberscene.json"), "utf8")) as AssetManifest,
    files: {},
  }));

describe("parsed props", () => {
  for (const file of [...CORPUS, ...GUIDE]) {
    it(`are what their schema says in ${file.name}`, () => {
      const state = resolve(treeOf(file.text, file.files), file.manifest);
      const wrong: string[] = [];
      let checked = 0;
      for (const p of state.items.values()) {
        if (!p.parsed) continue;
        checked += 1;
        // An item the resolver makes is named after its element (`mc.cut-1`): a name no file may write, so it is
        // checked as an id a file could.
        const made = p.id.includes(".") && p.props.id === p.id;
        const result = schemaOf(p).safeParse(made ? { ...p.props, id: "made" } : p.props);
        if (!result.success) {
          wrong.push(
            `${p.kind} "${p.id}": ${result.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
          );
          continue;
        }
        const again = plain(made ? { ...(result.data as object), id: p.id } : result.data);
        const held = plain(p.props);
        if (JSON.stringify(again) !== JSON.stringify(held))
          wrong.push(
            `${p.kind} "${p.id}": parsing its props again changes them: ${JSON.stringify(held)} -> ${JSON.stringify(again)}`,
          );
      }
      expect(wrong).toEqual([]);
      expect(checked).toBeGreaterThan(0);
    });
  }
});
