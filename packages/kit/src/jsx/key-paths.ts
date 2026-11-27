// The paths a key list or a generator may sit at, one table per group of values, and each element kind's list of them
// (`ElementCapabilities.keyPaths`). The resolver reads it to make the items, the key actions to say which paths a kind
// takes, and the curve to say how a value moves. A new value that can change over time is an entry here.

import { SHAPE_KEY_PATHS } from "../elements/shape/key-paths";
import { type KeyPath, keyPath as number } from "./key-path";

export type { KeyPath };
export { SHAPE_KEY_PATHS };

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

/** What moves anything with a `transform` and a `box`. */
export const PLACED_KEY_PATHS: readonly KeyPath[] = [...TRANSFORM_KEY_PATHS, ...BOX_KEY_PATHS];

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
