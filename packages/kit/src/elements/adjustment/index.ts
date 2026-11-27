// An `<Adjustment>`: effects over everything painted beneath it, for a stretch of time.
import type { KitElement } from "../element";
import { ITEM, traits } from "../traits";
import { adjustmentSchema } from "./schema";

/**
 * The kit's part of an adjustment: its schema, its row in the kind table, and a sample. It stands on both planes:
 * its effects are painted on the canvas, and it has an empty cell among the overlays.
 */
export interface AdjustmentElement extends KitElement<"adjustment", "both"> {
  readonly schema: typeof adjustmentSchema;
}

export const adjustment: AdjustmentElement = {
  kind: "adjustment",
  schema: adjustmentSchema,
  traits: {
    ...traits({ ...ITEM, visual: true, childKinds: ["effect", "keyframe"], elementActions: true }),
    plane: "both",
  },
  sample: `<Adjustment id="sample" start={0} duration={3} effects={[{ type: "sepia" }]} />`,
  // It filters what is painted under it, so alone it draws nothing.
  sampleBeneath: `<Clip id="beneath" src="asset:picture" duration={3} />`,
};
