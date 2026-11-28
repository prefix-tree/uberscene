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

const file = (body: string) => `import { Camera, Composition, Shape, Svg, Title, Track } from "@uberscene/kit";

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
        ${SHAPE("hand", ` follow="arm"`)}
        ${SHAPE("nail", ` follow="hand"`)}
      </Track>`);

describe("follow", () => {
  it("resolves a chain without errors", () => {
    expect(problems(load(RIG))).toEqual([]);
  });

  it("names an element that does not exist", () => {
    const state = load(file(`      <Track id="rig" layout="free">${SHAPE("hand", ` follow="arm"`)}</Track>`));
    expect(problems(state)).toEqual([`UNKNOWN_REF hand follow: follow names "arm", which does not exist`]);
  });

  it("must be an overlay", () => {
    const state = load(
      file(`      <Track id="main"><Shape id="ground" duration={4} type="rectangle" /></Track>
      <Track id="rig" layout="free">${SHAPE("hand", ` follow="main"`)}</Track>`),
    );
    expect(problems(state)).toEqual([
      `WRONG_KIND hand follow: follow names "main", a track: an element follows a title, shape, svg, sticker or layer`,
    ]);
  });

  it("names every element of a cycle, once", () => {
    const state = load(
      file(`      <Track id="rig" layout="free">
        ${SHAPE("a", ` follow="c"`)}
        ${SHAPE("b", ` follow="a"`)}
        ${SHAPE("c", ` follow="b"`)}
        ${SHAPE("d", ` follow="a"`)}
      </Track>`),
    );
    expect(problems(state)).toEqual([
      `CYCLE a follow: follows go round in a circle: "a" → "c" → "b" → "a"; remove one of these follows`,
    ]);
  });

  it("must be on the same side of the camera", () => {
    const state = load(
      file(`      <Camera id="cam" zoom={1.1}>
        <Track id="cards" layout="free">${SHAPE("arm")}</Track>
      </Camera>
      <Track id="logo" layout="free">${SHAPE("hand", ` follow="arm"`)}</Track>`),
    );
    expect(problems(state)).toEqual([
      `WRONG_SCOPE hand follow: "arm" is under the camera and the other is not: put "hand" and "arm", which it follows, on tracks on the same side of the camera`,
    ]);
  });

  it("can't follow an SVG read from a file", () => {
    const state = load(
      file(`      <Track id="rig" layout="free">
        <Svg id="logo" start={0} duration={4} src="logo.svg" box={{ x: 100, y: 100 }} />
        ${SHAPE("hand", ` follow="logo"`)}
      </Track>`),
    );
    expect(problems(state).filter((p) => p.includes("follow"))).toEqual([
      'WRONG_KIND hand follow: follow names "logo", an SVG read from a file: its size is only known once it is drawn, so it can\'t be followed yet; write its markup in `content`, or follow a shape',
    ]);
  });

  it("is a row's follow", () => {
    const rows = timelineRows(load(RIG));
    expect(rows.elements.find((r) => r.id === "hand")?.follow).toBe("arm");
    expect(rows.elements.find((r) => r.id === "arm")?.follow).toBeUndefined();
  });

  it("moves a camera push to where a card that follows another really is", () => {
    const state = load(
      file(`      <Camera id="cam" push={{ on: ["card"] }}>
        <Track id="cards" layout="free">
          <Shape id="board" start={0} duration={4} type="rectangle" width={200} height={200} box={{ x: 1700, y: 100, width: 200, height: 200 }} />
          <Shape id="card" start={1} duration={3} type="rectangle" width={200} height={200} follow="board" box={{ x: 100, y: 0, width: 200, height: 200 }} />
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

describe("removing an element others follow", () => {
  const editor = (text: string) => new Executor({ tree: index(text), manifest });
  const box = (state: ResolvedState, id: string) => state.tree.byId.get(id)?.props.box;

  it("hands its followers to what it followed, where they were drawn, and undo puts it back", () => {
    const exec = editor(RIG);
    const result = exec.execute({ type: "element/remove", params: { id: "hand" } });
    expect(result.errors ?? []).toEqual([]);
    expect(problems(exec.state())).toEqual([]);
    expect(exec.state().items.get("nail")?.props.follow).toBe("arm");
    // The nail stood at 300, 300 on the frame: 100, 100 in the hand, which stood at 100, 100 in the arm. In the arm it
    // is at 200, 200.
    expect(box(exec.state(), "nail")).toEqual({ x: 200, y: 200, width: 40, height: 200 });
    const saved = foldToSource(RIG, exec.log(), exec.state());
    expect(saved.skipped).toEqual([]);
    const reread = load(saved.text);
    expect(reread.items.get("nail")?.props.follow).toBe("arm");
    expect(reread.items.get("nail")?.props.box).toEqual({ x: 200, y: 200, width: 40, height: 200 });
    exec.undo();
    expect(exec.state().items.get("nail")?.props.follow).toBe("hand");
    expect(box(exec.state(), "nail")).toEqual({ x: 100, y: 100, width: 40, height: 200 });
    expect(exec.state().items.has("hand")).toBe(true);
  });

  it("leaves a top follower on the frame, where it stood", () => {
    const exec = editor(RIG);
    exec.execute({ type: "element/remove", params: { id: "arm" } });
    expect(problems(exec.state())).toEqual([]);
    expect(exec.state().items.get("hand")?.props.follow).toBeUndefined();
    expect(box(exec.state(), "hand")).toEqual({ x: 200, y: 200, width: 40, height: 200 });
    expect(exec.state().items.get("nail")?.props.follow).toBe("hand");
  });

  it("takes the turn of what it followed into its own", () => {
    const text = file(`      <Track id="rig" layout="free">
        ${SHAPE("arm", " transform={{ rotation: 90 }}")}
        <Shape id="hand" start={0} duration={4} type="rectangle" width={40} height={200} follow="arm" box={{ x: 40, y: 0, width: 40, height: 200 }} />
      </Track>`);
    const exec = editor(text);
    exec.execute({ type: "element/remove", params: { id: "arm" } });
    expect(problems(exec.state())).toEqual([]);
    // The arm turned a quarter about its centre (120, 200); the hand's centre, 40 px to its right, went 40 px down.
    expect(box(exec.state(), "hand")).toEqual({ x: 100, y: 140, width: 40, height: 200 });
    expect(exec.state().tree.byId.get("hand")?.props.transform).toEqual({ rotation: 90 });
  });
});
