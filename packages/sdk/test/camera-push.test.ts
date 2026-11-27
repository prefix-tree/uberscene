import { describe, expect, it } from "vitest";

import {
  buildSourceIndex,
  collectModule,
  Executor,
  foldToSource,
  loadModule,
  type ResolvedState,
  resolve,
} from "@uberscene/sdk";

import { manifest } from "./helpers";

// A 1000 by 600 frame, so the default margin is 30 px: the view holds x from 30 to 970 and y from 30 to 570.
const file = (
  camera: string,
  cards: string,
) => `import { Camera, Clip, Composition, Shape, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1000} height={600}>
      <Camera id="cam" ${camera}>
        <Track id="subject" layout="free">
          <Shape id="speaker" start={0} duration={6} type="rectangle" width={200} height={200}
            box={{ x: 500, y: 300, origin: "center" }} />
        </Track>
        <Track id="cards" layout="free">
          ${cards}
        </Track>
      </Camera>
      <Track id="brand" layout="free">
        <Shape id="mark" start={0} duration={6} type="rectangle" width={40} height={40} box={{ x: 40, y: 40, origin: "center" }} />
      </Track>
    </Composition>
  );
}
`;

const card = (id: string, start: number, x: number, w = 100, y = 300) =>
  `<Shape id="${id}" start={${start}} duration={${6 - start}} type="rectangle" width={${w}} height={100} box={{ x: ${x}, y: ${y}, origin: "center" }} />`;

const load = (text: string): ResolvedState =>
  resolve(collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }), manifest);

/** The camera's keys, as `field at value easing`, in the order the resolver made them. */
const keysOf = (state: ResolvedState) =>
  [...state.items.values()]
    .filter((i) => i.kind === "keyframe" && i.parent === "cam")
    .map((k) => `${String(k.props.property).replace("camera.", "")} ${k.start} ${k.props.value} ${k.props.easing}`);

const pushed = (push: string, cards: string, more = "") => load(file(`${more} push={${push}}`, cards));

