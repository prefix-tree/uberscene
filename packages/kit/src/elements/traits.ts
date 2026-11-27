// The rows of the kind table that kinds share, for an element's folder to start its own row from: nothing at all,
// something placed on a track, an overlay. A row writes only what its schema does not say (`KindTraits`).
import type { KindTraits } from "../jsx/define";

/** A kind that is nothing: every trait off. A row says only what differs from it. */
export const NO_TRAITS: KindTraits = {
  timed: false,
  visual: false,
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
export const ITEM = { timed: true, sequenceRole: "item", placementScope: "track" } as const;

/** An overlay: drawn on the DOM plane over the canvas, holding its effects, keys and a mask. */
const OVERLAY = {
  ...ITEM,
  visual: true,
  childKinds: ["effect", "keyframe", "mask"],
  plane: "dom",
  elementActions: true,
} as const;

/** A kind's row: every trait off, but those in `over`. */
export const traits = (over: Partial<KindTraits>): KindTraits => ({ ...NO_TRAITS, ...over });

/** An overlay's row: `OVERLAY`, and what `over` adds. Its plane is the DOM's, which is what the player must draw. */
export const overlayTraits = (
  over: Partial<Omit<KindTraits, "plane">> = {},
): KindTraits & { readonly plane: "dom" } => ({ ...NO_TRAITS, ...OVERLAY, ...over });
