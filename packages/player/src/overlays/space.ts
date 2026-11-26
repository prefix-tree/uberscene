import type { ElementBox, Transform } from "@uberscene/kit/schema";
import type { Placement, ResolvedState } from "@uberscene/sdk/resolver";

import { type GraphicAnimation, motionAt } from "../model/motion";
import {
  animatedBox,
  animatedTransform,
  type Box,
  IDENTITY,
  layoutRect,
  type Matrix2D,
  multiply,
} from "../model/transform";
import { overlaySize } from "./size";

/**
 * Where an overlay is placed from: the `frame` its `box` is read in, and the `matrix` that takes that frame's pixels
 * to the composition's (before the camera). Without a `parent` it is the composition itself; with one, it is the
 * parent's box, carried by the parent's transform and entrance, up the chain.
 */
export interface Space {
  readonly frame: Box;
  readonly matrix: Matrix2D;
}

const cache = new WeakMap<ResolvedState, { t: number; spaces: Map<string, Space> }>();

/**
 * The space `p` is placed in at composition time `t`. A parent is evaluated at its own time, held at its first or
 * last moment when `t` is outside it, so a parent need not be on screen for its children to be placed. Opacity, crop
 * and corners are not inherited. A broken chain (an unknown id, a cycle, a resolver error already says so) ends where
 * it breaks.
 */
export function spaceOf(state: ResolvedState, p: Placement, t: number): Space {
  if (typeof p.props.parent !== "string") return { frame: state.composition, matrix: IDENTITY };
  let entry = cache.get(state);
  if (!entry || entry.t !== t) {
    entry = { t, spaces: new Map() };
    cache.set(state, entry);
  }
  return chain(state, p, t, entry.spaces, new Set());
}

function chain(state: ResolvedState, p: Placement, t: number, spaces: Map<string, Space>, seen: Set<string>): Space {
  const known = spaces.get(p.id);
  if (known) return known;
  const parent = typeof p.props.parent === "string" ? state.items.get(p.props.parent) : undefined;
  if (!parent || seen.has(parent.id)) return { frame: state.composition, matrix: IDENTITY };
  seen.add(p.id);
  const outer = chain(state, parent, t, spaces, seen);
  const children = parent.children.flatMap((c) => {
    const item = state.items.get(c);
    return item ? [item] : [];
  });
  const rel = Math.min(Math.max(t - parent.start, 0), parent.duration);
  const props = parent.props as {
    transform?: Transform;
    box?: ElementBox;
    enter?: GraphicAnimation;
    exit?: GraphicAnimation;
  };
  const transform = animatedTransform(props.transform, children, rel);
  const box = animatedBox(props.box, children, rel);
  const { size, fit } = overlaySize(state, parent);
  const layout = layoutRect(outer.frame, size, fit, transform, box);
  const motion = motionAt(props.enter, props.exit, rel, parent.duration, layout.rect.w, layout.rect.h);
  const space: Space = {
    frame: { width: layout.rect.w, height: layout.rect.h },
    matrix: multiply(outer.matrix, multiply(layout.matrix, motion.matrix)),
  };
  spaces.set(p.id, space);
  return space;
}
