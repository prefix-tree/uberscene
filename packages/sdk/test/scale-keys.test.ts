import { describe, expect, it } from "vitest";

import { collectModule, loadModule, resolve } from "@uberscene/sdk";

const stateOf = (scale: string) =>
  resolve(
    collectModule(
      loadModule(`import { Composition, Shape, Track } from "@uberscene/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t" layout="free"><Shape id="ball" type="circle" start={0} duration={2} transform={{ scale: ${scale} }} /></Track></Composition>; }`) as never,
    ),
    { assets: {} },
  );
const keyValues = (state: ReturnType<typeof stateOf>, axis: "x" | "y") =>
  [...state.items.values()]
    .filter((p) => p.kind === "keyframe" && p.props.property === `transform.scale.${axis}`)
    .map((p) => p.props.value);

describe("keys on a scale", () => {
  it("move both axes from one list of numbers", () => {
    const state = stateOf("[{ at: 0, value: 0.5 }, { at: 1, value: 1 }]");
    expect(state.errors).toEqual([]);
    expect(keyValues(state, "x")).toEqual([0.5, 1]);
    expect(keyValues(state, "y")).toEqual([0.5, 1]);
  });

  it("give each axis its own half of a { x, y } value, for squash and stretch", () => {
    const state = stateOf("[{ at: 0, value: { x: 1, y: 1 } }, { at: 0.5, value: { x: 1.3, y: 0.7 } }]");
    expect(state.errors).toEqual([]);
    expect(keyValues(state, "x")).toEqual([1, 1.3]);
    expect(keyValues(state, "y")).toEqual([1, 0.7]);
  });

  it("take a list per axis", () => {
    const state = stateOf("{ x: [{ at: 0, value: 1 }, { at: 1, value: 2 }], y: 1 }");
    expect(state.errors).toEqual([]);
    expect(keyValues(state, "x")).toEqual([1, 2]);
    expect(keyValues(state, "y")).toEqual([]);
  });
});
