import type { ElementBox, Transform } from "@uberscene/kit/schema";
import {
  followOf,
  lengthSeconds,
  type Placement,
  type RefEdge,
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

/** What every reference read at a frame gives, at one moment: worked out once, for whatever draws that frame. */
export interface RefsAt {
  /** The space of each overlay that follows another. */
  readonly spaces: ReadonlyMap<string, Space>;
}

/** What is being filled in while a frame's references are read. */
interface Reading {
  readonly spaces: Map<string, Space>;
}

/**
 * How each kind of reference read at a frame is read: given the state, one reference and the moment, it adds what
 * the holder gets to the reading. A new kind of frame-time reference is an entry here.
 */
const FRAME_REFS: Readonly<Record<string, (state: ResolvedState, edge: RefEdge, t: number, into: Reading) => void>> = {
  follow: (state, edge, t, into) => {
    const p = state.items.get(edge.from);
    const space = p && followOf(p) !== undefined ? spaceIn(state, p, t, into.spaces) : undefined;
    if (space) into.spaces.set(edge.from, space);
  },
};

/**
 * Every reference read at a frame, at composition time `t`, in one pass. Pure: the same state and time give the same
 * result. The holders come in the order of the reference graph (`state.refs.order`), each after what it names, so
 * one pass reads them all; in a circle (the resolver already says so) the first one is read as if it named nothing.
 */
export function refsAt(state: ResolvedState, t: number): RefsAt {
  const into: Reading = { spaces: new Map() };
  for (const id of state.refs.order.space)
    for (const edge of state.refs.from.get(id) ?? []) FRAME_REFS[edge.type]?.(state, edge, t, into);
  return into;
}

/** The space of every overlay that follows another, at composition time `t`: the `spaces` of `refsAt`. */
export function spacesAt(state: ResolvedState, t: number): ReadonlyMap<string, Space> {
  return refsAt(state, t).spaces;
}

/** The space `p` is placed in at composition time `t`, for a caller that places one element. Pure. */
export function spaceOf(state: ResolvedState, p: Placement, t: number): Space {
  if (followOf(p) === undefined) return rootSpace(state);
  // The elements it follows, up the chain, then each placed from the top down. A chain that comes back on itself
  // (the resolver already says so) ends where it does.
  const up: Placement[] = [];
  const seen = new Set<string>();
  for (let at: Placement | undefined = p; at && followOf(at) !== undefined && !seen.has(at.id); ) {
    up.push(at);
    seen.add(at.id);
    at = state.items.get(followOf(at) as string);
    if (at && seen.has(at.id)) up.pop();
  }
  const spaces = new Map<string, Space>();
  for (const at of up.reverse()) {
    const space = spaceIn(state, at, t, spaces);
    if (space) spaces.set(at.id, space);
  }
  return spaces.get(p.id) ?? rootSpace(state);
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

/**
 * The space `p` is placed in: the box of the element it follows, carried by that element's transform, entrance and
 * exit, inside that element's own space, which `spaces` holds when it follows something too. Undefined when what it
 * follows does not exist.
 */
function spaceIn(state: ResolvedState, p: Placement, t: number, spaces: ReadonlyMap<string, Space>): Space | undefined {
  const leader = state.items.get(followOf(p) ?? "") as OverlayPlacement | undefined;
  if (!leader) return undefined;
  const outer = spaces.get(leader.id) ?? rootSpace(state);
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
  return {
    frame: { width: layout.rect.w, height: layout.rect.h },
    matrix: multiply(outer.matrix, multiply(layout.matrix, motion.matrix)),
    isRoot: false,
  };
}
