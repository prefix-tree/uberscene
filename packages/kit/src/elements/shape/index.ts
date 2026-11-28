// A `<Shape>`: a rectangle, an ellipse, a star, a path, drawn as vectors on the overlay plane.
import type { KitElement } from "../element";
import { overlayTraits } from "../traits";
import { shapeSchema } from "./schema";

/** The kit's part of a shape: its schema, its row in the kind table, and a sample. */
export interface ShapeElement extends KitElement<"shape", "dom"> {
  readonly schema: typeof shapeSchema;
}

export const shape: ShapeElement = {
  kind: "shape",
  summary: "A vector shape (rectangle, circle, star, polygon, path) with fill, stroke and shadow.",
  group: "Text and graphics",
  schema: shapeSchema,
  traits: overlayTraits({ themeStyle: "props", themeMotion: true }),
  sample: `<Shape id="sample" start={0} duration={3} type="rectangle" width={480} height={270} fill="#ff3b30" stroke={{ color: "#ffffff", thickness: 8 }} box={{ x: 960, y: 540, origin: "center" }} />`,
};
