// An `<Svg>`: a vector drawing on the overlay plane, written inline or read from a file.
import type { KitElement } from "../element";
import { overlayTraits } from "../traits";
import { svgSchema } from "./schema";

/** The kit's part of an SVG: its schema, its row in the kind table, and a sample. */
export interface SvgElement extends KitElement<"svg", "dom"> {
  readonly schema: typeof svgSchema;
}

export const svg: SvgElement = {
  kind: "svg",
  summary: "One-off vector art from inline SVG markup or a file.",
  group: "Text and graphics",
  schema: svgSchema,
  traits: overlayTraits({ themeStyle: "props", themeMotion: true }),
  sample: `<Svg id="sample" start={0} duration={3} content='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="#ff3b30" /></svg>' box={{ x: 960, y: 540, width: 400, height: 400, origin: "center" }} />`,
};
