import { buildSourceIndex, collectModule, loadModule, placed, type ResolvedState, resolve } from "@uberscene/sdk";

import { shapeDrawing } from "../src/elements/shape/drawing";
import { childrenOf, fixtureManifest } from "./helpers/state";

// A shape whose own values change: its markup at three times shows the size, the colour, the dash and the points the
// keys put there.

const file = (props: string) => `import { Composition, Shape, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1000} height={600}>
      <Track id="cards" layout="free">
        <Shape id="s" start={0} duration={4} ${props} />
      </Track>
    </Composition>
  );
}
`;

const load = (text: string): ResolvedState =>
  resolve(collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }), fixtureManifest);

function drawn(state: ResolvedState, time: number) {
  const placement = placed(state.items.get("s"), "shape")!;
  return shapeDrawing({ placement, children: childrenOf(state, "s"), state, time });
}

describe("a shape with keys on its own values", () => {
  const state = load(
    file(`type="rectangle" width={[{ at: 0, value: 100 }, { at: 2, value: 300 }]} height={50}
      fill={[{ at: 0, value: "#ff0000" }, { at: 2, value: "#0000ff" }]}
      stroke={{ color: "#ffffff", thickness: [{ at: 0, value: 2 }, { at: 2, value: 10 }], dashArray: [400],
        dashOffset: [{ at: 0, value: 400 }, { at: 2, value: 0 }] }}`),
  );

  it("resolves with no errors", () => {
    expect(state.errors).toEqual([]);
  });

  it("draws the first key's values at the start", () => {
    const d = drawn(state, 0);
    expect(d.layout.rect.w).toBe(100);
    expect(d.prepared.markup).toContain('fill="#ff0000"');
    expect(d.prepared.markup).toContain('stroke-dashoffset="400"');
  });

  it("is half way at the middle: size, colour through OKLab, thickness and dash", () => {
    const d = drawn(state, 1);
    expect(d.layout.rect.w).toBe(200);
    expect(d.prepared.markup).toContain('fill="#8c53a2"');
    expect(d.prepared.markup).toContain('stroke-width="6"');
    expect(d.prepared.markup).toContain('stroke-dashoffset="200"');
  });

  it("holds the last key's values after it", () => {
    const d = drawn(state, 3);
    expect(d.layout.rect.w).toBe(300);
    expect(d.prepared.markup).toContain('fill="#0000ff"');
    expect(d.prepared.markup).toContain('stroke-dashoffset="0"');
  });
});

describe("a polygon whose points are keyed", () => {
  it("morphs point by point", () => {
    const state = load(
      file(`type="polygon" width={100} height={100} points={[
        { at: 0, value: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }] },
        { at: 2, value: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0.5, y: 0 }] }]}`),
    );
    expect(state.errors).toEqual([]);
    expect(drawn(state, 0).prepared.markup).toContain('points="0,0 100,0 50,100"');
    expect(drawn(state, 1).prepared.markup).toContain('points="0,50 100,50 50,50"');
  });
});

describe("a shape with no keys", () => {
  it("draws as written", () => {
    const state = load(file(`type="ellipse" width={120} height={80} fill="#00ff00"`));
    const d = drawn(state, 2);
    expect(d.layout.rect.w).toBe(120);
    expect(d.prepared.markup).toContain('fill="#00ff00"');
  });
});
