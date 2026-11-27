// The paths a key list or a generator may sit at, one table per group of values, and each element kind's list of them
// (`ElementCapabilities.keyPaths`). The resolver reads it to make the items, the key actions to say which paths a kind
// takes, and the curve to say how a value moves. A new value that can change over time is an entry here.

import { parseColor } from "../color";
import type { CurveBlend } from "../easing";

export interface KeyPath {
  /** Where the value is written in the element's props: `transform.rotation`, `volume`, `stroke.color`, `zoom`. */
  readonly path: string;
  /** What its keyframe and generator items are named: `transform.rotation`, `audio.volume`, `shape.stroke.color`. */
  readonly property: string;
  /** How the value moves between two keys: a number, a colour through OKLab, or points one by one. */
  readonly blend: CurveBlend;
  /** A number, so it also takes a generator. A colour or a list of points takes keys only. */
  readonly numeric: boolean;
  /**
   * What is left written once the keys are items. `first`: the first key's value, so the prop stays a value (a shape's
   * own values, a camera's). `removed`: nothing, the keys alone say it. `key`: nothing, and a constant is one key too
   * (a pan, which the mixer reads only from keys).
   */
  readonly constant: "first" | "removed" | "key";
  /** Its value when nothing is written. */
  readonly missing?: number;
  /** The prop must stay written: a generator with no `base` leaves `missing` there. */
  readonly required?: boolean;
  /** Whose clock its keys run on: the element's own, or the video's (a camera's). */
  readonly clock: "element" | "video";
  /** The path one list for both axes is written at (`transform.scale` for `.x` and `.y`). */
  readonly both?: string;
  /** Why `value` cannot be one of its keys, or null. A key's value is not parsed with the props, so it is checked here. */
  readonly check?: (value: unknown) => string | null;
}

const number = (path: string, more: Partial<KeyPath> = {}): KeyPath => ({
  path,
  property: path,
  blend: "number",
  numeric: true,
  constant: "removed",
  clock: "element",
  ...more,
});

export const BOX_KEY_PATHS: readonly KeyPath[] = [number("box.x"), number("box.y")];

export const TRANSFORM_KEY_PATHS: readonly KeyPath[] = [
  number("transform.scale.x", { missing: 1, both: "transform.scale" }),
  number("transform.scale.y", { missing: 1, both: "transform.scale" }),
  number("transform.rotation"),
  number("transform.opacity"),
  number("transform.anchor.x", { missing: 0.5 }),
  number("transform.anchor.y", { missing: 0.5 }),
  number("transform.borderRadius"),
  number("transform.crop.x", { missing: 0 }),
  number("transform.crop.y", { missing: 0 }),
  number("transform.crop.width", { missing: 1 }),
  number("transform.crop.height", { missing: 1 }),
];

const VOLUME = number("volume", { property: "audio.volume" });
const PAN = number("pan", { property: "audio.pan", constant: "key" });
export const AUDIO_KEY_PATHS: readonly KeyPath[] = [VOLUME, PAN];
/** Sound with no pan of its own (a nested composition). */
export const VOLUME_KEY_PATHS: readonly KeyPath[] = [VOLUME];

/** What a `<Camera>` animates, and its value when the file writes none. */
export const CAMERA_FIELDS = { x: 0, y: 0, zoom: 1, rotation: 0 } as const;

export const CAMERA_KEY_PATHS: readonly KeyPath[] = Object.entries(CAMERA_FIELDS).map(([field, missing]) =>
  number(field, { property: `camera.${field}`, constant: "first", missing, clock: "video" }),
);

const isPoint = (p: unknown): boolean =>
  typeof p === "object" &&
  p !== null &&
  Number.isFinite((p as { x?: unknown }).x) &&
  Number.isFinite((p as { y?: unknown }).y);

const shape = (path: string, more: Partial<KeyPath>): KeyPath =>
  number(path, { property: `shape.${path}`, constant: "first", ...more });

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

const EVERY: readonly KeyPath[] = [
  ...BOX_KEY_PATHS,
  ...TRANSFORM_KEY_PATHS,
  ...AUDIO_KEY_PATHS,
  ...CAMERA_KEY_PATHS,
  ...SHAPE_KEY_PATHS,
];

/** Every property a key list can animate, as the resolver names it. */
export const KEYFRAME_PROPERTIES: readonly string[] = EVERY.map((k) => k.property);

const BY_PROPERTY: ReadonlyMap<string, KeyPath> = new Map(EVERY.map((k) => [k.property, k]));

/** The entry whose keys are named `property` (`shape.fill`), whatever kind holds it. */
export function keyPathOfProperty(property: string): KeyPath | undefined {
  return BY_PROPERTY.get(property);
}

/** A property a key list can animate, as the resolver names it (`transform.opacity` for `transform={{ opacity: […] }}`). */
export function isKeyframeProperty(value: string): boolean {
  return BY_PROPERTY.has(value);
}
