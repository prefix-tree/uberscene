import { describe, expect, it } from "vitest";

import { buildSourceIndex, collectModule, loadModule, type ResolvedState, resolve } from "@uberscene/sdk";

import { manifest } from "./helpers";

const file = (body: string) => `import { Camera, Clip, Composition, Marker, Shape, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
${body}
    </Composition>
  );
}
`;

const load = (text: string): ResolvedState =>
  resolve(collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }), manifest);

const CARD = (id: string) =>
  `<Shape id="${id}" start={0} duration={4} type="rectangle" box={{ x: 100, y: 100, width: 200, height: 200 }} />`;

const VIDEO = file(`      <Track id="under" layout="free">
        ${CARD("ground")}
      </Track>
      <Camera id="cam" x={[{ at: 1, value: 0, easing: "snappy" }, { at: 1.3, value: 180 }]} zoom={1.1}>
        <Track id="speaker">
          <Clip id="talk" src="asset:interview" in={2} out={6} />
        </Track>
        <Track id="cards" layout="free">
          ${CARD("card")}
        </Track>
      </Camera>
      <Marker id="beat" start={2} />
      <Track id="logo" layout="free">
        ${CARD("mark")}
      </Track>`);

describe("a camera around tracks", () => {
  const state = load(VIDEO);

  it("resolves without errors", () => {
    expect(state.errors).toEqual([]);
  });

  it("numbers tracks in file order across the camera's edge, and says which the camera holds", () => {
    expect(state.tracks.map((t) => [t.id, t.order, t.camera])).toEqual([
      ["under", 0, undefined],
      ["speaker", 1, "cam"],
      ["cards", 2, "cam"],
      ["logo", 3, undefined],
    ]);
  });

  it("places what is on the camera's tracks as on any track", () => {
    expect(state.items.get("talk")).toMatchObject({ track: "speaker", start: 0, duration: 4 });
    expect(state.items.get("card")).toMatchObject({ track: "cards", start: 0, duration: 4 });
    expect(state.composition.duration).toBe(4);
  });

  it("is an item over the whole video, with its tracks as children and the composition as parent", () => {
    const cam = state.items.get("cam");
    expect(cam).toMatchObject({ kind: "camera", parent: "composition", start: 0, end: 4, track: null });
    expect(cam?.children.slice(0, 2)).toEqual(["speaker", "cards"]);
    expect(state.items.get("speaker")?.parent).toBe("cam");
    expect(state.items.get("logo")?.parent).toBe("composition");
  });

  it("turns its key lists into keys on the video's clock, and keeps constants as props", () => {
    const keys = [...state.items.values()].filter((i) => i.kind === "keyframe" && i.parent === "cam");
    expect(keys.map((k) => [k.id, k.props.property, k.start, k.props.value, k.props.easing])).toEqual([
      ["cam.x.0", "camera.x", 1, 0, "snappy"],
      ["cam.x.1", "camera.x", 1.3, 180, "linear"],
    ]);
    expect(state.items.get("cam")?.props).toMatchObject({ x: 0, y: 0, zoom: 1.1, rotation: 0 });
  });

  it("leaves markers where they are", () => {
    expect(state.items.get("beat")).toMatchObject({ kind: "marker", start: 2 });
  });
});

describe("what a camera refuses", () => {
  const errorsOf = (body: string) => load(file(body)).errors.map((e) => [e.code, e.id, e.message]);

  it("a second camera", () => {
    expect(
      errorsOf(`      <Camera id="a"><Track id="t1" layout="free">${CARD("s1")}</Track></Camera>
      <Camera id="b"><Track id="t2" layout="free">${CARD("s2")}</Track></Camera>`),
    ).toEqual([
      [
        "INVALID_CHILD",
        "b",
        'a composition has one <Camera>: move these tracks into <Camera id="a">, or out of a camera',
      ],
    ]);
  });

  it("anything but tracks inside it", () => {
    expect(
      errorsOf(`      <Camera id="a">
        <Title id="loose" start={0} duration={1} text="hi" />
      </Camera>`),
    ).toEqual([
      ["INVALID_CHILD", "loose", "<Camera> holds <Track>s only: put <title> in a <Track>, or outside the camera"],
    ]);
  });

  it("a zoom of zero", () => {
    const errors = load(
      file(`      <Camera id="a" zoom={0}><Track id="t1" layout="free">${CARD("s1")}</Track></Camera>`),
    ).errors;
    expect(errors.map((e) => [e.code, e.id, e.prop])).toEqual([["SCHEMA", "a", "zoom"]]);
  });
});

describe("a file without a camera", () => {
  it("has no camera on any track", () => {
    const state = load(file(`      <Track id="t" layout="free">${CARD("s")}</Track>`));
    expect(state.tracks.every((t) => t.camera === undefined)).toBe(true);
  });
});

describe("a written main track inside the camera", () => {
  it("is moved by it", () => {
    const state = load(
      file(`      <Camera id="cam" zoom={2}>
        <Track id="main"><Clip id="talk" src="asset:interview" in={2} out={6} /></Track>
      </Camera>`),
    );
    expect(state.errors).toEqual([]);
    expect(state.tracks.map((t) => [t.id, t.camera, t.implicit])).toEqual([["main", "cam", undefined]]);
  });
});
