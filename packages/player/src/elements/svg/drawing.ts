import type { FitMode } from "@uberscene/kit/schema";
import { secondsSinceStart } from "@uberscene/sdk/resolver";

import { type OverlayLayout, overlayLayout } from "../../overlays/layout";
import { overlaySize } from "../../overlays/size";
import { type PreparedSvg, prepareSvg, svgAnimated } from "../../overlays/svg";
import { themeTokens } from "../../overlays/theme-tokens";
import type { ElementPropsOf } from "../dom-drawing";

export interface SvgDrawing {
  /** The size the SVG asks for, before `fit`. */
  readonly size: { readonly width: number; readonly height: number };
  readonly fit: FitMode;
  readonly layout: OverlayLayout;
  readonly prepared: PreparedSvg;
}

/**
 * How an `<Svg>` element draws its markup: at the size the SVG asks for (or fitted to the
 * composition with `fit`), with its `viewBox`, `preserveAspectRatio` and `color` applied, and
 * `$name` / `var(--us-name)` filled from `tokens` (by default the composition's theme).
 */
export function svgDrawing(
  p: ElementPropsOf<"svg">,
  markup: string,
  tokens: Readonly<Record<string, string>> = themeTokens(p.state.theme),
): SvgDrawing {
  const props = p.placement.props;
  const { size, fit } = overlaySize(p.state, p.placement, p.children, secondsSinceStart(p.placement, p.time), markup);
  const layout = overlayLayout(p, size, fit, true);
  const prepared = prepareSvg(markup, {
    box: { width: layout.rect.w, height: layout.rect.h },
    viewBox: props.viewBox,
    preserveAspectRatio: props.preserveAspectRatio,
    color: props.color,
    tokens,
    idPrefix: p.placement.id,
    draw: layout.draw,
    // SMIL plays on the element's own clock; markup without it is prepared once for every frame.
    ...(svgAnimated(markup) ? { time: secondsSinceStart(p.placement, p.time) } : {}),
  });
  return { size, fit, layout, prepared };
}