describe("a camera that makes room", () => {
  it("does not move for an element that is already in view", () => {
    const state = pushed(`{ on: ["a"] }`, card("a", 1, 800));
    expect(state.errors).toEqual([]);
    expect(keysOf(state)).toEqual([]);
  });

  it("pans the shortest way to an element past the edge, as that element starts", () => {
    // The card spans 1050 to 1150: the view's right edge, 970, has to reach 1150.
    const state = pushed(`{ on: ["a"] }`, card("a", 2, 1100));
    expect(state.errors).toEqual([]);
    expect(keysOf(state)).toEqual(["x 2 0 snappy", "x 2.3 180 linear"]);
  });

  it("pans up or down the same way", () => {
    // The card spans y 600 to 700: the view's bottom, 570, has to reach 700.
    const state = pushed(`{ on: ["a"] }`, card("a", 1, 500, 100, 650));
    expect(keysOf(state)).toEqual(["y 1 0 snappy", "y 1.3 130 linear"]);
  });

  it("pulls back, only as far as it must, when everything cannot fit", () => {
    // The speaker (from 400) and a card out to 1470 are 1070 px, in a room of 940.
    const state = pushed(`{ on: ["a"] }`, card("a", 1, 1420));
    expect(keysOf(state)).toEqual(["x 1 0 snappy", "x 1.3 435 linear", "zoom 1 1 snappy", "zoom 1.3 0.879 linear"]);
  });

  it("holds everything on screen under the camera, or only what `keep` names", () => {
    // A card far to the left is on screen from the start, and is not one the camera makes room for.
    const cards = `${card("far", 0, -300)}\n${card("a", 1, 1100)}`;
    // Everything: from -350 to 1150, 1500 px, so the view pulls back.
    expect(keysOf(pushed(`{ on: ["a"] }`, cards)).filter((k) => k.startsWith("zoom"))).toEqual([
      "zoom 1 1 snappy",
      "zoom 1.3 0.627 linear",
    ]);
    // Only the speaker and the card: 400 to 1150 fits, so it pans and lets the far card go.
    expect(keysOf(pushed(`{ on: ["a"], keep: ["speaker"] }`, cards))).toEqual(["x 1 0 snappy", "x 1.3 180 linear"]);
  });

  it("makes one move after another, each from where the last one ended", () => {
    const state = pushed(`{ on: ["a", "b"], keep: ["speaker"] }`, `${card("a", 1, 1100)}\n${card("b", 3, -100)}`);
    // First to the right (1150 at the right margin); then -150 to 1150 is 1300 px, so back to the middle and out.
    expect(keysOf(state)).toEqual([
      "x 1 0 snappy",
      "x 1.3 180 linear",
      "x 3 180 snappy",
      "x 3.3 0 linear",
      "zoom 3 1 snappy",
      "zoom 3.3 0.723 linear",
    ]);
  });

  it("treats elements that start together as one move, and follows the file's times, not its order", () => {
    const together = pushed(`{ on: ["b", "a"] }`, `${card("a", 2, 1100)}\n${card("b", 2, 1200)}`);
    expect(keysOf(together).filter((k) => k.startsWith("x"))).toEqual(["x 2 0 snappy", "x 2.3 280 linear"]);
  });

  it("takes its time and its easing from the push", () => {
    const state = pushed(`{ on: ["a"], duration: 0.5, easing: "easeOut" }`, card("a", 2, 1100));
    expect(keysOf(state)).toEqual(["x 2 0 easeOut", "x 2.5 180 linear"]);
  });

  it("takes its margin from the push", () => {
    const state = pushed(`{ on: ["a"], margin: 0 }`, card("a", 2, 1100));
    expect(keysOf(state)).toEqual(["x 2 0 snappy", "x 2.3 150 linear"]);
  });

  it("starts from the view as written, and never closes in past its zoom", () => {
    // At zoom 2 the room is 470 px of the composition; the speaker (from 400) and a card out to 950 are 550.
    const state = pushed(`{ on: ["a"] }`, card("a", 1, 900), "zoom={2} x={0}");
    const zooms = keysOf(state).filter((k) => k.startsWith("zoom"));
    expect(zooms[0]).toBe("zoom 1 2 snappy");
    expect(Number(zooms[1]?.split(" ")[2])).toBeLessThan(2);
    expect(state.items.get("cam")?.props.zoom).toBe(2);
  });

  it("follows a card that moves", () => {
    const near = keysOf(pushed(`{ on: ["a"] }`, card("a", 2, 1100)));
    const far = keysOf(pushed(`{ on: ["a"] }`, card("a", 2, 1200)));
    expect(near[1]).toBe("x 2.3 180 linear");
    expect(far[1]).toBe("x 2.3 280 linear");
  });

  it("takes a title with no size as the point it is placed at", () => {
    const state = pushed(
      `{ on: ["t"] }`,
      `<Title id="t" start={1} duration={2} box={{ x: 1100, y: 300, origin: "center" }}>Hi</Title>`,
    );
    expect(keysOf(state)).toEqual(["x 1 0 snappy", "x 1.3 130 linear"]);
  });
});

describe("what a push refuses", () => {
  const errors = (state: ResolvedState) => state.errors.map((e) => `${e.code} ${e.id} ${e.prop}: ${e.message}`);

  it("an element that does not exist, or that the camera does not move", () => {
    expect(errors(pushed(`{ on: ["nobody"] }`, card("a", 1, 800)))).toEqual([
      'UNKNOWN_REF cam push: push.on names "nobody", which does not exist',
    ]);
    expect(errors(pushed(`{ on: ["a"], keep: ["mark"] }`, card("a", 1, 800)))).toEqual([
      `WRONG_SCOPE cam push: push.keep names "mark", which is not on one of the camera's tracks: the camera does not move it`,
    ]);
  });

  it("keys of its own on x, y or zoom", () => {
    const state = pushed(`{ on: ["a"] }`, card("a", 1, 1100), "x={[{ at: 0, value: 0 }, { at: 1, value: 50 }]}");
    expect(errors(state)).toEqual([
      "SCHEMA cam push: push sets the camera's x, y and zoom, and x has keys of its own: write it as a number (where the view starts), or turn the push into keys with camera/bakePush",
    ]);
  });

  it("but not keys on its rotation", () => {
    const state = pushed(`{ on: ["a"] }`, card("a", 1, 1100), "rotation={[{ at: 0, value: 0 }, { at: 1, value: 5 }]}");
    expect(state.errors).toEqual([]);
    expect(keysOf(state).filter((k) => k.startsWith("x"))).toEqual(["x 1 0 snappy", "x 1.3 180 linear"]);
  });
});

