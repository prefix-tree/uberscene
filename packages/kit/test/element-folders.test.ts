import {
  capabilitiesOf,
  ELEMENTS,
  isMigratedKind,
  KIT_ELEMENTS,
  kitElement,
  SCHEMAS_BY_KIND,
  shapeSize,
} from "@uberscene/kit/schema";

// A kind with a folder of its own (`src/elements/<kind>/`) says there what the tables said of it: its schema and its
// row in the kind table. The tag a file writes and the table the packages ask are made from it.

describe("the kinds with a folder of their own", () => {
  it.each(Object.values(KIT_ELEMENTS))("$kind: its tag, its schema and its row are the folder's", (element) => {
    expect(kitElement(element.kind)).toBe(element);
    expect(SCHEMAS_BY_KIND[element.kind]).toBe(element.schema);
    expect(capabilitiesOf(element.kind)).toBe(element.capabilities);
    const tag = Object.values(ELEMENTS).find((component) => component.kind === element.kind);
    expect(tag?.schema).toBe(element.schema);
    expect(tag?.capabilities).toBe(element.capabilities);
  });

  it("are told from the kinds still in the tables", () => {
    expect(isMigratedKind("title")).toBe(true);
    expect(isMigratedKind("clip")).toBe(false);
    expect(kitElement("clip")).toBeUndefined();
    // A name every object has is not a kind.
    expect(isMigratedKind("toString")).toBe(false);
  });

  it("a title with an animation of its own takes no entrance from a theme", () => {
    expect(KIT_ELEMENTS.title.themeMotion?.({ animation: { type: "fade" } })).toBe(false);
    expect(KIT_ELEMENTS.title.themeMotion?.({})).toBe(true);
  });

  it("a shape that writes no size is 200 pixels each way", () => {
    expect(shapeSize({})).toEqual({ width: 200, height: 200 });
    expect(shapeSize({ width: 320 })).toEqual({ width: 320, height: 200 });
  });
});
