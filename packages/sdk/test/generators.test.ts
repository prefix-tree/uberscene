import { describe, expect, it } from "vitest";

import { generatorSeed } from "@uberscene/kit/schema";
import { buildSourceIndex, collectModule, loadModule, type ResolvedState, resolve } from "@uberscene/sdk";

import { manifest } from "./helpers";

const file = (body: string) => `import { Camera, Clip, Composition, Shape, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1000} height={600}>
${body}
    </Composition>
  );
}
`;

const shape = (props: string, id = "card") =>
  `      <Track id="cards" layout="free">
        <Shape id="${id}" start={1} duration={4} type="rectangle" width={100} height={100} ${props} />
      </Track>`;

const load = (text: string): ResolvedState =>
  resolve(collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }), manifest);

const under = (state: ResolvedState, id: string) =>
  [...state.items.values()]
    .filter((i) => i.parent === id && (i.kind === "generator" || i.kind === "keyframe"))
    .map((i) => {
      const { id: _id, ...props } = i.props as Record<string, unknown>;
      return [i.id, i.kind, props];
    });

describe("a generator written in place of a value", () => {
  it("becomes an item under its element, seeded from the element and the prop", () => {
    const state = load(file(shape(`transform={{ rotation: { type: "wiggle", amount: 2, frequency: 0.6 } }}`)));
    expect(state.errors).toEqual([]);
    expect(under(state, "card")).toEqual([
      [
        "card.transform.rotation.generator",
        "generator",
        {
          property: "transform.rotation",
          type: "wiggle",
          amount: 2,
          frequency: 0.6,
          seed: generatorSeed("card", "transform.rotation"),
          mode: "repeat",
        },
      ],
    ]);
    // Nothing is left in the prop: the rotation it is added to is the default.
    expect(state.items.get("card")?.props.transform).toBeUndefined();
    const g = state.items.get("card.transform.rotation.generator");
    expect(g).toMatchObject({ start: 1, end: 5 });
  });

  it("keeps the seed a file gives", () => {
    const state = load(file(shape(`transform={{ rotation: { type: "wiggle", amount: 2, seed: 42 } }}`)));
    expect(state.items.get("card.transform.rotation.generator")?.props.seed).toBe(42);
  });

  it("leaves a number base as the value, and keys as keys", () => {
    const number = load(file(shape(`transform={{ opacity: { type: "drift", base: 0.5, speed: 0.1 } }}`)));
    expect(number.errors).toEqual([]);
    expect(number.items.get("card")?.props.transform).toEqual({ opacity: 0.5 });
    expect(under(number, "card").map((r) => r[0])).toEqual(["card.transform.opacity.generator"]);

    const keys = load(
      file(
        shape(
          `transform={{ rotation: { type: "wiggle", amount: 3, base: [{ at: 0, value: 0 }, { at: 1, value: 90 }] } }}`,
        ),
      ),
    );
    expect(keys.errors).toEqual([]);
    expect(under(keys, "card").map((r) => r[0])).toEqual([
      "card.transform.rotation.generator",
      "card.transform.rotation.0",
      "card.transform.rotation.1",
    ]);
  });

  it("makes a loop of its keys, with the stretch it plays again", () => {
    const state = load(
      file(
        shape(
          `transform={{ opacity: { type: "loop", mode: "pingpong", keys: [{ at: 0.5, value: 1 }, { at: 1.5, value: 0.4 }] } }}`,
        ),
      ),
    );
    expect(state.errors).toEqual([]);
    expect(state.items.get("card.transform.opacity.generator")?.props).toMatchObject({
      type: "loop",
      mode: "pingpong",
      span: [0.5, 1.5],
    });
    expect(under(state, "card").filter((r) => r[1] === "keyframe")).toHaveLength(2);
  });

  it("on scale moves both axes alike", () => {
    const state = load(file(shape(`transform={{ scale: { type: "wiggle", amount: 0.05, base: 1 } }}`)));
    expect(state.errors).toEqual([]);
    const x = state.items.get("card.transform.scale.x.generator")?.props;
    const y = state.items.get("card.transform.scale.y.generator")?.props;
    expect(x?.property).toBe("transform.scale.x");
    expect(y?.property).toBe("transform.scale.y");
    expect(x?.seed).toBe(y?.seed);
  });

  it("works on one axis of a box that has a place", () => {
    const state = load(file(shape(`box={{ x: { type: "wiggle", amount: 6, base: 300 }, y: 200, origin: "center" }}`)));
    expect(state.errors).toEqual([]);
    expect(state.items.get("card")?.props.box).toMatchObject({ x: 300, y: 200 });
    expect(state.items.get("card.box.x.generator")?.props.property).toBe("box.x");
  });

  it("works on an effect's param, inside the effect", () => {
    const state = load(file(shape(`effects={[{ type: "blur", radius: { type: "wiggle", amount: 4, base: 8 } }]}`)));
    expect(state.errors).toEqual([]);
    const fx = state.items.get("card.effects.0");
    expect(fx?.props.params).toEqual({ radius: 8 });
    expect(state.items.get("card.effects.0.radius.generator")).toMatchObject({
      kind: "generator",
      parent: "card.effects.0",
    });
    expect(state.items.get("card.effects.0.radius.generator")?.props.param).toBe("radius");
  });

  it("works on a camera's values, and on top of a push", () => {
    const state = load(
      file(`      <Camera id="cam" push={{ on: ["far"] }} zoom={{ type: "drift", base: 1, speed: 0.01 }} rotation={{ type: "wiggle", amount: 0.5 }}>
        <Track id="cards" layout="free">
          <Shape id="far" start={1} duration={4} type="rectangle" width={100} height={100} box={{ x: 1100, y: 300, origin: "center" }} />
        </Track>
      </Camera>`),
    );
    expect(state.errors).toEqual([]);
    expect(state.items.get("cam")?.props).toMatchObject({ zoom: 1, rotation: 0 });
    const made = [...state.items.values()].filter((i) => i.parent === "cam" && i.kind !== "track").map((i) => i.id);
    expect(made).toEqual(["cam.zoom.generator", "cam.rotation.generator", "cam.push.x.0", "cam.push.x.1"]);
  });
});

