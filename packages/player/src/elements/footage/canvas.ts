// What footage paints on the canvas, shared by the kinds that are footage: a clip and a nested sequence. Each kind's
// folder says how its picture is made (`picture`); what is around it is the same for both: its placement and fit,
// its effects and mask, a transition's look over it, the camera of its track, and a dip to black or white.
import { MASK_TYPES, TRANSITION_TYPES } from "@uberscene/kit/schema";
import { type Placement, type PlacementMap, secondsSinceStart } from "@uberscene/sdk/resolver";

import { blendOf } from "../../model/blend";
import { trackCamera } from "../../model/camera";
import type { PlanContext } from "../../model/canvas-ops";
import { postEffects } from "../../model/effects";
import type { DrawOp, MaskSpec } from "../../model/frame-plan";
import { effectPipeline, transitionPass } from "../../model/shaders";
import { frameIndex } from "../../model/time";
import { animatedBox, animatedTransform, type Matrix2D, multiply, translate } from "../../model/transform";
import { transitionLook } from "../../model/transition";
import type { VisibleItem } from "../../model/visible";
import { devWarn } from "../../warn";
import type { CanvasOpsOf } from "../element";

/** The kinds that are footage. */
export type FootageKind = "clip" | "nested";

/** What every footage op holds, whatever its picture: its effects, mask, opacity and a transition's look. */
type FootageCommon = Omit<DrawOp, "kind" | "rect" | "matrix">;

/** What a footage kind's picture is made from: its placement typed by its kind, and what goes around it. */
interface PictureInput<K extends FootageKind> {
  readonly ctx: PlanContext;
  readonly item: VisibleItem & { readonly placement: PlacementMap[K] };
  readonly common: FootageCommon;
  /** Its transform at this moment, with its animated box: what places its picture. */
  readonly transform: ReturnType<typeof animatedTransform>;
  readonly box: ReturnType<typeof animatedBox>;
  /** A transition's slide, put on the picture's matrix. */
  readonly shift: (m: Matrix2D) => Matrix2D;
}

/** How a footage kind's picture is made: the op itself, placed. */
export type Picture<K extends FootageKind> = (input: PictureInput<K>) => DrawOp;

/** The canvas ops of a footage kind whose picture `picture` makes. */
export function footageOps<K extends FootageKind>(picture: Picture<K>): CanvasOpsOf<K> {
  return (ctx, item) => {
    const { state, t, warnings } = ctx;
    const comp = state.composition;
    const p = item.placement;
    const drawn = footageOp(ctx, item, picture);
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
}

function footageOp<K extends FootageKind>(
  ctx: PlanContext,
  item: VisibleItem & { readonly placement: PlacementMap[K] },
  picture: Picture<K>,
): DrawOp {
  const { state, t, warnings } = ctx;
  const p = item.placement;
  const comp = state.composition;
  const rel = secondsSinceStart(p, t);
  const transform = animatedTransform(p.props.transform, item.children, rel);
  const box = animatedBox(p.props.box, item.children, rel);
  const fit = p.props.fit ?? "contain";
  let opacity = (transform.opacity ?? 1) * (p.props.blendOpacity ?? 1);
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
  const common: FootageCommon = {
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
  return picture({ ctx, item, common, transform, box, shift });
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
