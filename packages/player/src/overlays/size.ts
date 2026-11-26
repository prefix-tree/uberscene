import type { Box, FitMode } from "@uberscene/kit/schema";
import type { Placement, ResolvedState } from "@uberscene/sdk/resolver";

import { type SvgViewBox, svgIntrinsicSize } from "./svg";

/**
 * A title's text box: its `box`'s width and height, each the frame's when left out. A title has no `fit`, so its
 * content is drawn at this size and `placeBox` never scales it.
 */
export function titleBox(
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
export function shapeSizeOf(props: Readonly<Record<string, unknown>>): Box {
  return { width: Math.max(0, Number(props.width ?? 200)), height: Math.max(0, Number(props.height ?? 200)) };
}

/** A sticker's size: a square a quarter of the frame's shorter side. */
export function stickerSizeOf(comp: Box): number {
  return Math.round(Math.min(comp.width, comp.height) / 4);
}

/**
 * The size an overlay asks for before its box places it, and how it fills that box: what each element passes to
 * `overlayLayout`, worked out from the state alone so a child can be placed in its parent without drawing it. An
 * SVG read from a file is not loaded here: it takes its box's size, or the frame's.
 */
export function overlaySize(state: ResolvedState, p: Placement): { readonly size: Box; readonly fit: FitMode } {
  const comp = state.composition;
  const props = p.props as Record<string, unknown>;
  switch (p.kind) {
    case "title":
      return { size: titleBox(props, comp), fit: "none" };
    case "shape":
      return { size: shapeSizeOf(props), fit: "none" };
    case "sticker": {
      const side = stickerSizeOf(comp);
      return { size: { width: side, height: side }, fit: "none" };
    }
    case "svg": {
      const fit = (props.fit as FitMode | undefined) ?? "none";
      if (typeof props.content === "string")
        return { size: svgIntrinsicSize(props.content, props.viewBox as SvgViewBox | undefined), fit };
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
