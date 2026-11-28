import { describe, expect, expectTypeOf, it } from "vitest";

import { KIT_ELEMENTS, type TextRun } from "@uberscene/kit/schema";
import {
  buildSourceIndex,
  collectModule,
  DEPRECATIONS,
  Executor,
  loadModule,
  type PlacedTitle,
  placed,
  type ResolvedState,
  resolve,
  restSizeOf,
  SDK_ELEMENTS,
  sdkElement,
} from "@uberscene/sdk";

import { manifest } from "./helpers";

// The SDK's part of a kind with a folder of its own (`src/elements/<kind>/`): what a title's placement holds from
// the file besides its props, a shape's size at rest, and each kind's old spellings.

const file = (inside: string) => `import { Composition, Mark, Shape, Sticker, Svg, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1000} height={600}>
      <Track id="over" layout="free">
        ${inside}
      </Track>
    </Composition>
  );
}
`;

const tree = (text: string) => collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) });
const load = (inside: string): ResolvedState => resolve(tree(file(inside)), manifest);

describe("the kinds with a folder of their own", () => {
  it("have a part in the SDK for every kind the kit lists", () => {
    expect(Object.keys(SDK_ELEMENTS).sort()).toEqual(Object.keys(KIT_ELEMENTS).sort());
    for (const [kind, element] of Object.entries(SDK_ELEMENTS)) expect(element.kind).toBe(kind);
    expect(sdkElement("title")).toBe(SDK_ELEMENTS.title);
    expect(sdkElement("clip")).toBeUndefined();
  });
});

describe("a title's words", () => {
  it("are on its placement, with the runs its marks make", () => {
    const state = load(`<Title id="t" start={0} duration={2}>Hello <Mark color="#ff0000">there</Mark></Title>`);
    const title = placed(state.items.get("t"), "title");
    expectTypeOf(title).toEqualTypeOf<PlacedTitle | undefined>();
    expectTypeOf<PlacedTitle["text"]>().toEqualTypeOf<string>();
    expectTypeOf<PlacedTitle["runs"]>().toEqualTypeOf<readonly TextRun[]>();
    expect(title?.text).toBe("Hello there");
    expect(title?.runs).toEqual([{ from: 6, to: 11, color: "#ff0000" }]);
    // Any placement can be asked: one whose kind has no words has none.
    expect(state.items.get("over")?.text).toBeUndefined();
  });

  it("are empty, not missing, on a title with nothing written inside", () => {
    const title = placed(load(`<Title id="t" start={0} duration={2} />`).items.get("t"), "title");
    expect(title?.text).toBe("");
    expect(title?.runs).toEqual([]);
  });

  it("give a new placement when they change, and the same one when they do not", () => {
    const text = file(
      `<Title id="t" start={0} duration={2}>One</Title><Title id="u" start={0} duration={2}>Two</Title>`,
    );
    const exec = new Executor({ tree: tree(text), manifest });
    const before = exec.state();
    expect(exec.execute({ type: "text/setContent", params: { id: "t", text: "Changed" } }).ok).toBe(true);
    const after = exec.state();
    expect(after.items.get("t")).not.toBe(before.items.get("t"));
    expect(after.items.get("t")?.text).toBe("Changed");
    expect(after.items.get("u")).toBe(before.items.get("u"));
    expect(exec.undo()?.ok).toBe(true);
    expect(exec.state().items.get("t")?.text).toBe("One");
  });
});

describe("a shape's size at rest", () => {
  it("is its width and height, 200 each when left out, and only a kind that says one has one", () => {
    const state = load(
      `<Shape id="s" start={0} duration={2} type="rectangle" width={120} />
       <Title id="t" start={0} duration={2}>Hi</Title>`,
    );
    expect(restSizeOf(state.items.get("s")!)).toEqual({ width: 120, height: 200 });
    expect(restSizeOf(state.items.get("t")!)).toBeUndefined();
  });

  it("is not said of a shape whose props did not parse", () => {
    const state = load(`<Shape id="s" start={0} duration={2} width={120} />`);
    expect(state.items.get("s")?.parsed).toBe(false);
    expect(restSizeOf(state.items.get("s")!)).toBeUndefined();
  });
});

describe("old spellings", () => {
  const messages = (state: ResolvedState) => state.errors.map((e) => e.message);

  it("are said by the kind: a title's look moved into style, a shape's `shape` is `type`", () => {
    expect(messages(load(`<Title id="t" start={0} duration={2} size={64} width={400}>Hi</Title>`))).toEqual([
      "`size` is now `style.size`, `width` is now `box.width`; uberscene lint --fix moves the file",
    ]);
    expect(messages(load(`<Shape id="s" start={0} duration={2} shape="rectangle" />`))).toContain(
      "`shape` is now `type`; uberscene lint --fix moves the file",
    );
  });

  it("an svg's colour `mode` is `type`", () => {
    const written = `<Svg id="v" start={0} duration={2} content="<svg/>" color={{ mode: "tint", tint: "#ff0000" }} />`;
    expect(messages(load(written))).toContain("`color.mode` is now `color.type`; uberscene lint --fix moves the file");
  });

  it("have a lint row for every key a kind says it renamed", () => {
    const rows = new Set(DEPRECATIONS.map((d) => `${d.element} ${d.prop}`));
    for (const row of [
      "Title animation.preset",
      "Title style.stroke.width",
      "Title size",
      "Shape shape",
      "Shape stroke.width",
      "Svg color.mode",
    ])
      expect(rows, row).toContain(row);
  });
});

describe("what a kind says of being followed", () => {
  const follower = `<Shape id="s" start={0} duration={2} type="rectangle" follow="v" />`;

  it("an SVG read from a file cannot be, and one written inline can", () => {
    const fromFile = load(`<Svg id="v" start={0} duration={2} src="asset:logo" />${follower}`);
    expect(fromFile.errors.map((e) => e.message)).toContain(
      'follow names "v", an SVG read from a file: its size is only known once it is drawn, so it can\'t be followed yet; write its markup in `content`, or follow a shape',
    );
    const inline = load(`<Svg id="v" start={0} duration={2} content="<svg/>" />${follower}`);
    expect(inline.errors).toEqual([]);
    expect(SDK_ELEMENTS.svg.cannotBeFollowed?.({ content: "<svg/>" })).toBeUndefined();
  });
});
