import type { AssetManifest } from "@uberscene/sdk";

import { FakeFrame, FakeFrameSource, fakeResolver, flush, recorderCanvas, recorderContext } from "./helpers/fakes";
import { DEFAULT_MANIFEST, makeState } from "./helpers/state";
import {
  AssetSources,
  buildFramePlan,
  CanvasPainter,
  DecoderPool,
  type DrawOp,
  erodeAlpha,
  type Frame,
  type FramePlan,
  INPUT_IDLE_CLOSE_S,
  lumaToAlpha,
  ManualClock,
} from "./internal";

// `cutout`: a clip whose asset names a matte (another video of the same frames) keeps only where the matte is light.

const manifest: AssetManifest = {
  assets: {
    ...DEFAULT_MANIFEST.assets,
    a: { ...DEFAULT_MANIFEST.assets.a!, matte: "a.matte" },
    "a.matte": { ...DEFAULT_MANIFEST.assets.silent!, id: "a.matte" },
  },
};

const stateWith = (props: Record<string, unknown>, m = manifest) =>
  makeState({
    manifest: m,
    tracks: [{ id: "main", items: [{ id: "c", kind: "clip", source: { in: 0, out: 4, asset: "a" }, props }] }],
  });

describe("cutout in the frame plan", () => {
  it("names the matte, with its shrink and feather, on the clip's op", () => {
    expect(buildFramePlan(stateWith({ cutout: true }), 1).ops[0]?.matte).toEqual({
      asset: "a.matte",
      shrink: 0,
      feather: 0,
    });
    expect(buildFramePlan(stateWith({ cutout: { shrink: 3, feather: 2 } }), 1).ops[0]?.matte).toEqual({
      asset: "a.matte",
      shrink: 3,
      feather: 2,
    });
  });

  it("leaves it out without the prop, or without a matte in the manifest", () => {
    expect(buildFramePlan(stateWith({}), 1).ops[0]?.matte).toBeUndefined();
    expect(buildFramePlan(stateWith({ cutout: false }), 1).ops[0]?.matte).toBeUndefined();
    expect(buildFramePlan(stateWith({ cutout: true }, DEFAULT_MANIFEST), 1).ops[0]?.matte).toBeUndefined();
  });
});

describe("cutout in the decoder pool", () => {
  function setup() {
    const clock = new ManualClock();
    const fakes = new Map<string, FakeFrameSource>();
    const sources = new AssetSources({
      media: fakeResolver(["a", "a.matte"]),
      manifest,
      clock,
      onError: () => undefined,
      frameSourceFactory: (id) => {
        const f = new FakeFrameSource(id);
        fakes.set(id, f);
        return f;
      },
    });
    return { clock, sources, pool: new DecoderPool(sources) };
  }

  it("decodes the matte beside the clip, and lets it go when the clip leaves", async () => {
    const { pool, sources, clock } = setup();
    const state = stateWith({ cutout: true });
    pool.sync(state, 0);
    expect(pool.mounted).toEqual(["c"]);
    expect(pool.matteFor("c")?.asset).toBe("a.matte");
    expect(sources.isOpen("a.matte")).toBe(true);
    // Past the clip: both decoders go, and after the idle wait both sources close.
    pool.sync(state, 9);
    expect(pool.matteFor("c")).toBeUndefined();
    clock.advance(INPUT_IDLE_CLOSE_S + 1);
    pool.sync(state, 9);
    expect(sources.isOpen("a.matte")).toBe(false);
    expect(sources.isOpen("a")).toBe(false);
    await flush();
    pool.dispose();
  });

  it("drops the matte decoder when the cutout is taken off, and keeps the clip's", async () => {
    const { pool } = setup();
    pool.sync(stateWith({ cutout: true }), 0);
    pool.sync(stateWith({}), 0);
    expect(pool.mounted).toEqual(["c"]);
    expect(pool.matteFor("c")).toBeUndefined();
    await flush();
    pool.dispose();
  });
});

describe("cutout in the painter", () => {
  function paint(withMatte: boolean) {
    const rec = recorderContext();
    const op: DrawOp = {
      id: "c",
      kind: "video",
      rect: { x: 0, y: 0, w: 640, h: 360 },
      matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      fit: "contain",
      opacity: 1,
      blend: "source-over",
      filter: "contrast(1.2)",
      borderRadius: 0,
      matte: { asset: "a.matte", shrink: 0, feather: 0 },
    };
    const plan: FramePlan = { time: 0, frame: 0, background: "#000", ops: [op], warnings: [] };
    const frame = new FakeFrame(new FakeFrameSource("a"), 0, 1 / 30);
    const matte = new FakeFrame(new FakeFrameSource("a.matte"), 0, 1 / 30);
    new CanvasPainter(640, 360, recorderCanvas).paint(rec.ctx, plan, {
      frames: new Map<string, Frame | null>([["c", frame]]),
      mattes: new Map<string, Frame | null>(withMatte ? [["c", matte]] : []),
      nested: new Map(),
    });
    return rec.calls;
  }

  it("draws the clip alone on a layer, then composites it with its filter", () => {
    const calls = paint(true);
    // The layer goes onto the frame once, under the clip's filter: the cut is made before the filter.
    const draws = calls.filter((c) => c.name === "drawImage");
    expect(draws).toHaveLength(1);
    const filterAt = calls.findIndex((c) => c.name === "set:filter" && c.args[0] === "contrast(1.2)");
    expect(filterAt).toBeGreaterThanOrEqual(0);
    expect(filterAt).toBeLessThan(calls.indexOf(draws[0]!));
  });

  it("draws nothing while the matte's frame is not there, rather than the clip whole", () => {
    expect(paint(false).filter((c) => c.name === "drawImage")).toEqual([]);
  });
});

describe("matte pixels", () => {
  const alphas = (data: Uint8ClampedArray) => [...data].filter((_, i) => i % 4 === 3);

  it("turns luminance into alpha, times the alpha there was", () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 0]);
    lumaToAlpha(data);
    expect(alphas(data)).toEqual([255, 0, 128, 0]);
  });

  it("pulls a soft edge in by the radius, and keeps a subject cut by the frame's edge", () => {
    const data = new Uint8ClampedArray(12 * 4);
    [0, 0, 0, 0, 50, 150, 255, 255, 255, 255, 255, 255].forEach((a, i) => {
      data[i * 4 + 3] = a;
    });
    erodeAlpha(data, 12, 1, 2);
    expect(alphas(data)).toEqual([0, 0, 0, 0, 0, 0, 50, 150, 255, 255, 255, 255]);
  });

  it("erodes down as well as across", () => {
    // A 5x5 white square in a 9x9 clear frame, eroded by 1: a 3x3 square.
    const data = new Uint8ClampedArray(81 * 4);
    for (let y = 2; y < 7; y++) for (let x = 2; x < 7; x++) data[(y * 9 + x) * 4 + 3] = 255;
    erodeAlpha(data, 9, 9, 1);
    const kept = alphas(data).flatMap((a, i) => (a ? [[i % 9, Math.floor(i / 9)]] : []));
    expect(kept).toHaveLength(9);
    expect(kept[0]).toEqual([3, 3]);
    expect(kept[8]).toEqual([5, 5]);
  });
});