describe("what a generator refuses", () => {
  const errors = (body: string) => load(file(body)).errors.map((e) => `${e.code} ${e.id} ${e.prop ?? ""}`.trim());

  it("a wiggle with no amount, a drift with no speed, a loop of one key", () => {
    expect(errors(shape(`transform={{ rotation: { type: "wiggle" } }}`))).toEqual([
      "SCHEMA card transform.rotation.amount",
    ]);
    expect(errors(shape(`transform={{ rotation: { type: "drift" } }}`))).toEqual([
      "SCHEMA card transform.rotation.speed",
    ]);
    expect(errors(shape(`transform={{ rotation: { type: "loop", keys: [{ at: 0, value: 1 }] } }}`))).toEqual([
      "SCHEMA card transform.rotation.keys",
    ]);
  });

  it("a wobble on a box axis with no place to be added to", () => {
    const state = load(file(shape(`box={{ x: { type: "wiggle", amount: 6 } }}`)));
    expect(state.errors.map((e) => `${e.code} ${e.id} ${e.prop}`)).toEqual(["SCHEMA card box.x"]);
    expect(state.errors[0]?.message).toContain("give it a `base`");
  });

  it("a generator on speed, volume or pan", () => {
    const clip = (props: string) => `      <Track id="main">
        <Clip id="talk" src="asset:interview" in={2} out={6} ${props} />
      </Track>`;
    expect(errors(clip(`speed={{ type: "drift", speed: 0.1 }}`))).toEqual(["SCHEMA talk speed"]);
    expect(errors(clip(`volume={{ type: "wiggle", amount: 0.1 }}`))).toEqual(["SCHEMA talk volume"]);
  });
});

describe("a file without a generator", () => {
  it("has no generator items", () => {
    const state = load(file(shape(`transform={{ rotation: [{ at: 0, value: 0 }, { at: 1, value: 10 }] }}`)));
    expect([...state.items.values()].some((i) => i.kind === "generator")).toBe(false);
  });
});
