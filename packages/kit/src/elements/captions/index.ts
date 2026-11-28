// `<Captions>`, the video's subtitles, and `<Caption>`, one cue of them written by hand. Cues are made from the
// asset's transcript, or written; both are drawn over every track for the whole video.
import type { KitElement } from "../element";
import { planeTraits } from "../traits";
import { captionSchema, captionsSchema } from "./schema";

/** The kit's part of the captions: their schema, their row in the kind table, and a sample. */
export interface CaptionsElement extends KitElement<"captions", "dom"> {
  readonly schema: typeof captionsSchema;
}

/** The kit's part of one cue: its schema and its row. It is drawn by its captions. */
export interface CaptionElement extends KitElement<"caption", "none"> {
  readonly schema: typeof captionSchema;
}

export const captions: CaptionsElement = {
  kind: "captions",
  summary: "Subtitles from an asset's transcript that follow the clips through every trim.",
  group: "Text and graphics",
  schema: captionsSchema,
  traits: planeTraits("dom", {
    visual: true,
    childKinds: ["caption"],
    placementScope: "composition",
    spansVideo: true,
    themeStyle: "look",
  }),
  sample: `<Captions id="sample">
        <Caption id="cue" start={0} end={3} text="A sample caption" />
      </Captions>`,
  sampleTrack: "composition",
};

export const caption: CaptionElement = {
  kind: "caption",
  summary: "One cue inside `<Captions>`, written by hand: its text, start and end.",
  group: "Text and graphics",
  schema: captionSchema,
  traits: planeTraits("none", { timed: true, visual: true, placementScope: "child" }),
  sample: `<Captions id="captions">
        <Caption id="sample" start={0} end={3} text="A sample caption" />
      </Captions>`,
  sampleTrack: "composition",
};
