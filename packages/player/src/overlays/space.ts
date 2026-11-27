import type { ElementBox, Transform } from "@uberscene/kit/schema";
import {
  followOf,
  lengthSeconds,
  type Placement,
  type ResolvedState,
  secondsSinceStart,
} from "@uberscene/sdk/resolver";

import { DEFAULT_DURATION, type GraphicAnimation, motionAt } from "../model/motion";
import {
  animatedBox,
  animatedTransform,
  type Box,
  IDENTITY,
  layoutRect,
  type Matrix2D,
  multiply,
} from "../model/transform";
import { childrenOf, overlaySize } from "./size";

/**
 * Where an overlay is placed from: the `frame` its `box` is read in, and the `matrix` that takes that frame's pixels
 * to the composition's (before the camera). Without a `follow` it is the composition itself (`isRoot`); with one, it
 * is the followed element's box, carried by that element's transform, entrance and exit, up the chain.
 */
export interface Space {
  readonly frame: Box;
  readonly matrix: Matrix2D;
  readonly isRoot: boolean;
}

/** The composition as a space: what an overlay that follows nothing is placed in. */
export function rootSpace(state: ResolvedState): Space {
  return { frame: state.composition, matrix: IDENTITY, isRoot: true };
}

/** The props of an overlay the chain reads. */
interface OverlayPlacement extends Placement {
  readonly props: Placement["props"] & {
    readonly transform?: Transform;
    readonly box?: ElementBox;
    readonly enter?: GraphicAnimation;
    readonly exit?: GraphicAnimation;
  };
}

/**
 * The space of every overlay that follows another, at composition time `t`, worked out once: what a frame of the
 * player hands each element it draws. Pure: the same state and time give the same map.
 */
export function spacesAt(state: ResolvedState, t: number): ReadonlyMap<string, Space> {
  const spaces = new Map<string, Space>();
  for (const p of state.items.values()) if (followOf(p) !== undefined) chain(state, p, t, spaces, new Set());
  return spaces;
}

/** The space `p` is placed in at composition time `t`, for a caller that places one element. Pure. */
export function spaceOf(state: ResolvedState, p: Placement, t: number): Space {
  return followOf(p) === undefined ? rootSpace(state) : chain(state, p, t, new Map(), new Set());
}

/**
 * The moment of `leader` that carries its followers at composition time `t`. Inside its time, that time. Outside it,
 * it holds where it stands once its entrance is done (before it starts) or before its exit begins (after it ends), so
 * a follower is not left carried off screen by an entrance not yet played or an exit already over.
 */
function heldRel(leader: OverlayPlacement, t: number): number {
  const rel = secondsSinceStart(leader, t);
  const length = (a: GraphicAnimation | undefined): number =>
    a && a.type !== "none" ? Math.max(0, a.duration ?? DEFAULT_DURATION) : 0;
  if (rel < 0) return Math.min(length(leader.props.enter), lengthSeconds(leader));
  if (rel > lengthSeconds(leader)) return Math.max(0, lengthSeconds(leader) - length(leader.props.exit));
  return rel;
}

function chain(state: ResolvedState, p: Placement, t: number, spaces: Map<string, Space>, seen: Set<string>): Space {
  const known = spaces.get(p.id);
  if (known) return known;
  const leader = state.items.get(followOf(p) ?? "") as OverlayPlacement | undefined;
  // A broken chain (an unknown id, a cycle: the resolver already says so) ends where it breaks.
  if (!leader || seen.has(leader.id)) return rootSpace(state);
  seen.add(p.id);
  const outer = followOf(leader) === undefined ? rootSpace(state) : chain(state, leader, t, spaces, seen);
  const children = childrenOf(state, leader);
  const rel = heldRel(leader, t);
  const transform = animatedTransform(leader.props.transform, children, rel);
  const box = animatedBox(leader.props.box, children, rel);
  const { size, fit } = overlaySize(state, leader, children, rel);
  const layout = layoutRect(outer.frame, size, fit, transform, box);
  const motion = motionAt(
    leader.props.enter,
    leader.props.exit,
    rel,
    lengthSeconds(leader),
    layout.rect.w,
    layout.rect.h,
  );
  const space: Space = {
    frame: { width: layout.rect.w, height: layout.rect.h },
    matrix: multiply(outer.matrix, multiply(layout.matrix, motion.matrix)),
    isRoot: false,
  };
  spaces.set(p.id, space);
  return space;
}
