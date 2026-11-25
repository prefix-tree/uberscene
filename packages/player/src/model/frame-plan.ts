import {
  type BlendMode,
  type ElementBox,
  type FitMode,
  MASK_TYPES,
  TRANSITION_TYPES,
  type Transform,
} from "@uberscene/kit/schema";
import { type AssetEntry, lookupAsset, type Placement, type ResolvedState } from "@uberscene/sdk/resolver";

import { devWarn } from "../warn";
import { backdropTracks, trackBands } from "./backdrop";
import { type PostEffect, postEffects } from "./effects";
import type { ClipRect } from "./motion";
import { effectPipeline, type ShaderPass, type TransitionPass, transitionPass } from "./shaders";
import { frameIndex, nestedSourceTime, placementSourceTime } from "./time";
import {
  animatedBox,
  animatedTransform,
  type DrawRect,
  layoutRect,
  type Matrix2D,
  multiply,
  translate,
} from "./transform";
import { transitionLook } from "./transition";
import { type VisibleItem, visiblePlacements } from "./visible";

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

const BLEND_TO_CANVAS: Readonly<Record<BlendMode, GlobalCompositeOperation>> = {
  normal: "source-over",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  darken: "darken",
  lighten: "lighten",
  colorDodge: "color-dodge",
  colorBurn: "color-burn",
  hardLight: "hard-light",
  softLight: "soft-light",
  difference: "difference",
  exclusion: "exclusion",
  hue: "hue",
  saturation: "saturation",
  color: "color",
  luminosity: "luminosity",
  add: "lighter",
  linearDodge: "lighter",
};

export function blendOf(value: unknown): GlobalCompositeOperation {
  return BLEND_TO_CANVAS[value as BlendMode] ?? "source-over";
}

