import { describe, expect, it } from "vitest";

import {
  buildSourceIndex,
  collectModule,
  Executor,
  foldToSource,
  lint,
  loadModule,
  type ResolvedState,
  resolve,
} from "@uberscene/sdk";

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

// ── editing ─────────────────────────────────────────────────────────────────

const editor = (text: string): Executor =>
  new Executor({
    tree: collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }),
    manifest,
  });

const saved = (text: string, exec: Executor): string => {
  const result = foldToSource(text, exec.log(), exec.state());
  expect(result.skipped).toEqual([]);
  return result.text;
};

const run = (exec: Executor, action: Parameters<Executor["execute"]>[0]): void => {
  const result = exec.execute(action);
  expect(result.ok ? [] : result.errors).toEqual([]);
};

const order = (state: ResolvedState) => state.tracks.map((t) => (t.camera ? `${t.id}*` : t.id));

const FLAT = file(`      <Track id="under" layout="free">
        ${CARD("ground")}
      </Track>
      <Track id="speaker">
        <Clip id="talk" src="asset:interview" in={2} out={6} />
      </Track>
      <Track id="cards" layout="free">
        ${CARD("card")}
      </Track>
      <Track id="logo" layout="free">
        ${CARD("mark")}
      </Track>`);

describe("putting a camera in and taking it out", () => {
  it("wraps tracks that are next to each other, and they keep their place in the stack", () => {
    const exec = editor(FLAT);
    run(exec, { type: "camera/add", params: { cameraId: "cam", tracks: ["cards", "speaker"], zoom: 1.2 } });
    expect(order(exec.state())).toEqual(["under", "speaker*", "cards*", "logo"]);
    const text = saved(FLAT, exec);
    expect(text).toContain(`<Camera id="cam" zoom={1.2}>`);
    expect(text).toMatch(/import \{ Camera, /);
    const again = load(text);
    expect(again.errors).toEqual([]);
    expect(order(again)).toEqual(["under", "speaker*", "cards*", "logo"]);
    expect(lint(text, { manifest })).toEqual([]);

    exec.undo();
    expect(order(exec.state())).toEqual(["under", "speaker", "cards", "logo"]);
    expect(saved(FLAT, exec)).toBe(FLAT);
  });

  it("refuses tracks with another between them, a second camera, and tracks already in one", () => {
    const exec = editor(FLAT);
    const refused = (action: Parameters<Executor["execute"]>[0]) => {
      const result = exec.execute(action);
      return result.ok ? null : result.errors?.[0]?.message;
    };
    expect(refused({ type: "camera/add", params: { cameraId: "cam", tracks: ["under", "cards"] } })).toContain(
      "next to each other",
    );
    run(exec, { type: "camera/add", params: { cameraId: "cam", tracks: ["speaker"] } });
    expect(refused({ type: "camera/add", params: { cameraId: "cam2", tracks: ["logo"] } })).toContain(
      'the composition has a camera, "cam"',
    );
  });

  it("takes the camera away and leaves its tracks in place, and undo brings it back with its keys", () => {
    const exec = editor(VIDEO);
    run(exec, { type: "camera/remove", params: { cameraId: "cam" } });
    expect(order(exec.state())).toEqual(["under", "speaker", "cards", "logo"]);
    const text = saved(VIDEO, exec);
    expect(text).not.toContain("<Camera");
    expect(load(text).errors).toEqual([]);
    exec.undo();
    expect(order(exec.state())).toEqual(["under", "speaker*", "cards*", "logo"]);
    expect(exec.state().items.get("cam.x.1")?.props.value).toBe(180);
    expect(saved(VIDEO, exec)).toBe(VIDEO);
  });
});

describe("the camera's values and keys", () => {
  it("are set, written to the file, and undone", () => {
    const exec = editor(VIDEO);
    run(exec, { type: "camera/update", params: { cameraId: "cam", zoom: 2, rotation: 5 } });
    expect(exec.state().items.get("cam")?.props).toMatchObject({ zoom: 2, rotation: 5 });
    const text = saved(VIDEO, exec);
    expect(text).toContain("zoom={2}");
    expect(text).toContain("rotation={5}");
    exec.undo();
    expect(saved(VIDEO, exec)).toBe(VIDEO);
  });

  it("take keys on the video's clock through the key actions", () => {
    const exec = editor(VIDEO);
    run(exec, { type: "key/add", params: { id: "cam", path: "zoom", at: 0, value: 1 } });
    run(exec, { type: "key/add", params: { id: "cam", path: "zoom", at: 2, value: 1.5 } });
    run(exec, { type: "key/update", params: { id: "cam", path: "x", at: 1.3, value: 240 } });
    const keys = [...exec.state().items.values()].filter((i) => i.parent === "cam" && i.kind === "keyframe");
    expect(keys.map((k) => [k.props.property, k.start, k.props.value])).toEqual([
      ["camera.x", 1, 0],
      ["camera.x", 1.3, 240],
      ["camera.zoom", 0, 1],
      ["camera.zoom", 2, 1.5],
    ]);
    expect(load(saved(VIDEO, exec)).errors).toEqual([]);
    const bad = exec.execute({ type: "key/add", params: { id: "cam", path: "box.x", at: 0, value: 1 } });
    expect(bad.ok ? "" : bad.errors?.[0]?.message).toContain("cannot hold keys on a camera");
  });
});

describe("tracks moving around a camera", () => {
  const moved = (action: Parameters<Executor["execute"]>[0]) => {
    const exec = editor(VIDEO);
    run(exec, action);
    const text = saved(VIDEO, exec);
    const state = load(text);
    expect(state.errors).toEqual([]);
    expect(order(state)).toEqual(order(exec.state()));
    exec.undo();
    expect(saved(VIDEO, exec)).toBe(VIDEO);
    return order(state);
  };

  it("a track moved above one of the camera's joins it", () => {
    expect(moved({ type: "track/reorder", params: { trackId: "logo", position: 2 } })).toEqual([
      "under",
      "speaker*",
      "logo*",
      "cards*",
    ]);
  });

  it("a track moved to the bottom leaves it", () => {
    expect(moved({ type: "track/reorder", params: { trackId: "cards", position: 0 } })).toEqual([
      "cards",
      "under",
      "speaker*",
      "logo",
    ]);
  });

  it("at the camera's edge, `camera` decides", () => {
    // Above the camera's top track: inside by default, outside when told.
    expect(moved({ type: "track/reorder", params: { trackId: "under", position: 2 } })).toEqual([
      "speaker*",
      "cards*",
      "under*",
      "logo",
    ]);
    expect(moved({ type: "track/reorder", params: { trackId: "under", position: 2, camera: false } })).toEqual([
      "speaker*",
      "cards*",
      "under",
      "logo",
    ]);
    // Below the camera's bottom track: outside by default, inside when told.
    expect(moved({ type: "track/reorder", params: { trackId: "logo", position: 1 } })).toEqual([
      "under",
      "logo",
      "speaker*",
      "cards*",
    ]);
    expect(moved({ type: "track/reorder", params: { trackId: "logo", position: 1, camera: true } })).toEqual([
      "under",
      "logo*",
      "speaker*",
      "cards*",
    ]);
  });

  it("a new track goes on top, outside the camera, unless it is given a place", () => {
    expect(moved({ type: "track/add", params: { trackId: "over", layout: "free" } })).toEqual([
      "under",
      "speaker*",
      "cards*",
      "logo",
      "over",
    ]);
    expect(moved({ type: "track/add", params: { trackId: "mid", layout: "free", position: 2 } })).toEqual([
      "under",
      "speaker*",
      "mid*",
      "cards*",
      "logo",
    ]);
  });

  it("a removed track comes back inside the camera", () => {
    const exec = editor(VIDEO);
    run(exec, { type: "track/remove", params: { trackId: "speaker" } });
    expect(order(exec.state())).toEqual(["under", "cards*", "logo"]);
    exec.undo();
    expect(order(exec.state())).toEqual(["under", "speaker*", "cards*", "logo"]);
    expect(saved(VIDEO, exec)).toBe(VIDEO);
  });
});

describe("lint with a camera", () => {
  const rules = (text: string) => lint(text, { manifest }).map((d) => `${d.rule} ${d.id ?? ""}`.trim());

  it("is clean for the camera file", () => {
    expect(rules(VIDEO)).toEqual([]);
  });

  it("still finds a gap on the bottom sequence track when that track is the camera's", () => {
    const text = file(`      <Camera id="cam" zoom={1.2}>
        <Track id="speaker">
          <Clip id="talk" src="asset:interview" in={2} out={6} />
          <Gap id="hole" duration={1} />
          <Clip id="more" src="asset:interview" in={6} out={8} />
        </Track>
      </Camera>`).replace("Camera, Clip,", "Camera, Clip, Gap,");
    expect(rules(text)).toEqual(["sequence-gap hole"]);
  });

  it("counts a camera's track as a track written before clips straight in the composition", () => {
    const text = file(`      <Camera id="cam" zoom={1.2}>
        <Track id="cards" layout="free">
          ${CARD("card")}
        </Track>
      </Camera>
      <Clip id="late" src="asset:interview" in={2} out={6} />`);
    expect(rules(text)).toEqual(["main-clips-first late"]);
  });

  it("reports HTML written straight in a camera", () => {
    const text = file(`      <Camera id="cam">
        <div>loose</div>
        <Track id="cards" layout="free">
          ${CARD("card")}
        </Track>
      </Camera>`);
    expect(rules(text)).toContain("stray-html");
  });
});
