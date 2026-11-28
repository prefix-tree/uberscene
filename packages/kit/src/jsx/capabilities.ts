// What each element kind is: the one table the packages ask, in place of lists of kinds of their own. A kind writes a
// row of traits (`KindTraits`) in its folder (`elements/<kind>/`), or, held inside an element, in `elements/derived.ts`.
// What its schema already says is read from the schema and never written beside it: what takes a `transform`, what
// sounds, what trims a source, and the paths keys may sit at.
import type { z } from "zod";

import type { CurveBlend } from "../easing";
import { isMigratedKind, KIT_ELEMENTS, type Kind } from "../elements";
import { HELD_ELEMENTS } from "../elements/derived";
import { NO_TRAITS } from "../elements/traits";
import type { ElementCapabilities, KindTraits } from "./define";
import { AUDIO_KEY_PATHS, CAMERA_KEY_PATHS, type KeyPath, keyPathsIn, PLACED_KEY_PATHS } from "./key-paths";

/** The vocabulary's order. A kind with a folder of its own that is not named here comes after, in its registry's order. */
const ORDER: readonly Kind[] = [
  "composition",
  "camera",
  "track",
  "clip",
  "audio",
  "gap",
  "transition",
  "title",
  "shape",
  "svg",
  "sticker",
  "captions",
  "caption",
  "marker",
  "adjustment",
  "mask",
  "nested",
  "multicam",
  "angle",
  "cut",
  "layer",
  "effect",
  "keyframe",
  "generator",
  "speedKey",
  "freeze",
];

/** Every kind, in the vocabulary's order. */
export const KINDS: readonly Kind[] = [
  ...ORDER,
  ...(Object.keys(KIT_ELEMENTS) as Kind[]).filter((kind) => !ORDER.includes(kind)),
];

const rowOf = (kind: Kind): KindTraits =>
  isMigratedKind(kind) ? KIT_ELEMENTS[kind].traits : HELD_ELEMENTS[kind].traits;
/** A held kind's schema is not read here: none takes a transform, sounds or holds keys. */
const schemaOf = (kind: Kind): z.ZodType | undefined => (isMigratedKind(kind) ? KIT_ELEMENTS[kind].schema : undefined);

/** A kind's whole entry: its row, and what its schema says. */
function entryOf(kind: Kind): ElementCapabilities {
  const row = rowOf(kind);
  const schema = schemaOf(kind);
  const props: object = schema ? (schema as unknown as z.ZodObject).shape : {};
  const childKinds = row.childKinds;
  return {
    ...row,
    childKinds,
    transformable: "transform" in props,
    audio: "volume" in props,
    trimSource: "in" in props && "out" in props,
    container: childKinds.length > 0,
    keyPaths: schema ? keyPathsIn(schema) : [],
  };
}

/**
 * What each element kind is: the one table the packages ask. A new question about a kind is a field of
 * `ElementCapabilities`, and a list of kinds is `kindsWhere` over it. `visual` and `audio` are what the kind can have;
 * whether one clip has a picture or sound is its asset's to say. It is worked out once, when the kit loads.
 */
export const KIND_CAPABILITIES: Readonly<Record<Kind, ElementCapabilities>> = Object.fromEntries(
  KINDS.map((kind) => [kind, entryOf(kind)]),
) as Record<Kind, ElementCapabilities>;

/** A kind that is nothing: what an untyped kind that is none of them answers as. */
const NOTHING: ElementCapabilities = {
  ...NO_TRAITS,
  transformable: false,
  audio: false,
  trimSource: false,
  container: false,
  keyPaths: [],
};

/** Whether a string is an element kind: the one check where a kind comes in as text (a file's tag, an action's params). */
export function isKind(kind: string): kind is Kind {
  return Object.hasOwn(KIND_CAPABILITIES, kind);
}

/**
 * What a kind is. It takes a `Kind`, so a misspelled one does not compile; text that came in untyped (a tag read from
 * a file, an action's params) goes through `isKind` first.
 */
export function capabilitiesOf(kind: Kind): ElementCapabilities {
  // A kind that reached here untyped and is none still answers, as an element that is nothing.
  return isKind(kind) ? KIND_CAPABILITIES[kind] : NOTHING;
}

