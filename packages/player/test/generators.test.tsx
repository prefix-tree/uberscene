import { Composition, Shape, Track } from "@uberscene/kit";
import type { Kind } from "@uberscene/kit/schema";
import { collectModule, resolve } from "@uberscene/sdk/resolver";

import { mountPlayer } from "./helpers/react";
import { fixtureManifest, makeState } from "./helpers/state";
import { animatedBox, animatedTransform, buildFramePlan, keyframedParam, keyframedValue } from "./internal";

const child = (id: string, kind: Kind, props: Record<string, unknown>) => ({ id, kind, props });
const stateOf = (children: ReturnType<typeof child>[], kind: Kind = "clip") =>
  makeState({
    tracks: [
      {
        id: "main",
        layout: "free",
        items:
          kind === "clip"
            ? [{ id: "el", kind, start: 0, source: { in: 0, out: 8, asset: "a" }, children }]
            : [
                {
                  id: "el",
                  kind,
                  start: 0,
                  duration: 8,
                  props: { type: "rectangle", width: 100, height: 60, box: { x: 100, y: 50 } },
                  children,
                },
              ],
      },
    ],
  });
const kids = (state: ReturnType<typeof makeState>) =>
  (state.items.get("el")?.children ?? []).map((c) => state.items.get(c)!);

const wiggle = (property: string, more: Record<string, unknown> = {}) =>
  child("el.g", "generator", { property, type: "wiggle", amount: 4, frequency: 1, seed: 7, ...more });

describe("a value with a generator", () => {
  it("wobbles about its constant, within its amount, the same every time it is asked", () => {
    const children = kids(stateOf([wiggle("transform.rotation")]));
    const values = Array.from({ length: 120 }, (_, f) => keyframedValue(children, "transform.rotation", f / 30, 10));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(6);
    expect(Math.max(...values)).toBeLessThanOrEqual(14);
    expect(new Set(values.map((v) => v.toFixed(3))).size).toBeGreaterThan(60);
    expect(keyframedValue(children, "transform.rotation", 1.5, 10)).toBe(values[45]);
  });

  it("wobbles about its keys when it has them", () => {
    const children = kids(
      stateOf([
        wiggle("transform.rotation", { amount: 1 }),
        child("el.k0", "keyframe", { property: "transform.rotation", at: 0, value: 0 }),
        child("el.k1", "keyframe", { property: "transform.rotation", at: 4, value: 400 }),
      ]),
    );
    const v = keyframedValue(children, "transform.rotation", 2, 0);
    expect(Math.abs(v - 200)).toBeLessThanOrEqual(1);
    expect(v).not.toBe(200);
  });

  it("leaves another property of the same element alone", () => {
    const children = kids(stateOf([wiggle("transform.rotation")]));
    expect(keyframedValue(children, "transform.opacity", 2, 1)).toBe(1);
  });

  it("drifts, and loops its keys", () => {
    const drift = kids(
      stateOf([child("el.g", "generator", { property: "transform.scale.x", type: "drift", speed: 0.1 })]),
    );
    expect(keyframedValue(drift, "transform.scale.x", 3, 1)).toBeCloseTo(1.3, 10);
    const loop = kids(
      stateOf([
        child("el.g", "generator", { property: "transform.opacity", type: "loop", mode: "repeat", span: [0, 1] }),
        child("el.k0", "keyframe", { property: "transform.opacity", at: 0, value: 0 }),
        child("el.k1", "keyframe", { property: "transform.opacity", at: 1, value: 1 }),
      ]),
    );
    expect(keyframedValue(loop, "transform.opacity", 0.25, 1)).toBeCloseTo(0.25, 10);
    expect(keyframedValue(loop, "transform.opacity", 3.25, 1)).toBeCloseTo(0.25, 10);
  });

  it("reaches an effect's param", () => {
    const g = child("fx.g", "generator", { param: "radius", type: "drift", speed: 2 });
    const children = kids(stateOf([g]));
    expect(keyframedParam(children, "radius", 3, 8)).toBe(14);
  });
});

