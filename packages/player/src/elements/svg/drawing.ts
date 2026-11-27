import type { FitMode, ResolvedTheme } from "@uberscene/kit/schema";
import { secondsSinceStart } from "@uberscene/sdk/resolver";

import { type ElementProps, type OverlayLayout, overlayLayout } from "./layout";
import { overlaySize } from "./size";
import { type PreparedSvg, prepareSvg, type SvgColor, type SvgViewBox, svgAnimated } from "./svg";

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
  p: ElementProps,
  markup: string,
  tokens: Readonly<Record<string, string>> = themeTokens(p.state.theme),
): SvgDrawing {
  const props = p.placement.props as Record<string, unknown>;
  const viewBox = props.viewBox as SvgViewBox | undefined;
  const { size, fit } = overlaySize(p.state, p.placement, p.children, secondsSinceStart(p.placement, p.time), markup);
  const layout = overlayLayout(p, size, fit, true);
  const prepared = prepareSvg(markup, {
    box: { width: layout.rect.w, height: layout.rect.h },
    viewBox,
    preserveAspectRatio: props.preserveAspectRatio as string | undefined,
    color: props.color as SvgColor | undefined,
    tokens,
    idPrefix: p.placement.id,
    draw: layout.draw,
    // SMIL plays on the element's own clock; markup without it is prepared once for every frame.
    ...(svgAnimated(markup) ? { time: secondsSinceStart(p.placement, p.time) } : {}),
  });
  return { size, fit, layout, prepared };
}

const tokensByTheme = new WeakMap<ResolvedTheme, Readonly<Record<string, string>>>();

/** A theme's tokens as SVG attribute values. */
export function themeTokens(theme: ResolvedTheme | undefined): Readonly<Record<string, string>> {
  if (!theme) return {};
  let tokens = tokensByTheme.get(theme);
  if (!tokens) {
    tokens = Object.fromEntries(Object.entries(theme.tokens).map(([k, v]) => [k, String(v)]));
    tokensByTheme.set(theme, tokens);
  }
  return tokens;
}
