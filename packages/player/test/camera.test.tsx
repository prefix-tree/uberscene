import { FakeFrame, FakeFrameSource, recorderCanvas, recorderContext } from "./helpers/fakes";
import { mountPlayer } from "./helpers/react";
import { makeState, type StateSpec } from "./helpers/state";
import {
  buildFramePlan,
  CanvasPainter,
  cameraAt,
  cameraMatrix,
  cameraValuesAt,
  type Frame,
  type Matrix2D,
} from "./internal";

const clip = (id: string) => ({ id, kind: "clip", source: { in: 0, out: 4, asset: "a" } });
const shape = (id: string) => ({
  id,
  kind: "shape",
  start: 0,
  duration: 4,
  props: { type: "rectangle", box: { x: 100, y: 50, width: 200, height: 100 }, fill: "#2244ff" },
});
const main = { id: "main", items: [clip("talk")] };
const cards = { id: "cards", layout: "free" as const, items: [shape("card")] };
const logo = { id: "logo", layout: "free" as const, items: [shape("mark")] };
const tracks = [main, cards, logo];
const under = (camera: NonNullable<StateSpec["camera"]>) => makeState({ tracks, camera });
const COMP = { width: 640, height: 360 };

const at = (m: Matrix2D, x: number, y: number): [number, number] => [
  Math.round((m.a * x + m.c * y + m.e) * 1000) / 1000,
  Math.round((m.b * x + m.d * y + m.f) * 1000) / 1000,
];

describe("the camera's matrix", () => {
  it("is nothing while the camera shows everything as written", () => {
    expect(cameraAt(under({ tracks: ["main"] }), 1)).toBeNull();
    expect(cameraAt(makeState({ tracks }), 1)).toBeNull();
  });

  it("moves what it shows the other way when the view moves", () => {
    const m = cameraMatrix({ x: 180, y: -40, zoom: 1, rotation: 0 }, COMP);
    expect(at(m, 320, 180)).toEqual([140, 220]);
  });

  it("zooms about the frame's centre", () => {
    const m = cameraMatrix({ x: 0, y: 0, zoom: 2, rotation: 0 }, COMP);
    expect(at(m, 320, 180)).toEqual([320, 180]);
    expect(at(m, 0, 0)).toEqual([-320, -180]);
  });

  it("puts the point the view moved to at the frame's centre, whatever the zoom", () => {
    const m = cameraMatrix({ x: 100, y: 50, zoom: 3, rotation: 30 }, COMP);
    expect(at(m, 420, 230)).toEqual([320, 180]);
  });

  it("turns what it shows anticlockwise when the view turns clockwise", () => {
    const m = cameraMatrix({ x: 0, y: 0, zoom: 1, rotation: 90 }, COMP);
    // A point to the right of centre ends above it.
    expect(at(m, 420, 180)).toEqual([320, 80]);
  });

  it("reads keys on the video's clock, easing out of the key it leaves", () => {
    const state = under({
      tracks: ["main"],
      props: { zoom: 1.5 },
      keys: [
        ["x", 1, 0],
        ["x", 2, 100],
      ],
    });
    expect(cameraValuesAt(state, 0)).toEqual({ x: 0, y: 0, zoom: 1.5, rotation: 0 });
    expect(cameraValuesAt(state, 1.5)).toEqual({ x: 50, y: 0, zoom: 1.5, rotation: 0 });
    expect(cameraValuesAt(state, 3)).toEqual({ x: 100, y: 0, zoom: 1.5, rotation: 0 });
  });
});

describe("footage under the camera", () => {
  it("is drawn through the camera, and footage outside it is not", () => {
    const plain = buildFramePlan(makeState({ tracks }), 1).ops.find((o) => o.id === "talk")!;
    const moved = buildFramePlan(under({ tracks: ["main"], props: { x: 100, zoom: 2 } }), 1).ops.find(
      (o) => o.id === "talk",
    )!;
    expect(at(plain.matrix, 0, 0)).toEqual([0, 0]);
    // The frame's centre shows what was 100 px right of it, twice the size.
    expect(at(moved.matrix, 420, 180)).toEqual([320, 180]);
    expect(at(moved.matrix, 0, 0)).toEqual([-520, -180]);

    const outside = buildFramePlan(under({ tracks: ["cards"], props: { x: 100, zoom: 2 } }), 1).ops.find(
      (o) => o.id === "talk",
    )!;
    expect(outside.matrix).toEqual(plain.matrix);
  });

  it("plans a file without a camera as it always did", () => {
    expect(buildFramePlan(under({ tracks: ["main"] }), 1)).toEqual(buildFramePlan(makeState({ tracks }), 1));
  });

  it("cuts a wipe in the camera's space", () => {
    const wipe = {
      id: "main",
      items: [clip("a1"), { id: "x", kind: "transition", duration: 1, props: { type: "wipe" } }, clip("a2")],
    };
    const state = makeState({ tracks: [wipe], camera: { tracks: ["main"], props: { x: 40 } } });
    const op = buildFramePlan(state, 3.5).ops.find((o) => o.clip)!;
    expect(op.clipMatrix).toEqual(cameraAt(state, 3.5));

    const rec = recorderContext();
    new CanvasPainter(640, 360, recorderCanvas).paint(
      rec.ctx,
      { ...buildFramePlan(state, 3.5), ops: [op] },
      {
        frames: new Map<string, Frame | null>([[op.id, new FakeFrame(new FakeFrameSource("a"), 0, 1 / 30)]]),
        nested: new Map(),
      },
    );
    const rect = rec.calls.findIndex((c) => c.name === "rect");
    expect(rec.calls[rect - 2]).toEqual({ name: "setTransform", args: [1, 0, 0, 1, -40, 0] });
  });
});

describe("overlays under the camera", () => {
  const transformOf = (root: Element, id: string): string =>
    (root.querySelector(`[data-el="${id}"]`) as HTMLElement).style.transform;

  it("are placed through the camera, and overlays outside it stay", async () => {
    const m = await mountPlayer(under({ tracks: ["main", "cards"], props: { x: 100 } }));
    await m.seek(1);
    expect(transformOf(m.container, "card")).toBe("matrix(1, 0, 0, 1, 0, 0)");
    expect(transformOf(m.container, "mark")).toBe("matrix(1, 0, 0, 1, 100, 0)");
    await m.unmount();
  });

  it("move when only the camera does", async () => {
    const m = await mountPlayer(
      under({
        tracks: ["cards"],
        keys: [
          ["x", 0, 0],
          ["x", 2, 200],
        ],
      }),
    );
    await m.seek(0);
    expect(transformOf(m.container, "card")).toBe("matrix(1, 0, 0, 1, 100, 0)");
    await m.seek(1);
    expect(transformOf(m.container, "card")).toBe("matrix(1, 0, 0, 1, 0, 0)");
    await m.seek(2);
    expect(transformOf(m.container, "card")).toBe("matrix(1, 0, 0, 1, -100, 0)");
    await m.unmount();
  });
});
