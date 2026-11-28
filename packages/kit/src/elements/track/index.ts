// A `<Track>`: a row of elements, played back to back (a sequence) or each at its own start (free).
import type { KitElement } from "../element";
import { planeTraits } from "../traits";
import { trackSchema } from "./schema";

/** The kit's part of a track: its schema, its row in the kind table, and a sample. */
export interface TrackElement extends KitElement<"track", "none"> {
  readonly schema: typeof trackSchema;
}

export const track: TrackElement = {
  kind: "track",
  summary:
    'A row of elements, drawn over the clips written straight in the composition and the tracks before it. A sequence track plays its children back to back; a free track (`layout="free"`) places each at its own start.',
  group: "Timeline",
  schema: trackSchema,
  traits: planeTraits("none", {
    placementScope: "composition",
    spansVideo: true,
    // What a track holds, in the vocabulary's order.
    childKinds: [
      "clip",
      "audio",
      "gap",
      "transition",
      "title",
      "shape",
      "svg",
      "sticker",
      "adjustment",
      "nested",
      "layer",
      "multicam",
    ],
  }),
  sample: `<Track id="sample" layout="free">
        <Title id="on-track" start={0} duration={3}>On the track</Title>
      </Track>`,
  sampleTrack: "composition",
};
