import { capabilitiesOf, secondsToTicks } from "@uberscene/kit/schema";
import {
  endTicks,
  lengthSeconds,
  type Placement,
  type ResolvedState,
  type ResolvedTrack,
  secondsSinceStart,
  startSeconds,
  startTicks,
} from "@uberscene/sdk/resolver";

import { ease } from "./keyframes";

export interface TransitionRole {
  readonly placement: Placement;
  readonly role: "out" | "in";
  /** 0..1 through the transition, eased by its curve. */
  readonly progress: number;
}

export interface VisibleItem {
  readonly placement: Placement;
  readonly track: ResolvedTrack;
  readonly children: readonly Placement[];
  readonly transition?: TransitionRole;
}

/**
 * Visual, timed placements that show at `t`: tracks in document order (the first track is the bottom), items in track
 * order. An element whose props did not parse (`parsed` false) is left out: it has errors and a row, and no picture,
 * since what draws it reads its props as their types.
 */
export function visiblePlacements(state: ResolvedState, t: number): VisibleItem[] {
  const out: VisibleItem[] = [];
  const tracks = [...state.tracks].sort((a, b) => a.order - b.order);
  for (const track of tracks) {
    if (track.hidden) continue;
    const roles = transitionRoles(state, track, t);
    for (const placement of trackItems(state, track)) {
      const caps = capabilitiesOf(placement.kind);
      if (!caps.visual || !caps.timed || caps.sequenceRole === "between") continue;
      if (!placement.parsed) continue;
      if (!isVisibleAt(placement, t, state.composition.duration)) continue;
      const role = roles.get(placement.id);
      out.push({
        placement,
        track,
        children: placement.children.map((id) => state.items.get(id)).filter((c): c is Placement => c !== undefined),
        ...(role ? { transition: role } : {}),
      });
    }
  }
  return out;
}

/**
 * Whether a placement shows at `t`: from its start up to, not including, its end. The times are compared in ticks, not
 * as doubles, because a sequence adds its lengths up in seconds: clips of 0.1 s and 0.2 s end at 0.30000000000000004,
 * which as a double is after frame 9's start at 30 fps, and the old clip would show for one frame more at the cut.
 */
export function isVisibleAt(p: Placement, t: number, compositionDuration: number): boolean {
  const at = secondsToTicks(t);
  const start = startTicks(p);
  const end = endTicks(p);
  if (at >= start && at < end) return true;
  return at === secondsToTicks(compositionDuration) && end === at && end > start;
}

/** Placements that sit on a track, in track order; a multicam's generated clips follow their parent. */
export function trackItems(state: ResolvedState, track: ResolvedTrack): Placement[] {
  const out: Placement[] = [];
  for (const id of track.items) {
    const p = state.items.get(id);
    if (!p) continue;
    if (p.kind === "multicam") {
      const generated = [...state.items.values()]
        .filter((q) => q.parent === id && q.kind === "clip")
        .sort((a, b) => startSeconds(a) - startSeconds(b));
      out.push(...generated);
      continue;
    }
    out.push(p);
  }
  return out;
}

function transitionRoles(state: ResolvedState, track: ResolvedTrack, t: number): Map<string, TransitionRole> {
  const roles = new Map<string, TransitionRole>();
  for (const id of track.items) {
    const x = state.items.get(id);
    if (x?.kind !== "transition" || lengthSeconds(x) <= 0) continue;
    const at = secondsToTicks(t);
    if (at < startTicks(x) || at >= endTicks(x)) continue;
    const params = (x.props.params ?? {}) as Record<string, unknown>;
    const progress = ease(
      typeof params.curve === "string" ? params.curve : "linear",
      secondsSinceStart(x, t) / lengthSeconds(x),
    );
    if (x.between) {
      roles.set(x.between[0], { placement: x, role: "out", progress });
      roles.set(x.between[1], { placement: x, role: "in", progress });
    } else if (typeof x.props.on === "string") {
      roles.set(x.props.on, { placement: x, role: x.props.edge === "in" ? "in" : "out", progress });
    }
  }
  return roles;
}
