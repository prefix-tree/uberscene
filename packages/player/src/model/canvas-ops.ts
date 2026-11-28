// What each kind paints on the canvas at a moment. `buildFramePlan` asks this table for every visible item, in draw
// order; a kind with no entry paints nothing there (the DOM layer draws the overlays). A kind with a folder of its own
// says its ops there (`elements/<kind>/canvas.ts`); the footage kinds (a clip, a nested composition) are here.

import { type ElementBox, type FitMode, MASK_TYPES, TRANSITION_TYPES, type Transform } from "@uberscene/kit/schema";
import {
  type AssetEntry,
  lookupAsset,
  type Placement,
  type ResolvedState,
  secondsSinceStart,
} from "@uberscene/sdk/resolver";

import { ELEMENT_CANVAS } from "../elements/canvas";
import { devWarn } from "../warn";
import { blendOf } from "./blend";
import { trackCamera } from "./camera";
import { postEffects } from "./effects";
import type { DrawOp, MaskSpec, MatteSpec, ResolveNested } from "./frame-plan";
import { effectPipeline, transitionPass } from "./shaders";
import { frameIndex, nestedSourceTime, placementSourceTime } from "./time";
import { animatedBox, animatedTransform, layoutRect, type Matrix2D, multiply, translate } from "./transform";
import { transitionLook } from "./transition";
import type { VisibleItem } from "./visible";

/** What a kind's ops are planned from: the state and the moment, and what the plan holds so far. */
export interface PlanContext {
  readonly state: ResolvedState;
  readonly t: number;
  readonly resolveNested: ResolveNested | undefined;
  /** What the plan could not draw as written; an op function adds to it. */
  readonly warnings: string[];
  /** The ops planned before this item, beneath it. */
  readonly ops: readonly DrawOp[];
  /** The canvas the item's track paints on (`trackBands`); 0 is the first. */
  readonly band: number;
}

/** The ops one visible item paints, in order. They are put on the item's band by the plan. */
export type CanvasOps = (ctx: PlanContext, item: VisibleItem) => readonly DrawOp[];

/** Footage: the picture itself, under the camera of its track, and a dip to black or white over it when its transition is one. */
const footageOps: CanvasOps = (ctx, item) => {
  const { state, t, warnings } = ctx;
  const comp = state.composition;
  const p = item.placement;
  const drawn = mediaOp(state, item, t, ctx.resolveNested, warnings);
  const view = trackCamera(state, item.track.id, t);
  // The camera goes on last, over the element's own placement and a transition's slide, so both follow the view.
  const op = view
    ? { ...drawn, matrix: multiply(view, drawn.matrix), ...(drawn.clip ? { clipMatrix: view } : {}) }
    : drawn;
  if (op.blend !== "source-over" && ctx.band > 0)
    warnings.push(
      `"${p.id}" blends with the footage on its own run of tracks only: an overlay track sits between it and the footage beneath`,
    );
  const dip = item.transition && !op.transition && transitionLook(item.transition, comp.width, comp.height).dip;
  return dip ? [op, dipOp(item.transition!.placement, dip, comp.width, comp.height)] : [op];
};

export const CANVAS_OPS: Readonly<Record<string, CanvasOps>> = {
  // The kinds with a folder of their own (`elements/<kind>/canvas.ts`).
  ...ELEMENT_CANVAS,
  clip: footageOps,
  nested: footageOps,
};

function mediaOp(
  state: ResolvedState,
  item: VisibleItem,
  t: number,
  resolveNested: ResolveNested | undefined,
  warnings: string[],
): DrawOp {
  const p = item.placement;
  const comp = state.composition;
  const rel = secondsSinceStart(p, t);
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