/** The paths in a `kind`'s props that keys and generators may sit at. */
export function keyPathsOf(kind: Kind): readonly KeyPath[] {
  return capabilitiesOf(kind).keyPaths;
}

/** A `kind`'s entry for `path`: the path itself, or the one path both of two axes are written at (`transform.scale`). */
export function keyPathOf(kind: Kind, path: string): KeyPath | undefined {
  return keyPathsOf(kind).find((k) => k.path === path || k.both === path);
}

/**
 * Every path a key list can sit at, whatever kind holds it: the paths many kinds share first (a box, a transform, a
 * sound's, a camera's), then each kind's own, in the vocabulary's order.
 */
const EVERY_KEY_PATH: readonly KeyPath[] = [
  ...new Map(
    [
      ...PLACED_KEY_PATHS.filter((k) => k.path.startsWith("box.")),
      ...PLACED_KEY_PATHS,
      ...AUDIO_KEY_PATHS,
      ...CAMERA_KEY_PATHS,
      ...KINDS.flatMap((kind) => KIND_CAPABILITIES[kind].keyPaths),
    ].map((k) => [k.property, k] as const),
  ).values(),
];

/** Every property a key list can animate, as the resolver names it. */
export const KEYFRAME_PROPERTIES: readonly string[] = EVERY_KEY_PATH.map((k) => k.property);

const BY_PROPERTY: ReadonlyMap<string, KeyPath> = new Map(EVERY_KEY_PATH.map((k) => [k.property, k]));

/** The entry whose keys are named `property` (`shape.fill`), whatever kind holds it. */
export function keyPathOfProperty(property: string): KeyPath | undefined {
  return BY_PROPERTY.get(property);
}

/** A property a key list can animate, as the resolver names it (`transform.opacity` for `transform={{ opacity: […] }}`). */
export function isKeyframeProperty(value: string): boolean {
  return BY_PROPERTY.has(value);
}

/** How a key list on `property` moves: as its entry among the key paths says (`KeyPath.blend`), else as numbers. */
export function blendFor(property: string | undefined): CurveBlend {
  return property === undefined ? "number" : (keyPathOfProperty(property)?.blend ?? "number");
}

/** The kinds whose entry passes `test`, in the table's order: how a list of kinds is written. */
export function kindsWhere(test: (kind: ElementCapabilities) => boolean): readonly Kind[] {
  return KINDS.filter((kind) => test(KIND_CAPABILITIES[kind]));
}

/** What may be written straight in a `<Composition>` to make its main track. */
export const MAIN_TRACK_KINDS = kindsWhere((kind) => kind.mainTrack);

const MAIN_TRACK: ReadonlySet<string> = new Set(MAIN_TRACK_KINDS);

/** Whether an element of `kind` written straight in a `<Composition>` goes on its main track. `kind` may be untyped text. */
export function onMainTrack(kind: string): boolean {
  return MAIN_TRACK.has(kind);
}

/**
 * Drawn as DOM alone, over the canvas, for a stretch of time: a title, a shape, an SVG, a sticker, a layer. What a
 * `follow`, a blend and an entrance are drawn for.
 */
export function isDomOverlay(kind: Kind): boolean {
  const { plane, timed } = capabilitiesOf(kind);
  return timed && plane === "dom";
}

/**
 * Stands on the overlay plane for a stretch of time: the DOM overlays, and an adjustment, which has a cell there and
 * also filters the canvas beneath it.
 */
export function onOverlayPlane(kind: Kind): boolean {
  const { plane, timed } = capabilitiesOf(kind);
  return timed && (plane === "dom" || plane === "both");
}

/** Stands between two items of a sequence, with no place of its own in the video: a transition. */
export function isBetween(kind: Kind): boolean {
  return capabilitiesOf(kind).sequenceRole === "between";
}

/** Holds empty time in a sequence, before the next item: a gap. */
export function isEmptyTime(kind: Kind): boolean {
  return capabilitiesOf(kind).sequenceRole === "empty";
}

/** Something placed on a track that a cut or an anchor can name: not a transition between two, nor a gap. */
export function isSequenceItem(kind: Kind): boolean {
  const role = capabilitiesOf(kind).sequenceRole;
  return role !== "between" && role !== "empty";
}
