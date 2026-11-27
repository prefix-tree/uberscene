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

// A shape's own values that change: size, colours, outline and points, written as keys (and, for the numbers, as
// generators) on the shape's props.

const file = (props: string, theme = "") => `import { Clip, Composition, Shape, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1000} height={600}${theme}>
      <Track id="cards" layout="free">
        <Shape id="dot" start={1} duration={4} type="ellipse" ${props} />
      </Track>
      <Track id="main">
        <Clip id="talk" src="asset:interview" in={2} out={6} />
      </Track>
    </Composition>
  );
}
`;

const load = (text: string): ResolvedState =>
  resolve(collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }), manifest);

/** The keys and generators under the dot, each as `property at value`. */
const keys = (state: ResolvedState) =>
  [...state.items.values()]
    .filter((i) => i.parent === "dot" && (i.kind === "keyframe" || i.kind === "generator"))
    .map((i) =>
      i.kind === "generator"
        ? `${String(i.props.property)} ${String(i.props.type)}`
        : `${String(i.props.property)} ${String(i.props.at)} ${JSON.stringify(i.props.value)}`,
    );

const errors = (text: string) => load(text).errors.map((e) => `${e.code} ${e.id} ${e.prop ?? ""}`.trim());

describe("keys on a shape's own values", () => {
  it("become items named shape.<path>, with the first key left as the constant", () => {
    const state = load(
      file(`width={[{ at: 0, value: 40 }, { at: 1, value: 120 }]} height={80}
          fill={[{ at: 0, value: "#ff0000" }, { at: 2, value: "#0000ff" }]}
          stroke={{ color: [{ at: 0, value: "white" }, { at: 1, value: "black" }], thickness: 4,
            dashArray: [300], dashOffset: [{ at: 0, value: 300 }, { at: 1, value: 0 }] }}`),
    );
    expect(state.errors).toEqual([]);
    expect(keys(state)).toEqual([
      "shape.width 0 40",
      "shape.width 1 120",
      'shape.fill 0 "#ff0000"',
      'shape.fill 2 "#0000ff"',
      'shape.stroke.color 0 "white"',
      'shape.stroke.color 1 "black"',
      "shape.stroke.dashOffset 0 300",
      "shape.stroke.dashOffset 1 0",
    ]);
    const props = state.items.get("dot")?.props as Record<string, unknown>;
    expect(props.width).toBe(40);
    expect(props.fill).toBe("#ff0000");
    expect(props.stroke).toMatchObject({ color: "white", thickness: 4, dashOffset: 300 });
  });

  it("keys a polygon's points, and leaves points with no keys alone", () => {
    const tri = "[{ x: 0.5, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]";
    const flat = "[{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }, { x: 0.5, y: 0.5 }]";
    const state = load(
      file(`points={[{ at: 0, value: ${tri} }, { at: 1, value: ${flat} }]}`).replace("ellipse", "polygon"),
    );
    expect(state.errors).toEqual([]);
    expect(keys(state)).toHaveLength(2);
    expect(keys(state)[0]).toMatch(/^shape\.points 0 \[/);
    const still = load(file(`points={${tri}}`).replace("ellipse", "polygon"));
    expect(keys(still)).toEqual([]);
    expect(still.items.get("dot")?.props.points).toEqual([
      { x: 0.5, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);
  });

  it("takes a generator on a number, and a wobble on a thickness with no base is around 0", () => {
    const state = load(
      file(
        `width={{ type: "wiggle", amount: 10, base: 100 }} stroke={{ color: "#fff", thickness: { type: "wiggle", amount: 2 } }}`,
      ),
    );
    expect(state.errors).toEqual([]);
    expect(keys(state)).toEqual(["shape.width wiggle", "shape.stroke.thickness wiggle"]);
    expect(state.items.get("dot")?.props.width).toBe(100);
    expect(state.items.get("dot")?.props.stroke).toMatchObject({ thickness: 0 });
  });

  it("resolves theme tokens in a key, and a theme preset's fill does not show through a keyed one", () => {
    const theme = ` theme={{ styles: { shape: { default: { fill: "#00ff00" } } } }}`;
    const state = load(file(`fill={[{ at: 0, value: "$primary" }, { at: 1, value: "#123456" }]}`, theme));
    expect(state.errors).toEqual([]);
    const first = [...state.items.values()].find((i) => i.id === "dot.fill.0");
    expect(String(first?.props.value)).toMatch(/^#|^rgb|^oklch|^hsl/);
    expect(state.items.get("dot")?.props.fill).not.toBe("#00ff00");
  });
});

describe("what a shape key refuses", () => {
  it("a value of the wrong kind, at the key that holds it", () => {
    expect(errors(file(`width={[{ at: 0, value: 40 }, { at: 1, value: -3 }]}`))).toEqual(["SCHEMA dot width.1.value"]);
    expect(errors(file(`fill={[{ at: 0, value: "#ff0000" }, { at: 1, value: "not a colour" }]}`))).toEqual([
      "SCHEMA dot fill.1.value",
    ]);
    expect(
      errors(
        file(`points={[{ at: 0, value: [{ x: 0, y: 0 }] }, { at: 1, value: [1, 2] }]}`).replace("ellipse", "path"),
      ),
    ).toEqual(["SCHEMA dot points.1.value"]);
  });

  it("a generator on a colour", () => {
    expect(errors(file(`fill={{ type: "wiggle", amount: 2 }}`))).toEqual(["SCHEMA dot fill"]);
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

describe("the key actions on a shape", () => {
  it("add a key on fill, the constant becoming the first key, and write it to the file", () => {
    const text = file(`fill="#ff0000"`);
    const exec = editor(text);
    const result = exec.execute({ type: "key/add", params: { id: "dot", path: "fill", at: 2, value: "#0000ff" } });
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(keys(exec.state())).toEqual(['shape.fill 0 "#ff0000"', 'shape.fill 2 "#0000ff"']);
    const out = saved(text, exec);
    expect(out).toContain(`{ at: 2, value: "#0000ff" }`);
    expect(keys(load(out))).toEqual(keys(exec.state()));
  });

  it("key a stroke's thickness inside the stroke", () => {
    const text = file(`stroke={{ color: "#fff", thickness: 2 }}`);
    const exec = editor(text);
    const result = exec.execute({ type: "key/add", params: { id: "dot", path: "stroke.thickness", at: 1, value: 8 } });
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(keys(exec.state())).toEqual(["shape.stroke.thickness 0 2", "shape.stroke.thickness 1 8"]);
  });

  it("refuse a shape path on another element, and a value of the wrong kind", () => {
    const exec = editor(file(`fill="#ff0000"`));
    const onClip = exec.execute({ type: "key/add", params: { id: "talk", path: "fill", at: 1, value: "#000" } });
    expect(onClip.ok ? "" : onClip.errors?.[0]?.message).toContain("only on a shape");
    const bad = exec.execute({ type: "key/add", params: { id: "dot", path: "width", at: 1, value: "big" } });
    expect(bad.ok ? "" : bad.errors?.[0]?.message).toContain("number of pixels");
  });

  it("refuse a path the element's kind does not have, naming the ones it does", () => {
    const exec = editor(file(`fill="#ff0000"`));
    const message = (id: string, path: string, value: number) => {
      const r = exec.execute({ type: "key/add", params: { id, path, at: 1, value } });
      return r.ok ? "" : (r.errors?.[0]?.message ?? "");
    };
    // A shape makes no sound and plays at one speed; a clip does both.
    expect(message("dot", "volume", 0.5)).toBe(
      '"volume" cannot hold keys on a shape; use one of transform.scale, transform.scale.x, transform.scale.y, ' +
        "transform.rotation, transform.opacity, transform.anchor.x, transform.anchor.y, transform.borderRadius, " +
        "transform.crop.x, transform.crop.y, transform.crop.width, transform.crop.height, box.x, box.y, width, height, " +
        "fill, points, stroke.color, stroke.thickness, stroke.dashOffset, or effects.<n>.<param>",
    );
    expect(message("dot", "speed", 2)).toContain('"speed" cannot hold keys on a shape');
    expect(message("talk", "volume", 0.5)).toBe("");
    expect(message("talk", "speed", 2)).toBe("");
    expect(message("talk", "nope", 1)).toContain('"nope" cannot hold keys on a clip; use one of transform.scale,');
  });

  it("split a shape mid-way through a colour and a morph at what is drawn there", () => {
    const sq = "[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]";
    const wide = "[{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 3 }]";
    const text = file(
      `fill={[{ at: 0, value: "#ff0000" }, { at: 2, value: "#0000ff" }]} points={[{ at: 0, value: ${sq} }, { at: 2, value: ${wide} }]}`,
    ).replace("ellipse", "polygon");
    const exec = editor(text);
    const result = exec.execute({ type: "clip/split", params: { id: "dot", at: 2, newId: "dot_b" } });
    expect(result.ok ? [] : result.errors).toEqual([]);
    const fill = exec.state().items.get("dot_b.fill.0")?.props.value;
    // Half way from red to blue in OKLab: a purple, not the muddy #800080 of the sRGB numbers.
    expect(fill).toBe("#8c53a2");
    expect(exec.state().items.get("dot_b.points.0")?.props.value).toEqual([
      { x: 0, y: 0 },
      { x: 1.5, y: 0 },
      { x: 1, y: 2 },
    ]);
  });
});
