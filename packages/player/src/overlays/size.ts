import type { Box, FitMode } from "@uberscene/kit/schema";
import type { Placement, ResolvedState } from "@uberscene/sdk/resolver";

import { elementSize } from "../elements";
import { type SvgViewBox, svgIntrinsicSize } from "./svg";

/** A sticker's size: a square a quarter of the frame's shorter side. */
function stickerSizeOf(comp: Box): number {
  return Math.round(Math.min(comp.width, comp.height) / 4);
}

/** What an overlay asks for before its box places it: a size, and how it fills that box. */
export interface IntrinsicSize {
  readonly size: Box;
  readonly fit: FitMode;
}

/** A kind's own size at `rel` seconds into the element; `markup` is an SVG's file, when it has been loaded. */
type SizeOf = (
  state: ResolvedState,
  p: Placement,
  children: readonly Placement[],
  rel: number,
  markup?: string,
) => IntrinsicSize;

/**
 * The size each kind draws at before layout, for the kinds that have no folder of their own yet (one that has says
 * its size there: `elements/<kind>/index.ts`). A kind with no size is as large as the frame. A sticker's is a square;
 * an SVG's what its markup says.
 */
export const INTRINSIC_SIZE: Readonly<Record<string, SizeOf>> = {
  sticker: (state) => {
    const side = stickerSizeOf(state.composition);
    return { size: { width: side, height: side }, fit: "none" };
  },
  svg: (state, p, _children, _rel, markup) => {
    const comp = state.composition;
    const props = p.props as Record<string, unknown>;
    const fit = (props.fit as FitMode | undefined) ?? "none";
    const source = markup ?? (typeof props.content === "string" ? props.content : undefined);
    if (source !== undefined) return { size: svgIntrinsicSize(source, props.viewBox as SvgViewBox | undefined), fit };
    const box = (props.box ?? {}) as { width?: unknown; height?: unknown };
    return {
      size: {
        width: typeof box.width === "number" ? box.width : comp.width,
        height: typeof box.height === "number" ? box.height : comp.height,
      },
      fit,
    };
  },
};

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
  const said = elementSize(state, p, children, rel);
  if (said) return said;
  const own = INTRINSIC_SIZE[p.kind];
  if (own) return own(state, p, children, rel, markup);
  return { size: { width: state.composition.width, height: state.composition.height }, fit: "none" };
}

/** The placements of `p`'s children, from the state. */
export function childrenOf(state: ResolvedState, p: Placement): Placement[] {
  return p.children.flatMap((c) => {
    const item = state.items.get(c);
    return item ? [item] : [];
  });
}
