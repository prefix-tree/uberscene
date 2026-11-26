import { spaceOf } from "../src/overlays/space";
import { mountPlayer } from "./helpers/react";
import { type ItemSpec, makeState } from "./helpers/state";
import { type ElementCellProps, type Matrix2D, sameElement, visiblePlacements } from "./internal";

const key = (id: string, property: string, at: number, value: unknown): ItemSpec => ({
  id,
  kind: "keyframe",
  props: { property, at, value },
});

const shape = (id: string, props: Record<string, unknown>, extra: Partial<ItemSpec> = {}): ItemSpec => ({
  id,
  kind: "shape",
  start: 0,
  duration: 4,
  ...extra,
  props: { type: "rectangle", fill: "#2244ff", ...props },
});

// An arm 40 wide and 200 tall at (300, 100), turning about its top; a hand at its bottom; a nail on the hand.
const arm = (extra: Partial<ItemSpec> = {}, transform: Record<string, unknown> = { anchor: { x: 0.5, y: 0 } }) =>
  shape("arm", { width: 40, height: 200, box: { x: 300, y: 100, width: 40, height: 200 }, transform }, extra);
const hand = shape("hand", {
  parent: "arm",
  width: 20,
  height: 20,
  box: { x: 20, y: 200, origin: "center", width: 20, height: 20 },
});
const nail = shape("nail", { parent: "hand", width: 4, height: 4, box: { x: 10, y: 0, width: 4, height: 4 } });

const rig = (armSpec: ItemSpec, ...rest: ItemSpec[]) =>
  makeState({ tracks: [{ id: "rig", layout: "free", items: [armSpec, hand, nail, ...rest] }] });

const at = (m: Matrix2D, x: number, y: number): [number, number] => [
  Math.round((m.a * x + m.c * y + m.e) * 1000) / 1000,
  Math.round((m.b * x + m.d * y + m.f) * 1000) / 1000,
];

const placementOf = (state: ReturnType<typeof makeState>, id: string) => state.items.get(id)!;

describe("an overlay's parent", () => {
  it("places the child's box in the parent's box", () => {
    const state = rig(arm());
    const space = spaceOf(state, placementOf(state, "hand"), 1);
    expect(space.frame).toEqual({ width: 40, height: 200 });
    // The hand's (20, 200) in the arm is the arm's bottom middle: (320, 300) on screen.
    expect(at(space.matrix, 20, 200)).toEqual([320, 300]);
  });

  it("is the composition for an overlay without one", () => {
    const state = rig(arm());
    const space = spaceOf(state, placementOf(state, "arm"), 1);
    expect(space.frame).toMatchObject({ width: 640, height: 360 });
    expect(at(space.matrix, 7, 9)).toEqual([7, 9]);
  });

  it("turns and scales the child with the parent, about the parent's anchor", () => {
    const state = rig(arm({}, { anchor: { x: 0.5, y: 0 }, rotation: 90, scale: 0.5 }));
    // Turned a quarter clockwise about its top middle (320, 100) and halved: the bottom points left, 100 long.
    expect(at(spaceOf(state, placementOf(state, "hand"), 1).matrix, 20, 200)).toEqual([220, 100]);
  });

  it("carries through two levels", () => {
    const state = rig(arm({}, { anchor: { x: 0.5, y: 0 }, rotation: 90 }));
    const nailSpace = spaceOf(state, placementOf(state, "nail"), 1);
    expect(nailSpace.frame).toEqual({ width: 20, height: 20 });
    // The hand's top left in the arm is (10, 190); turned with the arm about (320, 100) it lands at (130, 90).
    expect(at(nailSpace.matrix, 0, 0)).toEqual([130, 90]);
  });

  it("follows the parent's keys, each at the parent's own time", () => {
    const keyed = arm({
      start: 1,
      children: [key("r0", "transform.rotation", 0, 0), key("r1", "transform.rotation", 2, 90)],
    });
    const state = rig(keyed);
    const handAt = (t: number) => at(spaceOf(state, placementOf(state, "hand"), t).matrix, 20, 200);
    expect(handAt(1)).toEqual([320, 300]);
    expect(handAt(3)).toEqual([120, 100]);
  });

  it("still places its children before it starts and after it ends, held there", () => {
    const keyed = arm({
      start: 1,
      duration: 2,
      children: [key("r0", "transform.rotation", 0, 0), key("r1", "transform.rotation", 2, 90)],
    });
    const state = rig(keyed);
    const handAt = (t: number) => at(spaceOf(state, placementOf(state, "hand"), t).matrix, 20, 200);
    expect(handAt(0)).toEqual([320, 300]);
    expect(handAt(3.9)).toEqual([120, 100]);
  });

  it("carries the child with the parent's entrance", () => {
    const sliding = shape("arm", {
      width: 40,
      height: 200,
      box: { x: 300, y: 100, width: 40, height: 200 },
      enter: { type: "slideUp", duration: 1 },
    });
    const state = rig(sliding);
    const handAt = (t: number) => at(spaceOf(state, placementOf(state, "hand"), t).matrix, 20, 200);
    expect(handAt(0)).not.toEqual([320, 300]);
    expect(handAt(2)).toEqual([320, 300]);
  });

  it("ends the chain at a cycle instead of looping", () => {
    const state = makeState({
      tracks: [
        {
          id: "rig",
          layout: "free",
          items: [
            shape("a", { parent: "b", box: { x: 10, y: 10 } }),
            shape("b", { parent: "a", box: { x: 20, y: 20 } }),
          ],
        },
      ],
    });
    expect(() => spaceOf(state, placementOf(state, "a"), 1)).not.toThrow();
  });
});

describe("a child drawn in the player", () => {
  const styleOf = (root: Element, id: string): CSSStyleDeclaration =>
    (root.querySelector(`[data-el="${id}"]`) as HTMLElement).style;

  it("is drawn where its parent carries it, keeping its own opacity", async () => {
    const faded = arm({}, { anchor: { x: 0.5, y: 0 }, rotation: 90, opacity: 0.25 });
    const m = await mountPlayer(rig(faded));
    await m.seek(1);
    // The hand's box is centred on (20, 200) in the arm: its top left (10, 190), turned about (320, 100).
    expect(styleOf(m.container, "hand").transform).toBe("matrix(0, 1, -1, 0, 130, 90)");
    expect(styleOf(m.container, "arm").opacity).toBe("0.25");
    expect(styleOf(m.container, "hand").opacity).toBe("1");
    await m.unmount();
  });

  it("is redrawn when only its parent moves", () => {
    const keyed = arm({ children: [key("x0", "box.x", 0, 300), key("x1", "box.x", 4, 400)] });
    const still = shape(
      "hand",
      { parent: "arm", width: 20, height: 20, box: { x: 0, y: 0, width: 20, height: 20 } },
      {
        duration: 4,
      },
    );
    const state = makeState({ tracks: [{ id: "rig", layout: "free", items: [keyed, still] }] });
    const cell = (time: number): ElementCellProps => ({
      item: visiblePlacements(state, time).find((v) => v.placement.id === "hand")!,
      state,
      time,
      interior: null,
      exact: true,
    });
    expect(sameElement(cell(1), cell(1))).toBe(true);
    // The hand's own frame index is the same within one frame; its parent still moved.
    const plain = (time: number): ElementCellProps => ({ ...cell(time), exact: false });
    expect(sameElement(plain(1), plain(1.001))).toBe(false);
  });
});
