import type { FitMode } from "@uberscene/kit/schema";
import type { Placement, ResolvedState } from "@uberscene/sdk/resolver";

import { backdropTracks, trackBands } from "./backdrop";
import { CANVAS_OPS } from "./canvas-ops";
import type { PostEffect } from "./effects";
import type { ClipRect } from "./motion";
import type { ShaderPass, TransitionPass } from "./shaders";
import { frameIndex } from "./time";
import type { DrawRect, Matrix2D } from "./transform";
import { visiblePlacements } from "./visible";

export { blendOf } from "./blend";

export interface MaskSpec {
  readonly shape?: Record<string, unknown> | undefined;
  readonly path?:
    | {
        points: { x: number; y: number; handleIn?: { x: number; y: number }; handleOut?: { x: number; y: number } }[];
        closed: boolean;
      }
    | undefined;
  readonly feather: number;
  readonly inverted: boolean;
  readonly opacity: number;
}

export interface DrawOp {
  readonly id: string;
  readonly kind: "video" | "image" | "nested" | "error" | "adjustment";
  readonly asset?: string;
  readonly sourceTime?: number;
  readonly nested?: { readonly state: ResolvedState; readonly time: number };
  readonly rect: DrawRect;
  readonly matrix: Matrix2D;
  readonly crop?: DrawRect;
  /** Dimensions used to express crop pixels; decoded proxies can have another resolution. */
  readonly cropReference?: { readonly width: number; readonly height: number };
  readonly fit: FitMode;
  readonly opacity: number;
  readonly blend: GlobalCompositeOperation;
  readonly filter: string;
  /** The filter with the built-in shader effects as CSS too, for a painter without WebGL; set when `shaders` has one. */
  readonly fallbackFilter?: string;
  readonly borderRadius: number;
  readonly mask?: MaskSpec;
  /** What `clip`'s rectangles go through before they cut: the camera, for an element under one. */
  readonly clipMatrix?: Matrix2D;
  /** The part shown, in composition pixels (a wipe). */
  readonly clip?: readonly ClipRect[];
  /** Vignette and grain, drawn over the element's own pixels. */
  readonly post?: readonly PostEffect[];
  /** Shader effects (the file's own from `effect()`, and the kit's), run over the element's picture in order. */
  readonly shaders?: readonly ShaderPass[];
  /** A shader transition (the file's own, or the kit's) on this side of it; replaces the look drawn without shaders. */
  readonly transition?: TransitionPass;
  /** With a built-in shader transition: the opacity a crossfade gives, for a painter without WebGL. */
  readonly fallbackOpacity?: number;
  /** The canvas it paints on, when the file's track order needs more than one (`trackBands`); left out for the first. */
  readonly band?: number;
  /**
   * `cutout`: the matte asset decoded beside the footage at the same source time, whose luminance becomes the
   * picture's alpha before its effects. `shrink` and `feather` are in composition pixels.
   */
  readonly matte?: MatteSpec;
}

export interface MatteSpec {
  readonly asset: string;
  readonly shrink: number;
  readonly feather: number;
}

/** A composition background gradient, as the schema writes it. CSS angles: 0 points up, 180 (the default) runs down. */
export interface BackgroundGradient {
  readonly type: "linear" | "radial" | "conic";
  readonly angle?: number;
  readonly center?: { readonly x: number; readonly y: number };
  readonly stops: readonly { readonly offset: number; readonly color: string; readonly opacity?: number }[];
}

export interface FramePlan {
  readonly time: number;
  readonly frame: number;
  readonly background: string;
  /** A gradient that fills the frame instead of `background` (which is then its first colour). */
  readonly backgroundGradient?: BackgroundGradient;
  /** The footage goes over a transparent ground: overlays beneath it (see `backdropTracks`) and the background are drawn under the canvas. */
  readonly clear?: true;
  /** `background.type: "blur"`: this op's picture, blurred to cover the frame, goes under everything. */
  readonly backgroundBlur?: { readonly id: string };
  /** How many canvases the ops are spread over (`DrawOp.band`), when more than one. */
  readonly bands?: number;
  /** A band above the first: an adjustment changes only the pixels already there, not the clear ground around them. */
  readonly atop?: true;
  readonly ops: readonly DrawOp[];
  readonly warnings: readonly string[];
}

