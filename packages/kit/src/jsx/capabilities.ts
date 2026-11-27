import { KIT_ELEMENTS, type Kind } from "../elements";
import { ITEM, NO_TRAITS, traits } from "../elements/traits";
import type { ElementCapabilities } from "./define";
import { AUDIO_KEY_PATHS, CAMERA_KEY_PATHS, type KeyPath, PLACED_KEY_PATHS, VOLUME_KEY_PATHS } from "./key-paths";

const CLIP_CHILDREN = ["effect", "keyframe", "mask", "speedKey", "freeze"] as const;

/**
 * What each element kind is: the one table the packages ask, in place of lists of kinds of their own. A new question
 * about a kind is a field here (`ElementCapabilities`), and a list of kinds is `kindsWhere` over it. `visual` and
 * `audio` are what the kind can have; whether one clip has a picture or sound is its asset's to say. A kind with a
 * folder of its own (`elements/<kind>/`) says its row there.
 */
export const KIND_CAPABILITIES: Readonly<Record<Kind, ElementCapabilities>> = {
  composition: traits({
    container: true,
    childKinds: ["track", "camera", "marker", "captions"],
    placementScope: "none",
    spansVideo: true,
  }),
  camera: traits({
    container: true,
    childKinds: ["track"],
    placementScope: "composition",
    keyPaths: CAMERA_KEY_PATHS,
  }),
  track: traits({
    container: true,
    placementScope: "composition",
    spansVideo: true,
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
  clip: traits({
    ...ITEM,
    visual: true,
    audio: true,
    trimSource: true,
    transformable: true,
    container: true,
    childKinds: CLIP_CHILDREN,
    plane: "canvas",
    footage: true,
    mainTrack: true,
    masked: true,
    playsAsset: true,
    keyPaths: [...PLACED_KEY_PATHS, ...AUDIO_KEY_PATHS],
  }),
  audio: traits({
    ...ITEM,
    audio: true,
    trimSource: true,
    container: true,
    childKinds: ["keyframe", "speedKey", "freeze"],
    playsAsset: true,
    keyPaths: AUDIO_KEY_PATHS,
  }),
  gap: traits({ timed: true, placementScope: "track", sequenceRole: "empty", mainTrack: true }),
  transition: traits({
    timed: true,
    visual: true,
    placementScope: "track",
    sequenceRole: "between",
    mainTrack: true,
  }),
  title: KIT_ELEMENTS.title.capabilities,
  shape: KIT_ELEMENTS.shape.capabilities,
  svg: KIT_ELEMENTS.svg.capabilities,
  sticker: KIT_ELEMENTS.sticker.capabilities,
  captions: traits({
    visual: true,
    container: true,
    childKinds: ["caption"],
    placementScope: "composition",
    plane: "dom",
    spansVideo: true,
    themeStyle: "look",
  }),
  caption: traits({ timed: true, visual: true, placementScope: "child" }),
  marker: traits({ placementScope: "composition" }),
  adjustment: KIT_ELEMENTS.adjustment.capabilities,
  mask: traits({ placementScope: "child" }),
  nested: traits({
    ...ITEM,
    visual: true,
    audio: true,
    trimSource: true,
    transformable: true,
    container: true,
    childKinds: CLIP_CHILDREN,
    plane: "canvas",
    footage: true,
    freeCode: true,
    masked: true,
    elementActions: true,
    keyPaths: [...PLACED_KEY_PATHS, ...VOLUME_KEY_PATHS],
  }),
  multicam: traits({
    container: true,
    childKinds: ["angle", "cut"],
    placementScope: "track",
    sequenceRole: "item",
    footage: true,
    freeCode: true,
  }),
  angle: traits({ placementScope: "child" }),
  cut: traits({ placementScope: "child" }),
  layer: KIT_ELEMENTS.layer.capabilities,
  effect: traits({ container: true, childKinds: ["keyframe"], placementScope: "child" }),
  keyframe: traits({ placementScope: "child" }),
  generator: traits({ placementScope: "child" }),
  speedKey: traits({ placementScope: "child" }),
  freeze: traits({ placementScope: "child" }),
};

/** Every kind, in the table's order. */
export const KINDS = Object.keys(KIND_CAPABILITIES) as readonly Kind[];

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
  return isKind(kind) ? KIND_CAPABILITIES[kind] : NO_TRAITS;
}

/** The paths in a `kind`'s props that keys and generators may sit at. */
export function keyPathsOf(kind: Kind): readonly KeyPath[] {
  return capabilitiesOf(kind).keyPaths;
}

/** A `kind`'s entry for `path`: the path itself, or the one path both of two axes are written at (`transform.scale`). */
export function keyPathOf(kind: Kind, path: string): KeyPath | undefined {
  return keyPathsOf(kind).find((k) => k.path === path || k.both === path);
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
