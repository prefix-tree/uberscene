import { describe, expect, it } from "vitest";

import {
  buildSourceIndex,
  collectModule,
  Executor,
  foldToSource,
  loadModule,
  type ResolvedState,
  resolve,
  timelineRows,
} from "@uberscene/sdk";

import { manifest } from "./helpers";

const file = (body: string) => `import { Camera, Composition, Shape, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
${body}
    </Composition>
  );
}
`;

const index = (text: string) => collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) });
const load = (text: string): ResolvedState => resolve(index(text), manifest);
const problems = (state: ResolvedState) => state.errors.map((e) => `${e.code} ${e.id} ${e.prop ?? ""}: ${e.message}`);

const SHAPE = (id: string, extra = "") =>
  `<Shape id="${id}" start={0} duration={4} type="rectangle" width={40} height={200} box={{ x: 100, y: 100, width: 40, height: 200 }}${extra} />`;

const RIG = file(`      <Track id="rig" layout="free">
        ${SHAPE("arm")}
        ${SHAPE("hand", ` parent="arm"`)}
        ${SHAPE("nail", ` parent="hand"`)}
      </Track>`);

describe("parent", () => {
  it("resolves a chain without errors", () => {
    expect(problems(load(RIG))).toEqual([]);
  });

  it("names an element that does not exist", () => {
    const state = load(file(`      <Track id="rig" layout="free">${SHAPE("hand", ` parent="arm"`)}</Track>`));
    expect(problems(state)).toEqual([`UNKNOWN_REF hand parent: parent names "arm", which does not exist`]);
  });

  it("must be an overlay", () => {
    const state = load(
      file(`      <Track id="main"><Shape id="ground" duration={4} type="rectangle" /></Track>
      <Track id="rig" layout="free">${SHAPE("hand", ` parent="main"`)}</Track>`),
    );
    expect(problems(state)).toEqual([
      `SCHEMA hand parent: parent names "main", a track: a parent is a title, shape, svg, sticker or layer`,
    ]);
  });

  it("names every element of a cycle, once", () => {
    const state = load(
      file(`      <Track id="rig" layout="free">
        ${SHAPE("a", ` parent="c"`)}
        ${SHAPE("b", ` parent="a"`)}
        ${SHAPE("c", ` parent="b"`)}
        ${SHAPE("d", ` parent="a"`)}
      </Track>`),
    );
    expect(problems(state)).toEqual([
      `CYCLE a parent: parents go round in a circle: "a" → "c" → "b" → "a"; remove one of these parents`,
    ]);
  });

  it("must be on the same side of the camera", () => {
    const state = load(
      file(`      <Camera id="cam" zoom={1.1}>
        <Track id="cards" layout="free">${SHAPE("arm")}</Track>
      </Camera>
      <Track id="logo" layout="free">${SHAPE("hand", ` parent="arm"`)}</Track>`),
    );
    expect(problems(state)).toEqual([
      `SCHEMA hand parent: "arm" is under the camera and the other is not: put "hand" and its parent "arm" on tracks on the same side of the camera`,
    ]);
  });

  it("is a row's movesWith", () => {
    const rows = timelineRows(load(RIG));
    expect(rows.elements.find((r) => r.id === "hand")?.movesWith).toBe("arm");
    expect(rows.elements.find((r) => r.id === "arm")?.movesWith).toBeUndefined();
  });

  it("moves a camera push to where a parented card really is", () => {
    const state = load(
      file(`      <Camera id="cam" push={{ on: ["card"] }}>
        <Track id="cards" layout="free">
          <Shape id="board" start={0} duration={4} type="rectangle" width={200} height={200} box={{ x: 1700, y: 100, width: 200, height: 200 }} />
          <Shape id="card" start={1} duration={3} type="rectangle" width={200} height={200} parent="board" box={{ x: 100, y: 0, width: 200, height: 200 }} />
        </Track>
      </Camera>`),
    );
    expect(problems(state)).toEqual([]);
    // The card stands at x 1800..2000 on the board, past the frame's right edge: the view pans right until its edge is
    // inside the 54 px margin (1866), 134 px. Read in the frame, the card would stand at 100..300 and the pan be 34 px.
    const xs = [...state.items.values()].filter((i) => i.kind === "keyframe" && i.props.property === "camera.x");
    expect(xs.map((k) => k.props.value)).toEqual([0, 134]);
  });
});

describe("removing a parent", () => {
  const editor = (text: string) => new Executor({ tree: index(text), manifest });

  it("hands its children to its own parent, and undo puts it back", () => {
    const exec = editor(RIG);
    const result = exec.execute({ type: "element/remove", params: { id: "hand" } });
    expect(result.errors ?? []).toEqual([]);
    expect(problems(exec.state())).toEqual([]);
    expect(exec.state().items.get("nail")?.props.parent).toBe("arm");
    const saved = foldToSource(RIG, exec.log(), exec.state());
    expect(saved.skipped).toEqual([]);
    expect(saved.text).toContain(
      `id="nail" start={0} duration={4} type="rectangle" width={40} height={200} box={{ x: 100, y: 100, width: 40, height: 200 }} parent="arm"`,
    );
    exec.undo();
    expect(exec.state().items.get("nail")?.props.parent).toBe("hand");
    expect(exec.state().items.has("hand")).toBe(true);
  });

  it("leaves a top child with no parent", () => {
    const exec = editor(RIG);
    exec.execute({ type: "element/remove", params: { id: "arm" } });
    expect(problems(exec.state())).toEqual([]);
    expect(exec.state().items.get("hand")?.props.parent).toBeUndefined();
    expect(exec.state().items.get("nail")?.props.parent).toBe("hand");
  });
});
