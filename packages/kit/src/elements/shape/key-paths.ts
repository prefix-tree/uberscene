import { parseColor } from "../../color";
import { type KeyPath, keyPath } from "../../jsx/key-path";

const isPoint = (p: unknown): boolean =>
  typeof p === "object" &&
  p !== null &&
  Number.isFinite((p as { x?: unknown }).x) &&
  Number.isFinite((p as { y?: unknown }).y);

const shape = (path: string, more: Partial<KeyPath>): KeyPath =>
  keyPath(path, { property: `shape.${path}`, constant: "first", ...more });

// A theme token in a colour is replaced before the check runs; one left (`$nope`) is the theme check's to report.
const colour = (path: string): KeyPath =>
  shape(path, {
    blend: "color",
    numeric: false,
    check: (value) =>
      typeof value === "string" && (value.startsWith("$") || parseColor(value) !== null)
        ? null
        : `a key on ${path} is a colour, such as "#ff3b30", "rgb(255 59 48)" or "tomato"`,
  });

const size = (path: string): KeyPath =>
  shape(path, {
    check: (value) =>
      typeof value === "number" && value > 0 ? null : `a key on ${path} is a number of pixels above 0`,
  });

/**
 * A shape's own values that change: its size, its colours, its points, and its outline's thickness and dash offset.
 * The first key stays written as the constant, so a theme preset's `fill` or `stroke` never shows through a keyed one.
 */
export const SHAPE_KEY_PATHS: readonly KeyPath[] = [
  size("width"),
  size("height"),
  colour("fill"),
  shape("points", {
    blend: "points",
    numeric: false,
    check: (value) =>
      Array.isArray(value) && value.every(isPoint)
        ? null
        : "a key on points is a list of points, each { x, y } as fractions of the box",
  }),
  colour("stroke.color"),
  // A thickness must be written: a wobble with no `base` is around 0.
  shape("stroke.thickness", {
    missing: 0,
    required: true,
    check: (value) =>
      typeof value === "number" && value >= 0 ? null : "a key on stroke.thickness is a number of pixels, 0 or more",
  }),
  shape("stroke.dashOffset", {
    check: (value) =>
      typeof value === "number" && Number.isFinite(value) ? null : "a key on stroke.dashOffset is a number of pixels",
  }),
];
