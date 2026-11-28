import { describe, expect, expectTypeOf, it } from "vitest";

import type { ShapeProps, TitleProps } from "@uberscene/kit/schema";
import {
  collectModule,
  hasProp,
  loadModule,
  type Placed,
  type PlacedShape,
  type PlacedTitle,
  type Placement,
  placed,
  type ResolvedState,
  resolve,
  typed,
  type Unparsed,
} from "@uberscene/sdk";

import { manifest } from "./helpers";

// A placement typed by its kind is the loose placement seen through its kind: `placed`, `typed` and `hasProp` narrow
// it, and then its props are its kind's, read with no cast. Most of what is checked here is checked by the compiler.

const text = `import { Audio, Clip, Composition, Shape, Sticker, Three, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Clip id="c" src="asset:city" in={0} out={2} />
      <Track id="music" layout="free">
        <Audio id="a" start={0} src="asset:bed" in={0} out={2} />
      </Track>
      <Track id="over" layout="free">
        <Title id="t" start={0} duration={2} style={{ size: 64 }}>Hi</Title>
        <Shape id="s" start={0} duration={2} type="rectangle" width={100} height={50} />
        <Three id="three" start={0} duration={2} camera={{ fov: 40 }} />
        <Sticker id="broken" start={0} duration={2} />
      </Track>
    </Composition>
  );
}
`;
const state: ResolvedState = resolve(collectModule(loadModule(text) as never), manifest);
const item = (id: string): Placement => state.items.get(id) as Placement;

describe("a placement typed by its kind", () => {
  it("is the placement itself, with its kind's props", () => {
    const title = placed(item("t"), "title");
    expectTypeOf(title).toEqualTypeOf<PlacedTitle | undefined>();
    expect(title).toBe(item("t"));
    // A number, with no cast and no default written again.
    expectTypeOf(title?.props.style.size).toEqualTypeOf<number | undefined>();
    expect(title?.props.style.size).toBe(64);
    expectTypeOf<PlacedTitle["props"]>().toEqualTypeOf<Readonly<TitleProps>>();
    expectTypeOf<PlacedShape["props"]>().toEqualTypeOf<Readonly<ShapeProps>>();
    // @ts-expect-error a prop a title does not have is a mistake the compiler names
    expect(title?.props.stlye).toBeUndefined();
  });

  it("is undefined for another kind, a missing element and one that did not parse", () => {
    expect(placed(item("s"), "title")).toBeUndefined();
    expect(placed(state.items.get("nothing"), "title")).toBeUndefined();
    expect(item("broken").parsed).toBe(false);
    expect(placed(item("broken"), "sticker")).toBeUndefined();
  });

  it("narrows by its kind once it is known to have parsed", () => {
    const p = typed(item("s"));
    expectTypeOf(p).toEqualTypeOf<Placed | Unparsed>();
    if (p.kind === "shape" && p.parsed) {
      expectTypeOf(p).toEqualTypeOf<PlacedShape>();
      expectTypeOf(p.props.width).toEqualTypeOf<number | undefined>();
      expect(p.props.type).toBe("rectangle");
    } else throw new Error("the shape parsed");
    const broken = typed(item("broken"));
    // The kind alone says nothing of props that did not parse: they stay unknown.
    if (!broken.parsed) expectTypeOf(broken.props).toEqualTypeOf<Readonly<Record<string, unknown>>>();
    expect(broken.parsed).toBe(false);
  });

  it("narrows to the kinds that have a prop, asking the schema", () => {
    const withTransform = [...state.items.values()].filter((p) => hasProp(p, "transform")).map((p) => p.id);
    expect(withTransform.sort()).toEqual(["c", "s", "t", "three"]);
    const s = item("s");
    if (hasProp(s, "transform")) expectTypeOf(s.props.transform?.rotation).toEqualTypeOf<number | undefined>();
    expect(hasProp(item("a"), "volume")).toBe(true);
    expect(hasProp(item("a"), "transform")).toBe(false);
    // A layer a library draws has that library's props.
    expect(hasProp(item("three"), "camera")).toBe(true);
    expect(hasProp(item("s"), "camera")).toBe(false);
    // An element that did not parse has no props to read as any kind's.
    expect(hasProp(item("broken"), "transform")).toBe(false);
  });

  it("goes wherever a placement does", () => {
    const loose = (p: Placement): string => p.id;
    const title = placed(item("t"), "title");
    if (!title) throw new Error("the title parsed");
    // Code that has not been typed by kind yet takes a typed placement as it is.
    expect(loose(title)).toBe("t");
    expectTypeOf<PlacedTitle>().toMatchTypeOf<Placement>();
    expectTypeOf<Placed>().toMatchTypeOf<Placement>();
  });
});