/**
 * Everything the painter needs to draw composition time `t`, in draw order.
 * Pure: the same state and time give a deep-equal plan. DOM-rendered kinds
 * (title, shape, svg, sticker, layer, captions) are not in it; the DOM layer
 * reads `visiblePlacements` itself.
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
    const p = item.placement;
    if (p.kind === "clip" || p.kind === "nested") {
      const op = mediaOp(state, item, t, resolveNested, warnings);
      if (op) ops.push(banded(op, item.track.id));
      if (op && op.blend !== "source-over" && (bands.bandOf.get(item.track.id) ?? 0) > 0)
        warnings.push(
          `"${p.id}" blends with the footage on its own run of tracks only: an overlay track sits between it and the footage beneath`,
        );
      const dip = item.transition && !op?.transition && transitionLook(item.transition, comp.width, comp.height).dip;
      if (op && dip) ops.push(banded(dipOp(item.transition!.placement, dip, comp.width, comp.height), item.track.id));
    } else if (p.kind === "adjustment") {
      if (p.props.enabled === false) continue;
      const { shaders, ...filters } = effectPipeline(state, item.children, p.id, t - p.start, { shaders: true });
      if (ops.length === 0) continue;
      // Vignette and grain darken and speckle everything beneath, before the adjustment's other effects.
      const post = postEffects(state.items, item.children, frameIndex(t, comp.rate), t - p.start);
      ops.push(
        banded(
          {
            id: p.id,
            kind: "adjustment",
            rect: { x: 0, y: 0, w: comp.width, h: comp.height },
            matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
            fit: "stretch",
            opacity: Number(p.props.opacity ?? 1),
            blend: blendOf(p.props.blend),
            ...filters,
            borderRadius: 0,
            ...(post ? { post } : {}),
            ...(shaders ? { shaders } : {}),
          },
          item.track.id,
        ),
      );
    }
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

function mediaOp(
  state: ResolvedState,
  item: VisibleItem,
  t: number,
  resolveNested: ResolveNested | undefined,
  warnings: string[],
): DrawOp | null {
  const p = item.placement;
  const comp = state.composition;
  const rel = t - p.start;
  const transform = animatedTransform(p.props.transform as Transform | undefined, item.children, rel);
  const box = animatedBox(p.props.box as ElementBox | undefined, item.children, rel);
  const fit = (p.props.fit as FitMode | undefined) ?? "contain";
  let opacity = (transform.opacity ?? 1) * (typeof p.props.blendOpacity === "number" ? p.props.blendOpacity : 1);
  let look: ReturnType<typeof transitionLook> | undefined;
  const shaded = item.transition ? transitionPass(state, item.transition) : undefined;
  if (item.transition && !shaded) {
    const x = item.transition.placement;
    const type = String(x.props.type ?? "crossfade");
    if (!(TRANSITION_TYPES as readonly string[]).includes(type)) {
      const key = `transition:${x.id}:${type}`;
      devWarn(key, `transition "${type}" on "${x.id}" is drawn as a crossfade`);
      warnings.push(`transition ${x.id}: ${type} drawn as crossfade`);
    }
    // A crossfade between two clips fades the incoming one over the outgoing one, which stays opaque:
    // (1 − p)·A + p·B. Only an edge transition fades a clip against the background.
    look = transitionLook(item.transition, comp.width, comp.height);
    opacity *= look.opacity;
  }
  const { shaders, ...filters } = effectPipeline(state, item.children, p.id, rel, {
    shaders: true,
    transition: shaded !== undefined,
  });
  const mask = maskOf(item.children, warnings);
  const post = postEffects(state.items, item.children, frameIndex(t, comp.rate), rel);
  const common = {
    id: p.id,
    fit,
    opacity,
    blend: blendOf(p.props.blend),
    ...filters,
    borderRadius: transform.borderRadius ?? 0,
    ...(mask ? { mask } : {}),
    ...(look?.clip ? { clip: look.clip } : {}),
    ...(post ? { post } : {}),
    ...(shaders ? { shaders } : {}),
    ...(shaded ? { transition: shaded } : {}),
    // A built-in shader transition crossfades where there is no WebGL: the opacity a crossfade has here (its default look).
    ...(shaded?.builtIn && item.transition
      ? { fallbackOpacity: opacity * transitionLook(item.transition, comp.width, comp.height).opacity }
      : {}),
  };
  const shift = (m: Matrix2D): Matrix2D => (look?.offset ? multiply(translate(look.offset.x, look.offset.y), m) : m);

  if (p.kind === "nested") {
    const nested = resolveNested?.(p) ?? null;
    if (!nested) {
      warnings.push(`nested ${p.id}: no resolver`);
      const layout = layoutRect(comp, comp, fit, transform, box);
      return { ...common, kind: "error", rect: layout.rect, matrix: shift(layout.matrix) };
    }
    const layout = layoutRect(comp, nested.composition, fit, transform, box);
    return {
      ...common,
      kind: "nested",
      nested: { state: nested, time: nestedSourceTime(p, t) },
      rect: layout.rect,
      matrix: shift(layout.matrix),
      ...(layout.crop ? { crop: layout.crop } : {}),
    };
  }
  const src = p.source;
  const asset = src ? lookupAsset(state.manifest, src.asset) : null;
  if (!src || !asset) {
    const layout = layoutRect(comp, comp, "contain", transform, box);
    return {
      ...common,
      kind: "error",
      ...(src ? { asset: src.asset } : {}),
      rect: layout.rect,
      matrix: shift(layout.matrix),
    };
  }
  const size = { width: asset.width ?? comp.width, height: asset.height ?? comp.height };
  const layout = layoutRect(comp, size, fit, transform, box);
  const matte = matteOf(state, p, asset);
  return {
    ...common,
    kind: asset.kind === "image" ? "image" : "video",
    asset: asset.id,
    sourceTime: placementSourceTime(p, item.children, t),
    rect: layout.rect,
    matrix: shift(layout.matrix),
    ...(layout.crop ? { crop: layout.crop, cropReference: size } : {}),
    ...(matte ? { matte } : {}),
  };
}

/** The matte a clip's `cutout` cuts with: only for footage whose matte is a video in the manifest (the resolver reports the rest). */
export function matteOf(state: ResolvedState, p: Placement, asset: AssetEntry): MatteSpec | null {
  const cutout = p.props.cutout;
  if (cutout === undefined || cutout === false || p.kind !== "clip" || asset.kind !== "video" || !asset.matte)
    return null;
  if (lookupAsset(state.manifest, asset.matte)?.kind !== "video") return null;
  const given =
    typeof cutout === "object" && cutout !== null ? (cutout as { shrink?: unknown; feather?: unknown }) : {};
  const px = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
  return { asset: asset.matte, shrink: px(given.shrink), feather: px(given.feather) };
}

/** A dip to black or white over everything drawn so far: an adjustment that maps the picture to the colour, `amount` of the way. */
function dipOp(x: Placement, amount: number, width: number, height: number): DrawOp {
  return {
    id: x.id,
    kind: "adjustment",
    rect: { x: 0, y: 0, w: width, h: height },
    matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    fit: "stretch",
    opacity: amount,
    blend: "source-over",
    filter: x.props.type === "dipToWhite" ? "brightness(0) invert(1)" : "brightness(0)",
    borderRadius: 0,
  };
}

function maskOf(children: readonly Placement[], warnings: string[]): MaskSpec | undefined {
  const m = children.find((c) => c.kind === "mask");
  if (!m) return undefined;
  if (!(MASK_TYPES as readonly unknown[]).includes(m.props.type ?? "shape")) {
    warnings.push(`mask ${m.id}: type ${String(m.props.type)} is not rendered`);
    return undefined;
  }
  return {
    shape: m.props.shape as Record<string, unknown> | undefined,
    path: m.props.path as MaskSpec["path"],
    feather: Number(m.props.feather ?? 0),
    inverted: m.props.inverted === true,
    opacity: Number(m.props.opacity ?? 1),
  };
}
