// What each element kind is: the one table the packages ask, in place of lists of kinds of their own. A kind writes a
// row of traits (`KindTraits`): a kind with a folder of its own (`elements/<kind>/`) writes it there, the others here.
// What its schema already says is read from the schema and never written beside it: what takes a `transform`, what
// sounds, what trims a source, and the paths keys may sit at.
import type { z } from "zod";

import type { CurveBlend } from "../easing";
import { isMigratedKind, KIT_ELEMENTS, type Kind, type MigratedKind } from "../elements";
import { NO_TRAITS, traits } from "../elements/traits";
import type { ElementCapabilities, KindTraits } from "./define";
import { AUDIO_KEY_PATHS, CAMERA_KEY_PATHS, type KeyPath, keyPathsIn, PLACED_KEY_PATHS } from "./key-paths";
import { captionSchema, captionsSchema } from "./schemas/captions";
import { cameraSchema, compositionSchema, gapSchema, markerSchema, trackSchema } from "./schemas/composition";
import { angleSchema, cutSchema, multicamSchema } from "./schemas/multicam";
import { transitionSchema } from "./schemas/transition";

/** What an element holds as items of its own: a mask, and what the resolver makes of its props. None is placed. */
type HeldKind = "mask" | "effect" | "keyframe" | "generator" | "speedKey" | "freeze";

/** The row of each kind that has no folder of its own yet. */
const ROWS: { readonly [K in Exclude<Kind, MigratedKind>]: KindTraits } = {
  composition: traits({
    childKinds: ["track", "camera", "marker", "captions"],
    placementScope: "none",
    spansVideo: true,
  }),
  camera: traits({ childKinds: ["track"], placementScope: "composition" }),
  track: traits({
    placementScope: "composition",
    spansVideo: true,
    // What a track holds, as the vocabulary lists it; a kind with a folder that is not named here comes after.
    childKinds: [
      "clip",
      "audio",
      "gap",
      "transition",
      "title",
      "shape",
      "svg",
      "sticker",
      "adjustment",
      "nested",
      "layer",
      "multicam",
    ],
  }),
  gap: traits({ timed: true, placementScope: "track", sequenceRole: "empty", mainTrack: true }),
  transition: traits({
    timed: true,
    visual: true,
    placementScope: "track",
    sequenceRole: "between",
    mainTrack: true,
  }),
  captions: traits({
    visual: true,
    childKinds: ["caption"],
    placementScope: "composition",
    plane: "dom",
    spansVideo: true,
    themeStyle: "look",
  }),
  caption: traits({ timed: true, visual: true, placementScope: "child" }),
  marker: traits({ placementScope: "composition" }),
  mask: traits({ placementScope: "child" }),
  multicam: traits({
    childKinds: ["angle", "cut"],
    placementScope: "track",
    sequenceRole: "item",
    footage: true,
    freeCode: true,
  }),
  angle: traits({ placementScope: "child" }),
  cut: traits({ placementScope: "child" }),
  effect: traits({ childKinds: ["keyframe"], placementScope: "child" }),
  keyframe: traits({ placementScope: "child" }),
  generator: traits({ placementScope: "child" }),
  speedKey: traits({ placementScope: "child" }),
  freeze: traits({ placementScope: "child" }),
};

/**
 * The schema of each kind that has no folder of its own yet. What an element holds as items (`HeldKind`) has none
 * here: none takes a transform, sounds or holds keys, and the keys' own schema asks this table what a key may name.
 */
const SCHEMAS: { readonly [K in Exclude<Kind, MigratedKind | HeldKind>]: z.ZodType } = {
  composition: compositionSchema,
  camera: cameraSchema,
  track: trackSchema,
  gap: gapSchema,
  transition: transitionSchema,
  captions: captionsSchema,
  caption: captionSchema,
  marker: markerSchema,
  multicam: multicamSchema,
  angle: angleSchema,
  cut: cutSchema,
};

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

const rowOf = (kind: Kind): KindTraits => (isMigratedKind(kind) ? KIT_ELEMENTS[kind].traits : ROWS[kind]);
const schemaOf = (kind: Kind): z.ZodType | undefined =>
  isMigratedKind(kind) ? KIT_ELEMENTS[kind].schema : (SCHEMAS as Partial<Record<Kind, z.ZodType>>)[kind];

/** A kind's whole entry: its row, and what its schema says. */
function entryOf(kind: Kind): ElementCapabilities {
  const row = rowOf(kind);
  const schema = schemaOf(kind);
  const props: object = schema ? (schema as unknown as z.ZodObject).shape : {};
  // A track holds every kind placed on one: those the vocabulary lists, then each kind with a folder of its own.
  const childKinds =
    kind === "track"
      ? [
          ...new Set([
            ...row.childKinds,
            ...KINDS.filter((k) => isMigratedKind(k) && rowOf(k).placementScope === "track"),
          ]),
        ]
      : row.childKinds;
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

/** Something placed on a track that a cut or an anchor can name: not a transition between two, nor a gap. */
export function isSequenceItem(kind: Kind): boolean {
  const role = capabilitiesOf(kind).sequenceRole;
  return role !== "between" && role !== "empty";
}
