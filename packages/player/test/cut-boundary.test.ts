// The frame at a cut shows the new clip, not one more frame of the old one, even when a sequence's lengths add up to a
// double a hair past the frame's start (0.1 + 0.2 is 0.30000000000000004).
import { frameAtSeconds, frameStartSeconds } from "@uberscene/kit/schema";

import { makeState } from "./helpers/state";
import { visiblePlacements } from "./internal";

const CASES: readonly (readonly [number, number])[] = [
  [0.1, 0.2],
  [2.2, 0.1],
  [0.7, 0.1],
  [0.3, 0.6],
  [1.1, 1.2],
];

describe("the frame at a cut", () => {
  for (const [a, b] of CASES) {
    it(`after ${a} s and ${b} s, shows the next clip and the frame before shows the old one`, () => {
      const state = makeState({
        fps: 30,
        tracks: [
          {
            id: "main",
            items: [
              { id: "first", kind: "clip", duration: a, source: { in: 0, out: a, asset: "a" } },
              { id: "old", kind: "clip", duration: b, source: { in: 0, out: b, asset: "a" } },
              { id: "new", kind: "clip", source: { in: 0, out: 1, asset: "b" } },
            ],
          },
        ],
      });
      const rate = state.composition.rate;
      const cut = frameAtSeconds(state.items.get("old")!.end, rate);
      const shown = (n: number) => visiblePlacements(state, frameStartSeconds(n, rate)).map((v) => v.placement.id);
      expect(shown(cut)).toEqual(["new"]);
      expect(shown(cut - 1)).toEqual(["old"]);
    });
  }
});
