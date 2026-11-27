// The rows of the kind table (`ElementCapabilities`) that kinds share, for an element's folder to start its own row
// from: nothing at all, something placed on a track, an overlay.
import type { ElementCapabilities } from "../jsx/define";
import { PLACED_KEY_PATHS } from "../jsx/key-paths";

/** A kind that is nothing: every trait off. A row says only what differs from it. */
export const NO_TRAITS: ElementCapabilities = {
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
  keyPaths: [],
};

/** What everything placed on a track for a stretch of time has. */
export const ITEM = { timed: true, sequenceRole: "item", placementScope: "track" } as const;

/** An overlay: drawn on the DOM plane over the canvas, with a transform. */
const OVERLAY = {
  ...ITEM,
  visual: true,
  transformable: true,
  container: true,
  childKinds: ["effect", "keyframe", "mask"],
  plane: "dom",
  elementActions: true,
  keyPaths: PLACED_KEY_PATHS,
} as const;

/** A kind's row: every trait off, but those in `over`. */
export const traits = (over: Partial<ElementCapabilities>): ElementCapabilities => ({ ...NO_TRAITS, ...over });

/** An overlay's row: `OVERLAY`, and what `over` adds. Its plane is the DOM's, which is what the player must draw. */
export const overlayTraits = (
  over: Partial<Omit<ElementCapabilities, "plane">> = {},
): ElementCapabilities & { readonly plane: "dom" } => ({ ...NO_TRAITS, ...OVERLAY, ...over });
