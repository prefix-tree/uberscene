// A `<Shape>`: a rectangle, an ellipse, a star, a path, drawn as vectors on the overlay plane.
import { PLACED_KEY_PATHS } from "../../jsx/key-paths";
import type { KitElement } from "../element";
import { overlayTraits } from "../traits";
import { SHAPE_KEY_PATHS } from "./key-paths";
import { shapeSchema } from "./schema";

/** The kit's part of a shape: its schema, its row in the kind table, and a sample. */
export interface ShapeElement extends KitElement<"shape", "dom"> {
  readonly schema: typeof shapeSchema;
}

export const shape: ShapeElement = {
  kind: "shape",
  schema: shapeSchema,
  capabilities: overlayTraits({
    themeStyle: "props",
    themeMotion: true,
    keyPaths: [...PLACED_KEY_PATHS, ...SHAPE_KEY_PATHS],
  }),
  sample: `<Shape id="sample" start={0} duration={3} type="rectangle" width={480} height={270} fill="#ff3b30" stroke={{ color: "#ffffff", thickness: 8 }} box={{ x: 960, y: 540, origin: "center" }} />`,
};
