// Edits work in ticks (decision 0044 phase 3): split, trim and remove, run in a long random row on a sequence at NTSC
// rates, keep every cut on a frame start, and the file they write reads back to the same ticks. In seconds, each edit
// added a little float noise to the next, and a cut drifted off its frame after a few dozen of them.
import { describe, expect, it } from "vitest";

import { frameStartSeconds, parseRate, type Rate } from "@uberscene/kit/schema";
import { type ActionInput, foldToSource, type ResolvedState } from "@uberscene/sdk";

import { type CorpusFile, executorFor, resolveText } from "./editing/corpus";

const manifest = {
  assets: { a: { id: "a", kind: "video", duration: 3600, fps: 30, width: 640, height: 360 } },
} as never;

/** A small seeded random, so a failure names a row of edits that can be run again. */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function fileAt(fps: string, rate: Rate, clips: number, next: () => number): CorpusFile {
  const f = (n: number) => frameStartSeconds(n, rate);
  let at = 0;
  const lines = Array.from({ length: clips }, (_, i) => {
    const length = 20 + Math.floor(next() * 200);
    const line = `      <Clip id="c${i}" src="asset:a" in={${f(at)}} out={${f(at + length)}} />`;
    at += length + 7;
    return line;
  });
  const text = `import { Clip, Composition, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={"${fps}"} width={640} height={360}>
      <Track id="main">
${lines.join("\n")}
      </Track>
    </Composition>
  );
}
`;
  return { name: `fuzz-${fps}`, text, manifest, files: {} };
}

const clipsOf = (state: ResolvedState) =>
  [...state.items.values()].filter((p) => p.kind === "clip" && p.track === "main");

/** Every clip on the sequence starts and ends on a frame start of the timeline, and plays whole frames of its source. */
function expectOnFrames(state: ResolvedState, rate: Rate): void {
  for (const p of clipsOf(state)) {
    expect(p.range.start.isOnFrame(rate), `${p.id} starts on a frame`).toBe(true);
    expect(p.range.duration.isOnFrame(rate), `${p.id} is whole frames long`).toBe(true);
  }
}

/**
 * A random split, trim or remove of a random clip, on a frame. It doesn't remove a clip that a split made and that was
 * split again: the file can't write that remove back yet ("cannot bake"), a fold limit apart from ticks.
 */
function pickEdit(
  state: ResolvedState,
  rate: Rate,
  next: () => number,
  n: number,
  split: ReadonlySet<string>,
): ActionInput | undefined {
  const clips = clipsOf(state);
  const c = clips[Math.floor(next() * clips.length)];
  if (!c?.source) return undefined;
  const removable = clips.length > 2 && !(c.id.startsWith("s") && split.has(c.id));
  const remove: ActionInput | undefined = removable ? { type: "element/remove", params: { id: c.id } } : undefined;
  const frames = c.range.duration.frame(rate);
  const firstFrame = c.range.start.frame(rate);
  const sourceFrame = c.source.range.start.nearestFrame(rate);
  const roll = next();
  if (frames < 4) return remove;
  const inside = 1 + Math.floor(next() * (frames - 2));
  if (roll < 0.45)
    return {
      type: "clip/split",
      params: { id: c.id, at: frameStartSeconds(firstFrame + inside, rate), newId: `s${n}` },
    };
  if (roll < 0.7)
    return {
      type: "clip/trim",
      params: { id: c.id, edge: "out", value: frameStartSeconds(sourceFrame + inside, rate) },
    };
  if (roll < 0.95)
    return {
      type: "clip/trim",
      params: { id: c.id, edge: "in", value: frameStartSeconds(sourceFrame + inside, rate) },
    };
  return remove;
}

describe("edits in ticks", () => {
  for (const [fps, seed] of [
    ["29.97", 1],
    ["23.976", 2],
    ["59.94", 3],
  ] as const) {
    it(`keeps every cut on a frame through 60 random edits at ${fps} fps`, () => {
      const rate = parseRate(fps);
      const next = random(seed);
      const file = fileAt(fps, rate, 12, next);
      const exec = executorFor(file);
      expect(exec.state().errors).toEqual([]);
      expectOnFrames(exec.state(), rate);
      const split = new Set<string>();
      let ran = 0;
      for (let n = 0; ran < 60 && n < 400; n++) {
        const input = pickEdit(exec.state(), rate, next, n, split);
        if (!input || !exec.can(input).ok) continue;
        const result = exec.execute(input);
        expect(result.ok, JSON.stringify(input)).toBe(true);
        if (input.type === "clip/split") split.add((input.params as { id: string }).id);
        expectOnFrames(exec.state(), rate);
        ran++;
      }
      expect(ran).toBe(60);
      // The file the edits write reads back to the same lengths and source ranges, in ticks, and on frames. Where each
      // clip sits in the row isn't compared: after a remove, the file can put clips a split made in another order than
      // the editor holds, a fold limit apart from ticks.
      const folded = foldToSource(file.text, exec.log(), exec.state());
      expect(folded.skipped).toEqual([]);
      const reloaded = resolveText(folded.text, manifest);
      expect(reloaded.errors).toEqual([]);
      expectOnFrames(reloaded, rate);
      const lengths = (s: ResolvedState) =>
        clipsOf(s)
          .map((p) => `${p.id} ${p.range.duration} source ${p.source?.range.start}+${p.source?.range.duration}`)
          .sort();
      expect(lengths(reloaded)).toEqual(lengths(exec.state()));
    });
  }
});