// ── editing ─────────────────────────────────────────────────────────────────

const editor = (text: string): Executor =>
  new Executor({ tree: collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }), manifest });

const saved = (text: string, exec: Executor): string => {
  const result = foldToSource(text, exec.log(), exec.state());
  expect(result.skipped).toEqual([]);
  return result.text;
};

const run = (exec: Executor, action: Parameters<Executor["execute"]>[0]): void => {
  const result = exec.execute(action);
  expect(result.ok ? [] : result.errors).toEqual([]);
};

describe("editing a push", () => {
  const PLAIN = file("zoom={1}", `${card("a", 1, 1100)}\n${card("b", 3, -100)}`);
  const PUSHED = file(`push={{ on: ["a", "b"], keep: ["speaker"] }}`, `${card("a", 1, 1100)}\n${card("b", 3, -100)}`);

  it("is set on a camera, written to the file, and undone", () => {
    const exec = editor(PLAIN);
    run(exec, { type: "camera/setPush", params: { cameraId: "cam", push: { on: ["a"], keep: ["speaker"] } } });
    expect(keysOf(exec.state())).toEqual(["x 1 0 snappy", "x 1.3 180 linear"]);
    const text = saved(PLAIN, exec);
    expect(text).toContain(`push={{ on: ["a"], keep: ["speaker"] }}`);
    expect(keysOf(load(text))).toEqual(keysOf(exec.state()));
    exec.undo();
    expect(saved(PLAIN, exec)).toBe(PLAIN);
  });

  it("is taken off with null", () => {
    const exec = editor(PUSHED);
    run(exec, { type: "camera/setPush", params: { cameraId: "cam", push: null } });
    expect(keysOf(exec.state())).toEqual([]);
    expect(saved(PUSHED, exec)).not.toContain("push=");
  });

  it("follows a card an edit moves", () => {
    const exec = editor(PUSHED);
    expect(keysOf(exec.state())[1]).toBe("x 1.3 180 linear");
    run(exec, { type: "box/update", params: { id: "a", box: { x: 1200 } } });
    expect(keysOf(exec.state())[1]).toBe("x 1.3 280 linear");
  });

  it("bakes into keys that draw the same moves, and then stops following", () => {
    const exec = editor(PUSHED);
    const before = keysOf(exec.state());
    run(exec, { type: "camera/bakePush", params: { cameraId: "cam" } });
    const text = saved(PUSHED, exec);
    expect(text).not.toContain("push=");
    expect(text).toContain(`{ at: 1, value: 0, easing: "snappy" }`);
    const baked = load(text);
    expect(baked.errors).toEqual([]);
    // The same keys, now the file's own: ordered by the prop that wrote them.
    expect(keysOf(baked).sort()).toEqual([...before].sort());

    run(exec, { type: "box/update", params: { id: "a", box: { x: 1200 } } });
    expect(keysOf(exec.state()).sort()).toEqual([...before].sort());
  });

  it("undoes a bake back to the push", () => {
    const exec = editor(PUSHED);
    run(exec, { type: "camera/bakePush", params: { cameraId: "cam" } });
    exec.undo();
    expect(saved(PUSHED, exec)).toBe(PUSHED);
    expect(exec.state().items.get("cam")?.props.push).toBeDefined();
  });

  it("refuses keys on what the push sets, and takes them on rotation", () => {
    const exec = editor(PUSHED);
    const bad = exec.execute({ type: "key/add", params: { id: "cam", path: "x", at: 0, value: 10 } });
    expect(bad.ok ? "" : bad.errors?.[0]?.message).toContain("camera/bakePush");
    run(exec, { type: "key/add", params: { id: "cam", path: "rotation", at: 0, value: 0 } });
  });

  it("refuses to bake a camera with no push", () => {
    const exec = editor(PLAIN);
    const bad = exec.execute({ type: "camera/bakePush", params: { cameraId: "cam" } });
    expect(bad.ok ? "" : bad.errors?.[0]?.message).toContain("has no push");
  });
});
