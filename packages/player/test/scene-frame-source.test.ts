// @vitest-environment node
// A scene asset plays as footage whose frames are computed: the engine draws the scene at times on the asset's frame
// grid, one draw at a time, and the player gets a copy of each picture it may keep.
import { installSceneEngine, type SceneEngine } from "@uberscene/kit/schema";
import type { AssetEntry } from "@uberscene/sdk/resolver";

import { SceneFrameSource } from "../src/media/scene-frame-source";
import type { AnyCanvas, CreateCanvas } from "../src/types";

const asset: AssetEntry = { id: "crossing", kind: "scene", duration: 5, fps: 30, width: 64, height: 36 };

/** Canvases whose 2D context only records what was drawn on them. */
const canvases: { drawn: unknown[] }[] = [];
const createCanvas: CreateCanvas = (width, height) => {
  const c = { width, height, drawn: [] as unknown[] };
  canvases.push(c);
  return { ...c, getContext: () => ({ drawImage: (img: unknown) => c.drawn.push(img) }) } as unknown as AnyCanvas;
};

function fakeEngine(): { engine: SceneEngine; draws: number[]; sources: string[]; closed: () => boolean } {
  const draws: number[] = [];
  const sources: string[] = [];
  let closed = false;
  let busy = false;
  const engine: SceneEngine = {
    open: async (source) => {
      sources.push(source);
      return {
        length: 5,
        draw: async (seconds) => {
          // Two draws at once would share one scene and one canvas.
          if (busy) throw new Error("draws overlapped");
          busy = true;
          await new Promise((r) => setTimeout(r, 1));
          busy = false;
          draws.push(seconds);
          return { width: 64, height: 36, seconds };
        },
        close: () => {
          closed = true;
        },
      };
    },
  };
  return { engine, draws, sources, closed: () => closed };
}

const handle = { kind: "blob" as const, blob: new Blob(["export default {}"]) };

afterEach(() => {
  installSceneEngine(null);
  canvases.length = 0;
});

test("open reports the asset's size, rate and length, and reads the file once", async () => {
  const fake = fakeEngine();
  installSceneEngine(fake.engine);
  const s = new SceneFrameSource("crossing", handle, asset, createCanvas);
  expect(await s.open()).toEqual({ width: 64, height: 36, duration: 5, fps: 30, decodable: true });
  await s.frameAt(1);
  expect(fake.sources).toEqual(["export default {}"]);
});

test("frames sit on the asset's frame grid and are held past its end", async () => {
  const fake = fakeEngine();
  installSceneEngine(fake.engine);
  const s = new SceneFrameSource("crossing", handle, asset, createCanvas);
  const f = await s.frameAt(3.2);
  expect(f?.timestamp).toBeCloseTo(96 / 30, 9);
  expect(f?.duration).toBeCloseTo(1 / 30, 9);
  await s.frameAt(3.21);
  // 3.21 s is still frame 96: no second draw.
  expect(fake.draws).toEqual([96 / 30]);
  await s.frameAt(9);
  expect(fake.draws.at(-1)).toBe(5);
});

test("draws run one at a time, in the order asked, and the player gets a copy", async () => {
  const fake = fakeEngine();
  installSceneEngine(fake.engine);
  const s = new SceneFrameSource("crossing", handle, asset, createCanvas);
  const frames = await Promise.all([s.frameAt(0), s.frameAt(1), s.frameAt(2)]);
  expect(fake.draws).toEqual([0, 1, 2]);
  expect(frames.map((f) => f?.width)).toEqual([64, 64, 64]);
  expect(canvases.map((c) => (c.drawn[0] as { seconds: number }).seconds)).toEqual([0, 1, 2]);
});

test("stream yields every frame from the one covering `from` to the last before `to`", async () => {
  const fake = fakeEngine();
  installSceneEngine(fake.engine);
  const s = new SceneFrameSource("crossing", handle, asset, createCanvas);
  const times: number[] = [];
  for await (const f of s.stream(1.01, 1.1)) times.push(Math.round(f.timestamp * 30));
  expect(times).toEqual([30, 31, 32]);
});

test("close closes the engine's scene", async () => {
  const fake = fakeEngine();
  installSceneEngine(fake.engine);
  const s = new SceneFrameSource("crossing", handle, asset, createCanvas);
  await s.frameAt(0);
  s.close();
  await new Promise((r) => setTimeout(r, 0));
  expect(fake.closed()).toBe(true);
});

test("without an engine, opening says what to install", async () => {
  const s = new SceneFrameSource("crossing", handle, asset, createCanvas);
  await expect(s.open()).rejects.toThrow(/no scene engine is installed \(installSceneFiles/);
});