export type ResolveNested = (p: Placement) => ResolvedState | null;

/**
 * Everything the painter needs to draw composition time `t`, in draw order.
 * Pure: the same state and time give a deep-equal plan. Each visible item's
 * ops are its kind's (`CANVAS_OPS`); the kinds drawn as DOM have none, and the
 * DOM layer reads `visiblePlacements` itself.
 */
export function buildFramePlan(state: ResolvedState, t: number, resolveNested?: ResolveNested): FramePlan {
  const comp = state.composition;
  const warnings: string[] = [];
  const ops: DrawOp[] = [];
  const { background, backgroundGradient: gradient, blur } = compositionBackground(state);
  const clear = backdropTracks(state).size > 0;
  // shortcut: with overlays beneath the footage the background is a CSS ground under the canvas, so blur shows as its colour; paint the blur on that ground to drop this.
  if (blur && clear) warnings.push("background mode blur is drawn as a colour under backdrop overlays");

  const bands = trackBands(state);
  /** An op on its track's canvas; the first canvas is not written, so a file with one band plans as it always did. */
  const banded = (op: DrawOp, track: string): DrawOp => {
    const band = bands.bandOf.get(track) ?? 0;
    return band > 0 ? { ...op, band } : op;
  };
  for (const item of visiblePlacements(state, t)) {
    const band = bands.bandOf.get(item.track.id) ?? 0;
    const made = CANVAS_OPS[item.placement.kind]?.({ state, t, resolveNested, warnings, ops, band }, item) ?? [];
    for (const op of made) ops.push(banded(op, item.track.id));
  }
  const footage =
    blur && !clear ? ops.find((o) => o.kind === "video" || o.kind === "image" || o.kind === "nested") : undefined;
  return {
    time: t,
    frame: frameIndex(t, comp.rate),
    background,
    ...(gradient ? { backgroundGradient: gradient } : {}),
    ...(clear ? { clear: true as const } : {}),
    ...(footage ? { backgroundBlur: { id: footage.id } } : {}),
    ...(bands.count > 1 ? { bands: bands.count } : {}),
    ops,
    warnings,
  };
}

/**
 * The part of a plan one canvas paints. The first band has the background (or the clear ground over a backdrop);
 * the ones above are clear, so what lies between the canvases shows through. An adjustment covers the footage of
 * every band beneath it as well as its own, so it is in each of them, after their ops.
 */
export function bandPlan(plan: FramePlan, band: number): FramePlan {
  if (!plan.bands) return plan;
  const ops = plan.ops.filter((op) => {
    const own = op.band ?? 0;
    return own === band || (op.kind === "adjustment" && own > band);
  });
  const { backgroundBlur, ...rest } = plan;
  if (band === 0) {
    const blur = backgroundBlur && ops.some((o) => o.id === backgroundBlur.id) ? { backgroundBlur } : {};
    return { ...rest, ...blur, ops };
  }
  return { ...rest, clear: true, atop: true, ops };
}

/** The composition's background as the painter draws it: a colour, or a gradient (whose first colour is `background`). */
export function compositionBackground(state: ResolvedState): {
  background: string;
  backgroundGradient?: BackgroundGradient;
  blur: boolean;
} {
  const bg = state.items.get(state.composition.id)?.props.background as
    | { type?: string; color?: string; gradient?: BackgroundGradient }
    | undefined;
  const gradient = bg?.type === "gradient" && bg.gradient && bg.gradient.stops.length >= 2 ? bg.gradient : undefined;
  return {
    background: bg?.color ?? gradient?.stops[0]?.color ?? "#000000",
    ...(gradient ? { backgroundGradient: gradient } : {}),
    blur: bg?.type === "blur",
  };
}
