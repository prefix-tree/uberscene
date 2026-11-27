import {
  type AudioProps,
  DERIVED_KINDS,
  type DerivedKind,
  ELEMENTS,
  type ElementKind,
  isKind,
  KIND_CAPABILITIES,
  type Kind,
  type KindProps,
  type KindWith,
  type NestedProps,
  type PlacedProps,
  SCHEMAS_BY_KIND,
  type TitleProps,
} from "@uberscene/kit/schema";

describe("the closed list of kinds", () => {
  it("is the tags a file writes and the items the resolver makes, and nothing else", () => {
    expectTypeOf<Kind>().toEqualTypeOf<ElementKind | DerivedKind>();
    const written = Object.values(ELEMENTS).map((component) => component.kind);
    expect(Object.keys(KIND_CAPABILITIES).sort()).toEqual([...new Set([...written, ...DERIVED_KINDS])].sort());
    expect(Object.keys(SCHEMAS_BY_KIND).sort()).toEqual(Object.keys(KIND_CAPABILITIES).sort());
  });

  it("tells a kind from any other text", () => {
    expect(isKind("title")).toBe(true);
    expect(isKind("titel")).toBe(false);
    // A key every object has is not a kind.
    expect(isKind("toString")).toBe(false);
    expect(isKind("constructor")).toBe(false);
  });

  it("gives each kind the props its schema parses to", () => {
    expectTypeOf<KindProps["title"]>().toEqualTypeOf<TitleProps>();
    // A default the schema sets is there once parsed: no `?? 48` after it.
    expectTypeOf<TitleProps["style"]>().not.toBeUndefined();
    expectTypeOf<NestedProps["volume"]>().toEqualTypeOf<number>();
    // A key list is taken out before parsing, so a parsed prop holds the constant or nothing.
    expectTypeOf<AudioProps["volume"]>().toEqualTypeOf<number | undefined>();
    // A layer is told apart by its engine.
    expectTypeOf<Extract<KindProps["layer"], { engine: "three" }>>().toHaveProperty("camera");
  });

  it("names the kinds that have a prop", () => {
    expectTypeOf<"title">().toMatchTypeOf<KindWith<"transform">>();
    expectTypeOf<"clip">().toMatchTypeOf<KindWith<"transform">>();
    expectTypeOf<KindWith<"follow">>().toEqualTypeOf<"title" | "shape" | "svg" | "sticker" | "layer">();
    expectTypeOf<KindWith<"text">>().toEqualTypeOf<"caption">();
    // What is placed has a box and a transform; a sound does not.
    expectTypeOf<TitleProps>().toMatchTypeOf<PlacedProps>();
    expectTypeOf<"audio">().not.toMatchTypeOf<KindWith<"transform">>();
  });
});
