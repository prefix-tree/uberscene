import type { ElementCapabilities } from "./define";

const none: ElementCapabilities = {
  timed: false,
  visual: false,
  audio: false,
  trimSource: false,
  transformable: false,
  container: false,
  childKinds: [],
  placementScope: "none",
  plane: "none",
  footage: false,
  sequenceRole: "none",
  mainTrack: false,
  hasText: false,
  freeCode: false,
  spansVideo: false,
  masked: false,
  themeStyle: "none",
  themeMotion: false,
  elementActions: false,
  playsAsset: false,
};

/** What everything placed on a track for a stretch of time has. */
const item = { timed: true, sequenceRole: "item", placementScope: "track" } as const;
/** An overlay: drawn on the DOM plane over the canvas, with a transform. */
const overlay = {
  ...item,
  visual: true,
  transformable: true,
  container: true,
  childKinds: ["effect", "keyframe", "mask"],
  plane: "dom",
  elementActions: true,
} as const;

const with_ = (over: Partial<ElementCapabilities>): ElementCapabilities => ({ ...none, ...over });

const CLIP_CHILDREN = ["effect", "keyframe", "mask", "speedKey", "freeze"] as const;

/**
 * What each element kind is: the one table the packages ask, in place of lists of kinds of their own. A new question
 * about a kind is a field here (`ElementCapabilities`), and a list of kinds is `kindsWhere` over it. `visual` and
 * `audio` are what the kind can have; whether one clip has a picture or sound is its asset's to say.
 */
export const KIND_CAPABILITIES: Readonly<Record<string, ElementCapabilities>> = {
  composition: with_({
    container: true,
    childKinds: ["track", "camera", "marker", "captions"],
    placementScope: "none",
    spansVideo: true,
  }),
  camera: with_({ container: true, childKinds: ["track"], placementScope: "composition" }),
  track: with_({
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
  clip: with_({
    ...item,
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
  }),
  audio: with_({
    ...item,
    audio: true,
    trimSource: true,
    container: true,
    childKinds: ["keyframe", "speedKey", "freeze"],
    playsAsset: true,
  }),
  gap: with_({ timed: true, placementScope: "track", sequenceRole: "empty", mainTrack: true }),
  transition: with_({
    timed: true,
    visual: true,
    placementScope: "track",
    sequenceRole: "between",
    mainTrack: true,
  }),
  title: with_({ ...overlay, hasText: true, themeStyle: "look", themeMotion: true }),
  shape: with_({ ...overlay, themeStyle: "props", themeMotion: true }),
  svg: with_({ ...overlay, themeStyle: "props", themeMotion: true }),
  sticker: with_({ ...overlay, themeStyle: "props", themeMotion: true }),
  captions: with_({
    visual: true,
    container: true,
    childKinds: ["caption"],
    placementScope: "composition",
    plane: "dom",
    spansVideo: true,
    themeStyle: "look",
  }),
  caption: with_({ timed: true, visual: true, placementScope: "child" }),
  marker: with_({ placementScope: "composition" }),
  adjustment: with_({
    ...item,
    visual: true,
    container: true,
    childKinds: ["effect", "keyframe"],
    plane: "both",
    elementActions: true,
  }),
  mask: with_({ placementScope: "child" }),
  nested: with_({
    ...item,
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
  }),
  multicam: with_({
    container: true,
    childKinds: ["angle", "cut"],
    placementScope: "track",
    sequenceRole: "item",
    footage: true,
    freeCode: true,
  }),
  angle: with_({ placementScope: "child" }),
  cut: with_({ placementScope: "child" }),
  layer: with_({ ...overlay, childKinds: ["effect", "keyframe"], freeCode: true }),
  effect: with_({ container: true, childKinds: ["keyframe"], placementScope: "child" }),
  keyframe: with_({ placementScope: "child" }),
  generator: with_({ placementScope: "child" }),
  speedKey: with_({ placementScope: "child" }),
  freeze: with_({ placementScope: "child" }),
};

export function capabilitiesOf(kind: string): ElementCapabilities {
  return KIND_CAPABILITIES[kind] ?? none;
}

/** The kinds whose entry passes `test`, in the table's order: how a list of kinds is written. */
export function kindsWhere(test: (kind: ElementCapabilities) => boolean): readonly string[] {
  return Object.keys(KIND_CAPABILITIES).filter((kind) => test(capabilitiesOf(kind)));
}

/** What may be written straight in a `<Composition>` to make its main track. */
export const MAIN_TRACK_KINDS = kindsWhere((kind) => kind.mainTrack);

/**
 * Drawn as DOM alone, over the canvas, for a stretch of time: a title, a shape, an SVG, a sticker, a layer. What a
 * `follow`, a blend and an entrance are drawn for.
 */
export function isDomOverlay(kind: string): boolean {
  const { plane, timed } = capabilitiesOf(kind);
  return timed && plane === "dom";
}

/**
 * Stands on the overlay plane for a stretch of time: the DOM overlays, and an adjustment, which has a cell there and
 * also filters the canvas beneath it.
 */
export function onOverlayPlane(kind: string): boolean {
  const { plane, timed } = capabilitiesOf(kind);
  return timed && (plane === "dom" || plane === "both");
}

/** Something placed on a track that a cut or an anchor can name: not a transition between two, nor a gap. */
export function isSequenceItem(kind: string): boolean {
  const role = capabilitiesOf(kind).sequenceRole;
  return role !== "between" && role !== "empty";
}
