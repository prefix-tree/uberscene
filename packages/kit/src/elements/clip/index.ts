// A `<Clip>`: a stretch of a video or image asset, painted on the canvas.
import type { KitElement } from "../element";
import { FOOTAGE_CHILDREN, ITEM, planeTraits } from "../traits";
import { clipSchema } from "./schema";

/** The kit's part of a clip: its schema, its row in the kind table, and a sample. */
export interface ClipElement extends KitElement<"clip", "canvas"> {
  readonly schema: typeof clipSchema;
}

export const clip: ClipElement = {
  kind: "clip",
  summary:
    "A stretch of a video or image asset, trimmed by seconds, transcript words or camera shots, with speed, fit and transform.",
  group: "Timeline",
  schema: clipSchema,
  traits: planeTraits("canvas", {
    ...ITEM,
    visual: true,
    childKinds: FOOTAGE_CHILDREN,
    footage: true,
    mainTrack: true,
    masked: true,
    playsAsset: true,
  }),
  sample: `<Clip id="sample" src="asset:picture" start={0} duration={3} />`,
};
