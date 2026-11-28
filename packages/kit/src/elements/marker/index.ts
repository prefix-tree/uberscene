// A `<Marker>`: a named moment of the video, which times may name (`marker:<id>`).
import type { KitElement } from "../element";
import { planeTraits } from "../traits";
import { markerSchema } from "./schema";

/** The kit's part of a marker: its schema, its row in the kind table, and a sample. */
export interface MarkerElement extends KitElement<"marker", "none"> {
  readonly schema: typeof markerSchema;
}

export const marker: MarkerElement = {
  kind: "marker",
  summary: "A named point on the timeline.",
  group: "Timeline",
  schema: markerSchema,
  traits: planeTraits("none", { placementScope: "composition" }),
  sample: `<Marker id="sample" start={1} label="A moment" />`,
  sampleTrack: "composition",
};
