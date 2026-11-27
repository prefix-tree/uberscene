// Where every element lands, in frames, for every file the editing tests run on and the sample fixture. Decision 0044
// moves the resolver's times from seconds to ticks; this snapshot is taken before that, so each step can show it moved
// no element by a frame it didn't mean to. A change to the snapshot is a change in what a video shows: name it in the PR.
import { describe, expect, it } from "vitest";

import { frameAtSeconds, framesUntil, type Rate } from "@uberscene/kit/schema";
import { type ResolvedState, resolve } from "@uberscene/sdk";

import { CORPUS, resolveText } from "./editing/corpus";
import { fixtureTree, manifest } from "./helpers";

/** One line per element: its id and kind, the frames it shows on, and the source frames a clip plays. */
function frames(state: ResolvedState): string {
  const rate: Rate = state.composition.rate;
  const at = (t: number) => frameAtSeconds(t, rate);
  const until = (t: number) => framesUntil(t, rate);
  const lines = [
    `composition ${state.composition.id} ${rate.num}/${rate.den} frames ${until(state.composition.duration)}`,
  ];
  for (const p of state.items.values()) {
    const source = p.source ? ` source ${at(p.source.in)}-${until(p.source.out)} x${p.source.speed}` : "";
    lines.push(`${p.id} ${p.kind} ${until(p.start)}-${until(p.end)}${source}`);
  }
  return `${lines.join("\n")}\n`;
}

describe("golden frames", () => {
  it("places the sample fixture", async () => {
    await expect(frames(resolve(fixtureTree(), manifest))).toMatchFileSnapshot("__snapshots__/golden/sample.txt");
  });

  for (const file of CORPUS) {
    it(`places ${file.name}`, async () => {
      const state = resolveText(file.text, file.manifest, file.files);
      const name = file.name.replace(/[/.]/g, "_");
      await expect(frames(state)).toMatchFileSnapshot(`__snapshots__/golden/${name}.txt`);
    });
  }

  // Every file above is at 30 fps. The recipes again at other rates, NTSC's among them, whose frames mostly don't start
  // on a whole millisecond: there a cut summed in seconds is most likely to sit a hair off its frame.
  const recipes = CORPUS.filter((f) => f.name.startsWith("recipes/") && f.text.includes("fps={30}"));
  for (const fps of ['"23.976"', "24", "25", '"29.97"', "60"]) {
    it(`places the recipes at ${fps} fps`, async () => {
      const all = recipes.map((file) => {
        const text = file.text.replace("fps={30}", `fps={${fps}}`);
        return `# ${file.name}\n${frames(resolveText(text, file.manifest, file.files))}`;
      });
      await expect(all.join("\n")).toMatchFileSnapshot(
        `__snapshots__/golden/recipes-at-${fps.replace(/\W/g, "_")}.txt`,
      );
    });
  }
});
