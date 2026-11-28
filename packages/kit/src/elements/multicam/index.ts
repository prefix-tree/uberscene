// A `<Multicam>`: several camera angles of one take, and `<Cut>`s that pick which one shows. Its cuts become clips the
// resolver makes; `<Angle>` and `<Cut>` stand only inside it.
import type { KitElement } from "../element";
import { planeTraits } from "../traits";
import { angleSchema, cutSchema, multicamSchema } from "./schema";

/** The kit's part of a multicam: its schema, its row in the kind table, and a sample. */
export interface MulticamElement extends KitElement<"multicam", "none"> {
  readonly schema: typeof multicamSchema;
}
/** The kit's part of one camera of a multicam. */
export interface AngleElement extends KitElement<"angle", "none"> {
  readonly schema: typeof angleSchema;
}
/** The kit's part of a switch to an angle. */
export interface CutElement extends KitElement<"cut", "none"> {
  readonly schema: typeof cutSchema;
}

const SAMPLE = (id: { multicam?: string; angle?: string; cut?: string }) => `<Multicam id="${id.multicam ?? "cameras"}">
          <Angle id="${id.angle ?? "wide"}" src="asset:picture" />
          <Angle id="close" src="asset:other" />
          <Cut id="${id.cut ?? "first"}" at={0} angle="${id.angle ?? "wide"}" />
          <Cut id="second" at={1.5} angle="close" />
        </Multicam>`;

export const multicam: MulticamElement = {
  kind: "multicam",
  summary: "Several camera angles of one take; `<Cut>`s pick which one shows.",
  group: "Structure",
  schema: multicamSchema,
  traits: planeTraits("none", {
    childKinds: ["angle", "cut"],
    placementScope: "track",
    sequenceRole: "item",
    footage: true,
    freeCode: true,
  }),
  sample: SAMPLE({ multicam: "sample" }),
  sampleTrack: "sequence",
};

export const angle: AngleElement = {
  kind: "angle",
  summary: "One camera of a `<Multicam>`: its asset and sync offset.",
  group: "Structure",
  schema: angleSchema,
  traits: planeTraits("none", { placementScope: "child" }),
  sample: SAMPLE({ angle: "sample" }),
  sampleTrack: "sequence",
};

export const cut: CutElement = {
  kind: "cut",
  summary: "Switches a `<Multicam>` to an angle at a moment.",
  group: "Structure",
  schema: cutSchema,
  traits: planeTraits("none", { placementScope: "child" }),
  sample: SAMPLE({ cut: "sample" }),
  sampleTrack: "sequence",
};