describe("drawing with a generator", () => {
  it("turns footage a little differently each frame", () => {
    const state = stateOf([wiggle("transform.rotation")]);
    const turn = (t: number) => animatedTransform(undefined, kids(state), t).rotation ?? 0;
    expect(turn(1)).not.toBe(turn(1.5));
    const a = buildFramePlan(state, 1).ops[0]!.matrix;
    const b = buildFramePlan(state, 1.5).ops[0]!.matrix;
    expect(a).not.toEqual(b);
    expect(buildFramePlan(state, 1).ops[0]!.matrix).toEqual(a);
  });

  it("moves a box that has a place, and leaves the other axis", () => {
    const state = stateOf([wiggle("box.x")], "shape");
    const box = (t: number) => animatedBox({ x: 100, y: 50 }, kids(state), t);
    expect(box(1)?.y).toBe(50);
    expect(Math.abs((box(1)?.x ?? 0) - 100)).toBeLessThanOrEqual(4);
    expect(box(1)?.x).not.toBe(box(2)?.x);
  });

  it("redraws an overlay that only a generator moves", async () => {
    const m = await mountPlayer(stateOf([wiggle("transform.rotation", { amount: 20 })], "shape"));
    const transform = () => (m.container.querySelector('[data-el="el"]') as HTMLElement).style.transform;
    await m.seek(1);
    const first = transform();
    await m.seek(1.5);
    expect(transform()).not.toBe(first);
    await m.seek(1);
    expect(transform()).toBe(first);
    await m.unmount();
  });
});

describe("a file without a generator", () => {
  it("reads its keys as it always did", () => {
    const children = kids(
      stateOf([
        child("el.k0", "keyframe", { property: "transform.rotation", at: 0, value: 0 }),
        child("el.k1", "keyframe", { property: "transform.rotation", at: 4, value: 400 }),
      ]),
    );
    expect(keyframedValue(children, "transform.rotation", 2, 0)).toBe(200);
    expect(keyframedValue(children, "transform.opacity", 2, 0.5)).toBe(0.5);
  });
});

describe("a value linked to another element's", () => {
  // Through the resolver: it writes the linked value's keys and generator onto the element that links, so the
  // player's one function for a value over time reads a link with no code of its own.
  const linked = () => {
    const Video = () => (
      <Composition fps={30} width={1000} height={600}>
        <Track id="cards" layout="free">
          <Shape
            id="logo"
            start={1}
            duration={6}
            type="rectangle"
            width={100}
            height={100}
            transform={{
              rotation: {
                type: "wiggle",
                amount: 6,
                frequency: 2,
                base: [
                  { at: 0, value: 0, easing: "easeOutCubic" },
                  { at: 2, value: 90 },
                ],
              },
              opacity: 0.8,
            }}
          />
          <Shape
            id="hand"
            start={1.5}
            duration={6}
            type="rectangle"
            width={100}
            height={100}
            transform={{
              rotation: { link: "logo.transform.rotation", scale: -2, offset: 10, delay: 0.25 },
              opacity: { link: "logo.transform.opacity", scale: 0.5 },
            }}
          />
        </Track>
      </Composition>
    );
    const state = resolve(collectModule({ default: Video } as never), fixtureManifest);
    expect(state.errors).toEqual([]);
    const of = (id: string) => {
      const p = state.items.get(id)!;
      return { p, children: p.children.map((c) => state.items.get(c)!) };
    };
    return { logo: of("logo"), hand: of("hand") };
  };

  it("is that value, scaled and offset, a delay later, at every frame", () => {
    const { logo, hand } = linked();
    // The hand starts half a second after the logo and reads it a quarter of a second late: at `rel` of its own
    // time it reads the logo at `rel + 0.25` of the logo's.
    for (let frame = 0; frame < 150; frame++) {
      const rel = frame / 30;
      const there = animatedTransform(logo.p.props.transform as never, logo.children, rel + 0.25).rotation ?? 0;
      const here = animatedTransform(hand.p.props.transform as never, hand.children, rel).rotation;
      expect(here).toBeCloseTo(-2 * there + 10, 9);
    }
  });

  it("reads a constant as a value that never moves", () => {
    const { hand } = linked();
    expect(animatedTransform(hand.p.props.transform as never, hand.children, 0).opacity).toBe(0.4);
    expect(animatedTransform(hand.p.props.transform as never, hand.children, 3).opacity).toBe(0.4);
  });
});
