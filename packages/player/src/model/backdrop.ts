import { capabilitiesOf, isDomOverlay, KIND_CAPABILITIES, onOverlayPlane } from "@uberscene/kit/schema";
import type { ResolvedState } from "@uberscene/sdk/resolver";

/** Kinds the overlay plane draws (as DOM, in the preview and the export) rather than the canvas. */
export const OVERLAY_KINDS: ReadonlySet<string> = new Set(Object.keys(KIND_CAPABILITIES).filter(onOverlayPlane));

/** Whether a kind puts footage on the canvas. */
const isFootage = (kind: string): boolean => capabilitiesOf(kind).footage;

const memo = new WeakMap<ResolvedState, ReadonlySet<string>>();

/**
 * The tracks whose overlays draw beneath the footage: those below every
 * visible track that holds footage, when one of them holds an overlay (a
 * background graphic under the cut, say). Empty otherwise, and then every
 * overlay draws above the footage as before. When it is not empty, the canvas
 * holds only the footage over a transparent ground, and the composition
 * background is painted beneath the backdrop instead.
 */
export function backdropTracks(state: ResolvedState): ReadonlySet<string> {
  const hit = memo.get(state);
  if (hit) return hit;
  const footage = state.tracks.filter(
    (t) => !t.hidden && t.items.some((id) => isFootage(state.items.get(id)?.kind ?? "")),
  );
  const lowest = footage.length ? Math.min(...footage.map((t) => t.order)) : -1;
  const drawn = (id: string) => isDomOverlay(state.items.get(id)?.kind ?? "");
  const below = state.tracks.filter((t) => t.order < lowest && !t.hidden && t.items.some(drawn));
  const set: ReadonlySet<string> = new Set(below.map((t) => t.id));
  memo.set(state, set);
  return set;
}

/** Where each track draws, when footage and overlays are stacked in the order the file writes its tracks. */
export interface TrackBands {
  /** How many canvases the footage needs: one per run of footage tracks that overlays split. At least 1. */
  readonly count: number;
  /** The canvas a track's footage and adjustments paint on, by track id. */
  readonly bandOf: ReadonlyMap<string, number>;
  /** The canvas a track's overlays sit above, by track id; -1 is beneath every canvas (the backdrop). */
  readonly slotOf: ReadonlyMap<string, number>;
}

const bandsMemo = new WeakMap<ResolvedState, TrackBands>();

/**
 * Tracks draw in the order the file writes them, the first at the bottom. Footage is painted on a canvas and
 * overlays are DOM, so a file that puts an overlay track between two footage tracks (a card under a cut-out
 * speaker) needs a second canvas above the card: each run of footage tracks is a band with a canvas of its own,
 * and the overlays between two bands sit between their canvases. A file with its footage in one run has one band,
 * and draws as it always did.
 */
export function trackBands(state: ResolvedState): TrackBands {
  const hit = bandsMemo.get(state);
  if (hit) return hit;
  const bandOf = new Map<string, number>();
  const slotOf = new Map<string, number>();
  const kindOf = (id: string) => state.items.get(id)?.kind ?? "";
  let band = 0;
  let footageSeen = false;
  let overlaySinceFootage = false;
  for (const track of [...state.tracks].sort((a, b) => a.order - b.order)) {
    if (track.hidden) continue;
    const hasFootage = track.items.some((id) => isFootage(kindOf(id)));
    const hasOverlay = track.items.some((id) => isDomOverlay(kindOf(id)));
    if (hasFootage) {
      // Footage above an overlay that is itself above footage: a new canvas, over that overlay.
      if (footageSeen && overlaySinceFootage) band++;
      footageSeen = true;
      overlaySinceFootage = false;
    }
    bandOf.set(track.id, band);
    // A track with both: its overlays are above its own footage.
    if (hasOverlay) {
      slotOf.set(track.id, footageSeen ? band : -1);
      if (footageSeen) overlaySinceFootage = true;
    }
  }
  // With no footage there is nothing to be beneath: every overlay is above the one canvas, as `backdropTracks` has it.
  if (!footageSeen) for (const id of slotOf.keys()) slotOf.set(id, 0);
  const bands: TrackBands = { count: band + 1, bandOf, slotOf };
  bandsMemo.set(state, bands);
  return bands;
}
