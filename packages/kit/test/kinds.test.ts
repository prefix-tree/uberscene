import {
  type AudioProps,
  capabilitiesOf,
  DERIVED_KINDS,
  type DerivedKind,
  ELEMENTS,
  type ElementKind,
  type EntranceProps,
  type FitProps,
  isKind,
  KIND_CAPABILITIES,
  type Kind,
  type KindProps,
  type KindWith,
  kindsWhere,
  kindsWithProp,
  type NestedProps,
  type OverlayProps,
  type PlacedProps,
  SCHEMAS_BY_KIND,
  type ShapeProps,
  type SoundProps,
  type TimedProps,
  type TitleProps,
  type VisualProps,
} from "@uberscene/kit/schema";

import type {
  audioProps,
  entranceProps,
  fitProp,
  overlayProps,
  timedProps,
  visualProps,
} from "../src/jsx/schemas/common";

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
    // The overlays take a `follow`, and footage does not. (Not an exact list: a kind added later may take one too.)
    expectTypeOf<"title" | "shape" | "svg" | "sticker" | "layer">().toMatchTypeOf<KindWith<"follow">>();
    expectTypeOf<"clip">().not.toMatchTypeOf<KindWith<"follow">>();
    expectTypeOf<KindWith<"text">>().toEqualTypeOf<"caption">();
    // What is placed has a box and a transform; a sound does not.
    expectTypeOf<TitleProps>().toMatchTypeOf<PlacedProps>();
    expectTypeOf<"audio">().not.toMatchTypeOf<KindWith<"transform">>();
  });

  it("asks the kind table by a kind only", () => {
    // @ts-expect-error a misspelled kind is not a kind, so it does not compile
    expect(capabilitiesOf("titel").timed).toBe(false);
    // A key every object has, reaching here untyped, is still an element that is nothing.
    expect(capabilitiesOf("toString" as Kind).placementScope).toBe("none");
    expectTypeOf(kindsWhere((kind) => kind.timed)).toEqualTypeOf<readonly Kind[]>();
    expectTypeOf(kindsWithProp("follow")).toEqualTypeOf<readonly KindWith<"follow">[]>();
    // A prop known only at run time may be any kind's.
    expectTypeOf(kindsWithProp("blend" as string)).toEqualTypeOf<readonly Kind[]>();
  });

  it("names the shared props as the schema's groups have them", () => {
    expectTypeOf<keyof TimedProps>().toEqualTypeOf<keyof typeof timedProps>();
    expectTypeOf<keyof OverlayProps>().toEqualTypeOf<keyof typeof overlayProps>();
    expectTypeOf<keyof VisualProps>().toEqualTypeOf<keyof typeof visualProps>();
    expectTypeOf<keyof FitProps>().toEqualTypeOf<keyof typeof fitProp>();
    expectTypeOf<keyof EntranceProps>().toEqualTypeOf<keyof typeof entranceProps>();
    expectTypeOf<keyof SoundProps>().toEqualTypeOf<keyof typeof audioProps>();
    // Every kind that has a group has it as the group is: a shape's overlay props are a title's.
    expectTypeOf<Pick<ShapeProps, keyof OverlayProps>>().toEqualTypeOf<Pick<TitleProps, keyof OverlayProps>>();
    expectTypeOf<Pick<NestedProps, keyof VisualProps>>().toMatchTypeOf<VisualProps>();
  });
});
