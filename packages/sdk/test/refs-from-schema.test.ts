// The references an element writes are read from its schema: a prop marked `ref` there is one, wherever it sits
// (in a list, in an object by name, in one way of writing a value). Before that, each kind of reference had a
// reader written by hand. `refs.written.json` is what those readers found in every example and recipe, recorded
// while they stood; the schema's marks must find the same references, in the same order.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolve } from "@uberscene/sdk";

import { expandKeys } from "../src/resolve/expand";
import { referencesWritten } from "../src/resolve/refs";
import { CORPUS, type CorpusFile, folder, treeOf } from "./editing/corpus";
import { manifest } from "./helpers";

const recorded = join(import.meta.dirname, "refs.written.json");

/** The ways to refer the examples do not use, and each in the shapes a reader must find: a list, a name, an edge. */
const EVERY_KIND = `
import { Audio, Camera, Caption, Captions, Clip, Composition, Marker, Shape, Title, Track, Transition } from "@uberscene/kit";
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Marker id="m1" start={2} />
      <Marker id="m2" start={4} />
      <Camera id="cam" push={{ on: ["card", "note"], keep: ["speaker"] }}>
        <Track id="v1">
          <Clip id="speaker" src="asset:interview" in="marker:m1" out="marker:m2" times={{ reveal: "marker:m1", end: 3 }} />
          <Transition id="x1" type="crossfade" duration={0.3} on="speaker" edge="out" />
          <Clip id="next" src="asset:city" in="word:3" out={4} />
        </Track>
        <Track id="cards" layout="free">
          <Shape id="card" type="rectangle" width={200} height={100} start={1} duration={{ match: "speaker" }} />
          <Title id="note" anchor="card.end" offset={0.2} duration={{ until: "next", at: "word:4" }} follow="card">
            A note
          </Title>
          <Shape
            id="dot"
            type="ellipse"
            width={{ link: "card.transform.rotation", scale: 2 }}
            height={40}
            anchor="start"
            duration={2}
            transform={{ rotation: { link: "card.transform.rotation" } }}
            effects={[{ type: "blur", radius: { link: "card.transform.rotation" } }]}
          />
        </Track>
      </Camera>
      <Track id="music" layout="free" role="music">
        <Audio id="bed" src="asset:bed" start={0} duration="fill" duck={{ under: "v1", to: 0.2 }} />
      </Track>
      <Captions id="cap">
        <Caption id="cue1" start="marker:m1" end="marker:m2" text="One" />
        <Caption id="cue2" start={5} end="word:9" text="Two" />
      </Captions>
    </Composition>
  );
}
`;

/** The guide's examples are where follows and links are shown, so they are read too. */
const FILES: readonly CorpusFile[] = [
  ...CORPUS,
  ...folder("examples/showcase", ["guide"]).filter((file) => file.name.includes("/guide/")),
  { name: "every kind of reference", text: EVERY_KIND, manifest, files: {} },
];

/** Every reference of a file, in the order the graph reads them: `holder kind prop=text`. */
function written(file: CorpusFile): string[] {
  const state = resolve(treeOf(file.text, file.files), file.manifest);
  const out: string[] = [];
  // A link is read from the items the resolver makes of an element's props, so the tree is read with them.
  for (const node of expandKeys(state.tree).byId.values())
    for (const w of referencesWritten(node)) out.push(`${node.id} ${w.type} ${w.prop}=${w.text}`);
  return out;
}

describe("references read from the schema", () => {
  const all = Object.fromEntries(FILES.map((file) => [file.name, written(file)]));
  if (process.env.RECORD_REFS) writeFileSync(recorded, `${JSON.stringify(all, null, 2)}\n`);
  const was = existsSync(recorded) ? (JSON.parse(readFileSync(recorded, "utf8")) as Record<string, string[]>) : {};

  it("reads every file the hand-written readers were recorded on", () => {
    expect(Object.keys(all).sort()).toEqual(Object.keys(was).sort());
  });

  for (const file of FILES)
    it(`finds in ${file.name} the references the hand-written readers found, in their order`, () => {
      expect(all[file.name]).toEqual(was[file.name]);
    });

  it("is held to files that write every kind of reference", () => {
    const kinds = new Set(Object.values(was).flatMap((list) => list.map((line) => line.split(" ")[1])));
    expect([...kinds].sort()).toEqual(
      ["anchor", "duck", "follow", "link", "marker", "match", "on", "push", "sceneTime", "until"].sort(),
    );
  });
});
