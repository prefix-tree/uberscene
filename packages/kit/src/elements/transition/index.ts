// A `<Transition>`: a blend between the two clips it stands between on a sequence track.
import type { KitElement } from "../element";
import { planeTraits } from "../traits";
import { transitionSchema } from "./schema";

/**
 * The kit's part of a transition: its schema, its row in the kind table, and a sample. It is drawn by the clips it
 * stands between, so it has no plane of its own.
 */
export interface TransitionElement extends KitElement<"transition", "none"> {
  readonly schema: typeof transitionSchema;
}

export const transition: TransitionElement = {
  kind: "transition",
  summary: "A blend between the two clips it sits between on a sequence track.",
  group: "Timeline",
  schema: transitionSchema,
  traits: planeTraits("none", {
    timed: true,
    visual: true,
    placementScope: "track",
    sequenceRole: "between",
    mainTrack: true,
  }),
  sample: `<Clip id="before" src="asset:picture" duration={2} />
        <Transition id="sample" duration={0.5} />
        <Clip id="after" src="asset:picture" duration={2} />`,
  sampleTrack: "sequence",
};
