// A `<Layer>`: free code on the overlay plane. `<Three>` and `<Motion>` are layers a library draws: the same kind,
// told apart by `engine`, each with props of its own.
import type { KitElement } from "../element";
import { overlayTraits } from "../traits";
import { layerSchema, motionSchema, threeSchema } from "./schema";

/** The kit's part of a layer: its schema, the schema of each engine's layer, its row in the kind table, and a sample. */
export interface LayerElement extends KitElement<"layer", "dom"> {
  readonly schema: typeof layerSchema;
  readonly variants: {
    readonly by: "engine";
    readonly schemas: { readonly three: typeof threeSchema; readonly motion: typeof motionSchema };
  };
}

export const layer: LayerElement = {
  kind: "layer",
  schema: layerSchema,
  interior: true,
  variants: { by: "engine", schemas: { three: threeSchema, motion: motionSchema } },
  traits: overlayTraits({ childKinds: ["effect", "keyframe"], freeCode: true }),
  sample: `<Layer id="sample" start={0} duration={3}><div style={{ position: "absolute", left: 720, top: 405, width: 480, height: 270, background: "#0a84ff" }} /></Layer>`,
};
