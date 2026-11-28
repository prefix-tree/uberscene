// A `<Composition>`: the video itself, holding its tracks, its camera, its markers and its captions.
import type { KitElement } from "../element";
import { planeTraits } from "../traits";
import { compositionSchema } from "./schema";

/** The kit's part of a composition: its schema, its row in the kind table, and a sample. */
export interface CompositionElement extends KitElement<"composition", "none"> {
  readonly schema: typeof compositionSchema;
}

export const composition: CompositionElement = {
  kind: "composition",
  summary:
    "The video: frame rate, size, background and theme. It ends where its content ends. Clips written straight in it play in order, as its main track.",
  group: "Timeline",
  schema: compositionSchema,
  traits: planeTraits("none", { childKinds: ["track", "camera", "marker", "captions"], spansVideo: true }),
  // The composition is the sample file itself: its sample writes nothing more.
  sample: "",
  sampleTrack: "composition",
};
