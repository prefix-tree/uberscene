// What a key on a shape's own values may hold. A key's `value` is not parsed with the shape's props (the resolver
// takes keys out first), so each is checked here: by the resolver for a file, and by the key actions for an edit.

import { parseColor } from "@uberscene/kit/schema";

/** The paths on a `<Shape>` a key list may sit at, each with the property its keys animate. */
export const SHAPE_KEY_PATHS: Readonly<Record<string, string>> = {
  width: "shape.width",
  height: "shape.height",
  fill: "shape.fill",
  points: "shape.points",
  "stroke.color": "shape.stroke.color",
  "stroke.thickness": "shape.stroke.thickness",
  "stroke.dashOffset": "shape.stroke.dashOffset",
};

const isPoint = (p: unknown): boolean =>
  typeof p === "object" &&
  p !== null &&
  Number.isFinite((p as { x?: unknown }).x) &&
  Number.isFinite((p as { y?: unknown }).y);

/** Why `value` cannot be a key of a shape's `property` (`shape.fill`…), or null. */
export function shapeKeyProblem(property: string, value: unknown): string | null {
  const path = property.replace(/^shape\./, "");
  switch (property) {
    case "shape.width":
    case "shape.height":
      return typeof value === "number" && value > 0 ? null : `a key on ${path} is a number of pixels above 0`;
    case "shape.stroke.thickness":
      return typeof value === "number" && value >= 0 ? null : `a key on ${path} is a number of pixels, 0 or more`;
    case "shape.stroke.dashOffset":
      return typeof value === "number" && Number.isFinite(value) ? null : `a key on ${path} is a number of pixels`;
    case "shape.fill":
    case "shape.stroke.color":
      // A theme token is replaced before this runs; one left (`$nope`) is reported as unknown by the theme check.
      return typeof value === "string" && (value.startsWith("$") || parseColor(value) !== null)
        ? null
        : `a key on ${path} is a colour, such as "#ff3b30", "rgb(255 59 48)" or "tomato"`;
    case "shape.points":
      return Array.isArray(value) && value.every(isPoint)
        ? null
        : `a key on ${path} is a list of points, each { x, y } as fractions of the box`;
    default:
      return null;
  }
}
