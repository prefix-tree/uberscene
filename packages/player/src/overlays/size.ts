import type { Box, FitMode } from "@uberscene/kit/schema";
import type { Placement, ResolvedState } from "@uberscene/sdk/resolver";

import { elementSize } from "../elements";

/** What an overlay asks for before its box places it: a size, and how it fills that box. */
export interface IntrinsicSize {
  readonly size: Box;
  readonly fit: FitMode;
}

/**
 * The size an overlay asks for before its box places it, and how it fills that box, at `rel` seconds into it: the one
 * place every overlay element and the parent chain (overlays/space.ts) take it from, so where an element is placed
 * and how it is drawn cannot disagree. A shape's keyed `width` and `height` count. An SVG read from a file takes
 * the `markup` it loaded; without it (it is not loaded here), its box's size or the frame's, which is why such an
 * SVG cannot be followed yet (the resolver says so).
 */
export function overlaySize(
  state: ResolvedState,
  p: Placement,
  children: readonly Placement[],
  rel: number,
  markup?: string,
): IntrinsicSize {
  const said = elementSize(state, p, children, rel, markup);
  if (said) return said;
  // A kind that says no size is as large as the frame.
  return { size: { width: state.composition.width, height: state.composition.height }, fit: "none" };
}

/** The placements of `p`'s children, from the state. */
export function childrenOf(state: ResolvedState, p: Placement): Placement[] {
  return p.children.flatMap((c) => {
    const item = state.items.get(c);
    return item ? [item] : [];
  });
}
