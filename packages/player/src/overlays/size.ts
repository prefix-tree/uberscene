import type { Box, FitMode } from "@uberscene/kit/schema";
import type { Placement, ResolvedState } from "@uberscene/sdk/resolver";

import { keyframedValue } from "../model/keyframes";
import { type SvgViewBox, svgIntrinsicSize } from "./svg";

/**
 * A title's text box: its `box`'s width and height, each the frame's when left out. A title has no `fit`, so its
 * content is drawn at this size and `placeBox` never scales it.
 */
function titleBox(
  props: Readonly<Record<string, unknown>>,
  comp: { width: number; height: number },
): { width: number; height: number } {
  const box = (props.box ?? {}) as { width?: unknown; height?: unknown };
  return {
    width: typeof box.width === "number" ? box.width : comp.width,
    height: typeof box.height === "number" ? box.height : comp.height,
  };
}

/** The size a shape draws at, before layout: its `width` and `height`, 200 pixels each when left out. */
function shapeSizeOf(props: Readonly<Record<string, unknown>>): Box {
  return { width: Math.max(0, Number(props.width ?? 200)), height: Math.max(0, Number(props.height ?? 200)) };
}

/** A sticker's size: a square a quarter of the frame's shorter side. */
function stickerSizeOf(comp: Box): number {
  return Math.round(Math.min(comp.width, comp.height) / 4);
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
): { readonly size: Box; readonly fit: FitMode } {
  const comp = state.composition;
  const props = p.props as Record<string, unknown>;
  switch (p.kind) {
    case "title":
      return { size: titleBox(props, comp), fit: "none" };
    case "shape":
      return {
        size: shapeSizeOf({
          width: keyframedValue(children, "shape.width", rel, props.width),
          height: keyframedValue(children, "shape.height", rel, props.height),
        }),
        fit: "none",
      };
    case "sticker": {
      const side = stickerSizeOf(comp);
      return { size: { width: side, height: side }, fit: "none" };
    }
    case "svg": {
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
    }
    default:
      return { size: { width: comp.width, height: comp.height }, fit: "none" };
  }
}

/** The placements of `p`'s children, from the state. */
export function childrenOf(state: ResolvedState, p: Placement): Placement[] {
  return p.children.flatMap((c) => {
    const item = state.items.get(c);
    return item ? [item] : [];
  });
}
