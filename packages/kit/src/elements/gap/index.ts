// A `<Gap>`: empty time between two clips of a sequence track.
import type { KitElement } from "../element";
import { planeTraits } from "../traits";
import { gapSchema } from "./schema";

/** The kit's part of a gap: its schema, its row in the kind table, and a sample. */
export interface GapElement extends KitElement<"gap", "none"> {
  readonly schema: typeof gapSchema;
}

export const gap: GapElement = {
  kind: "gap",
  summary: "Empty time between clips on a sequence track.",
  group: "Timeline",
  schema: gapSchema,
  traits: planeTraits("none", { timed: true, placementScope: "track", sequenceRole: "empty", mainTrack: true }),
  sample: `<Clip id="before" src="asset:picture" duration={1} />
        <Gap id="sample" duration={1} />
        <Clip id="after" src="asset:picture" duration={1} />`,
  sampleTrack: "sequence",
  // A gap on the first sequence track leaves black frames, which the lint warns of: footage stands beneath it.
  sampleBeneath: `<Clip id="beneath" src="asset:picture" duration={3} />`,
};
