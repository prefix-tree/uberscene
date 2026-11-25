import { createElement as h } from "react";

import { Composition, Shape, Title, Track } from "@uberscene/kit";
import { collect, resolve } from "@uberscene/sdk";

import { manifest } from "../../../player/e2e/app/composition";
import { mediaDir } from "../../../player/e2e/gen-media";
import { checkMotion, directoryResolver, formatMotion } from "../../src";
import { toSource } from "../helpers/jsx";

// A square that slides for 2 s, holds still for 2 s with a title on, then slides back for 2 s.
const film = h(
  Composition,
  { fps: 30, width: 640, height: 360 },
  h(
    Track,
    { id: "art", layout: "free" },
    h(Shape, {
      id: "sq",
      type: "rectangle",
      width: 80,
      height: 80,
      fill: "#e8590c",
      start: 0,
      duration: 6,
      box: {
        x: [
          { at: 0, value: 100 },
          { at: 2, value: 500 },
          { at: 4, value: 500 },
          { at: 6, value: 100 },
        ],
        y: 180,
        origin: "center",
      },
    }),
    h(Title, { id: "hold", start: 2, duration: 2, box: { x: 320, y: 60, origin: "center" } }, "Held"),
  ),
);

describe("checkMotion", () => {
  it("finds the stretch where nothing moves, and what is on screen in it", async () => {
    const state = resolve(collect(film), manifest);
    expect(state.errors).toEqual([]);
    const result = await checkMotion({
      state,
      media: directoryResolver(mediaDir, manifest),
      source: { text: toSource(film), manifest },
      min: 1,
    });
    expect(result.still).toHaveLength(1);
    const [s] = result.still;
    // The hold is 2.0 to 4.0 s; at 0.2 s steps the run starts within a step of 2 and ends within a step of 4.
    expect(s?.from).toBeGreaterThanOrEqual(1.99);
    expect(s?.from).toBeLessThanOrEqual(2.21);
    expect(s?.to).toBeGreaterThanOrEqual(3.79);
    expect(s?.to).toBeLessThanOrEqual(4.01);
    expect(s?.seen).toEqual(expect.arrayContaining(["sq", "hold"]));
    expect(formatMotion(result)).toMatch(/^still 2\.\d\d-[34]\.\d\d s/);
    // Frames while the square slides all changed.
    expect(result.change.filter((c) => c.t > 0.3 && c.t < 1.9).every((c) => c.change > 0.02)).toBe(true);
  });

  it("reports nothing shorter than min, and refuses a min under two steps", async () => {
    const state = resolve(collect(film), manifest);
    const args = { state, media: directoryResolver(mediaDir, manifest), source: { text: toSource(film), manifest } };
    expect((await checkMotion({ ...args, min: 2.5 })).still).toEqual([]);
    await expect(checkMotion({ ...args, step: 0.5, min: 0.6 })).rejects.toThrow(/two steps/);
  });
});
