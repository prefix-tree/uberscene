// What removing something does to what names it. Each way to refer (an entry of `REF_KINDS`) has its repair here:
// the actions that leave its holders sound once the element, marker or track they name is gone. A removal runs the
// repairs of every reference to what goes, in the order they are listed, so a new way to refer adds its repair to
// this list and nothing to the removals themselves.
import {
  BOX_ORIGIN_POINT,
  type BoxOrigin,
  type CurveKey,
  capabilitiesOf,
  curveAt,
  isSequenceItem,
  type Kind,
  round3,
  Time,
  tidySeconds,
} from "@uberscene/kit/schema";

import type { Json } from "../patches/types";
import { dependentsOf } from "../resolve/dependents";
import { followOf } from "../resolve/follow";
import { nodeIn } from "../resolve/overlay";
import { ownRestBox, restBox } from "../resolve/push";
import type { RefEdge, RefName } from "../resolve/refs";
import type { Placement, ResolvedState } from "../resolve/resolve";
import { lengthSeconds, S } from "../time";
import { writePath } from "./handler-kit";
import type { ActionInput } from "./types";

/** What goes, in a file as it stood before. */
interface Removal {
  /** The element, marker or track removed. */
  readonly id: string;
  /** Everything that goes: it, and with a track its elements. No repair is made for a holder that goes too. */
  readonly gone: ReadonlySet<string>;
  readonly before: ResolvedState;
}

/**
 * What a removal is of: an element, a marker, a track, or `trackItems`, the elements that go with a track. An
 * element that goes with its track is not repaired as one removed alone: only what could not stand is.
 */
type Going = "element" | "marker" | "track" | "trackItems";

/** The repair of one or more ways to refer, for the removals it is made in. */
interface Repair {
  /** The ways to refer it repairs. None: it repairs something that names nothing (a transition beside a clip). */
  readonly refs: readonly RefName[];
  readonly when: readonly Going[];
  /** The actions that repair these references to what goes, which are in file order. */
  readonly repair: (edges: readonly RefEdge[], removal: Removal) => ActionInput[];
}

export const setProps = (id: string, props: Record<string, Json | undefined>): ActionInput => ({
  type: "source/setProps",
  params: { id, props },
});

/** Whether a sibling on a track is something placed there, not a transition or a gap. */
export const onTrack = (kind: Kind | undefined): boolean => kind !== undefined && isSequenceItem(kind);

/** The clip before `id` on its track, skipping transitions and gaps. */
export function clipBefore(state: ResolvedState, id: string): Placement | undefined {
  const track = state.tracks.find((t) => t.items.includes(id));
  const siblings = track ? (nodeIn(state.tree, track.id)?.children ?? []) : [];
  for (let i = siblings.findIndex((c) => c.id === id) - 1; i >= 0; i--) {
    const kind = siblings[i]?.kind;
    if (onTrack(kind)) return state.items.get(siblings[i]!.id);
  }
  return undefined;
}

/** Whether what follows `id` on its track, past any transitions, is a clip a transition can join (not a gap). */
function hasClipAfter(state: ResolvedState, id: string): boolean {
  const track = state.tracks.find((t) => t.items.includes(id));
  const siblings = track ? (nodeIn(state.tree, track.id)?.children ?? []) : [];
  const next = siblings
    .slice(siblings.findIndex((c) => c.id === id) + 1)
    .find((c) => capabilitiesOf(c.kind).sequenceRole !== "between");
  return next !== undefined && capabilitiesOf(next.kind).sequenceRole !== "empty";
}

/** The holders anchored to what goes that go with it: all of them, when no clip stands before it to take them. */
function leftWithNothing(removal: Removal): ReadonlySet<string> {
  const out = new Set<string>();
  if (clipBefore(removal.before, removal.id)) return out;
  for (const edge of removal.before.refs.to.get(removal.id) ?? [])
    if (edge.type === "anchor" && !removal.gone.has(edge.from)) out.add(edge.from);
  return out;
}

/**
 * The repairs, in the order a removal makes them. Every way to refer is in one of them: `Unrepaired` below does not
 * compile otherwise, and names the one left out.
 */
const REPAIRS = [
  {
    // A length that follows what goes becomes the seconds it was.
    refs: ["match", "until"],
    when: ["element"],
    repair: (edges, removal) => {
      const dropped = leftWithNothing(removal);
      const out: ActionInput[] = [];
      for (const edge of edges) {
        const p = removal.before.items.get(edge.from);
        if (p && !dropped.has(edge.from)) out.push(setProps(edge.from, { duration: lengthSeconds(p) }));
      }
      return out;
    },
  },
  {
    // An overlay that followed it follows what it followed, or nothing, and stays where it was drawn.
    refs: ["follow"],
    when: ["element"],
    repair: (edges, removal) => {
      const dropped = leftWithNothing(removal);
      return edges
        .filter((edge) => !dropped.has(edge.from))
        .map((edge) => unfollow(edge.from, removal.id, removal.before));
    },
  },
  {
    // What starts from it moves to the clip before it on its track, keeping its time on the timeline where that
    // clip is still playing, and otherwise held inside it; with no clip before, it is removed too.
    refs: ["anchor"],
    when: ["element"],
    repair: (edges, removal) => {
      const prev = clipBefore(removal.before, removal.id);
      const out: ActionInput[] = [];
      for (const edge of edges) {
        const p = removal.before.items.get(edge.from);
        if (!p) continue;
        if (!prev) {
          out.push({ type: "element/remove", params: { id: edge.from } });
          continue;
        }
        const room = Time.max(Time.ZERO, prev.range.duration.minus(p.range.duration));
        const offset = S(Time.min(room, Time.max(Time.ZERO, p.range.start.minus(prev.range.start))));
        out.push(setProps(edge.from, { anchor: prev.id, at: undefined, offset }));
      }
      return out;
    },
  },
  {
    // A transition placed on one of its edges goes with it.
    refs: ["on"],
    when: ["element"],
    repair: (edges) => edges.map((edge) => ({ type: "transition/remove", params: { transitionId: edge.from } })),
  },
  {
    // A transition beside it, left with nothing on one side, is removed. With a clip on each side once this one is
    // gone, one transition still joins them: the one before it, if any.
    refs: [],
    when: ["element"],
    repair: (_edges, removal) => {
      const beside = dependentsOf(removal.before, removal.id).filter((d) => d.kind === "beside");
      const joins = clipBefore(removal.before, removal.id) !== undefined && hasClipAfter(removal.before, removal.id);
      const kept = joins ? (beside.find((d) => d.side === "before") ?? beside[0]) : undefined;
      return beside
        .filter((d) => d !== kept)
        .map((d) => ({ type: "transition/remove", params: { transitionId: d.id } }));
    },
  },
  {
    // A camera's push stops naming it.
    refs: ["push"],
    when: ["element", "trackItems"],
    repair: (edges, removal) => pushWithout(edges, removal),
  },
  {
    // A value linked to one of its values keeps moving as it did.
    refs: ["link"],
    when: ["element", "trackItems"],
    repair: (edges, removal) => linksFrozen(edges, removal.before),
  },
  {
    // A time written as a marker becomes the seconds the marker stood at.
    refs: ["marker", "sceneTime"],
    when: ["marker"],
    repair: (edges, removal) => {
      const { before } = removal;
      const at = before.tree.byId.get(removal.id)?.props.start;
      if (typeof at !== "number") return [];
      const seconds = tidySeconds(at);
      const byHolder = new Map<string, Record<string, Json | undefined>>();
      for (const edge of edges) {
        const props = byHolder.get(edge.from) ?? {};
        byHolder.set(edge.from, props);
        if (edge.type === "marker") props[edge.prop] = seconds;
        else {
          const written = (before.tree.byId.get(edge.from)?.props.times ?? {}) as Record<string, Json>;
          const times = (props.times ?? { ...written }) as Record<string, Json>;
          times[edge.prop.slice("times.".length)] = seconds;
          props.times = times;
        }
      }
      return [...byHolder].map(([holder, props]) => setProps(holder, props));
    },
  },
  {
    // A sound that ducked under the track, and under nothing else, loses its duck: one that names a role other
    // tracks still have keeps it.
    refs: ["duck"],
    when: ["track"],
    repair: (edges, removal) => {
      const out: ActionInput[] = [];
      for (const edge of edges) {
        const others = (removal.before.refs.from.get(edge.from) ?? []).some(
          (e) => e.type === "duck" && e.to !== removal.id,
        );
        if (!others) out.push({ type: "audio/setDuck", params: { id: edge.from, duck: undefined } } as ActionInput);
      }
      return out;
    },
  },
] as const satisfies readonly Repair[];

/** A way to refer with no repair: adding one to `REF_KINDS` without saying what its removal does stops here. */
type Unrepaired = Exclude<RefName, (typeof REPAIRS)[number]["refs"][number]>;
const everyReferenceIsRepaired: [Unrepaired] extends [never] ? true : { readonly unrepaired: Unrepaired } = true;
void everyReferenceIsRepaired;

/**
 * The actions that repair what names `id`, which is about to go: an element, a marker or a track of `before`. The
 * references to it are read from the graph, each repaired as its way to refer says, in the order of `REPAIRS`. With a
 * track go its elements, and what names those is repaired where a repair says it is made for them too.
 */
export function repairsOf(what: "element" | "marker" | "track", id: string, before: ResolvedState): ActionInput[] {
  const items = what === "track" ? (before.tracks.find((t) => t.id === id)?.items ?? null) : [];
  if (items === null) return [];
  const removal: Removal = { id, gone: new Set([id, ...items]), before };
  const out: ActionInput[] = [];
  const run = (going: Going, ids: readonly string[]): void => {
    const edges = ids.flatMap((to) => before.refs.to.get(to) ?? []).filter((edge) => !removal.gone.has(edge.from));
    for (const entry of REPAIRS as readonly Repair[]) {
      if (!entry.when.includes(going)) continue;
      const mine = edges.filter((edge) => (entry.refs as readonly string[]).includes(edge.type));
      if (mine.length > 0 || entry.refs.length === 0) out.push(...entry.repair(mine, removal));
    }
  };
  run(what, [id]);
  if (what === "track") run("trackItems", items);
  return out;
}

/**
 * The elements with a value linked to a value of something that goes (`edges`), each with what the link gave written in its place: the
 * keys the resolver made for it (`lowerLinks`), and the wobble, drift or loop on them. A value linked to an element
 * that goes keeps moving as it did. Keys that fell before the element's start are cut there, and a wobble or a
 * drift is written as a generator of the element's own, on its own clock: the same motion, not always the same phase.
 */
function linksFrozen(edges: readonly RefEdge[], before: ResolvedState): ActionInput[] {
  const byHolder = new Map<string, { working: Record<string, unknown>; out: Record<string, Json | undefined> }>();
  for (const edge of edges) {
    const held = byHolder.get(edge.from) ?? {
      working: { ...(before.tree.byId.get(edge.from)?.props ?? {}) },
      out: {},
    };
    byHolder.set(edge.from, held);
    const w = writePath(held.working, edge.prop, linkAsWritten(edge.from, edge.prop, before));
    if (w.value === undefined) delete held.working[w.prop];
    else held.working[w.prop] = w.value;
    held.out[w.prop] = w.value;
  }
  return [...byHolder].map(([holder, { out }]) => setProps(holder, out));
}

/** What the link at `path` of `holder` reads, as a file writes it: a number, keys, or a generator over them. */
function linkAsWritten(holder: string, path: string, before: ResolvedState): Json | undefined {
  const base = `${holder}.${path}.link`;
  const keys: CurveKey[] = [];
  for (let i = 0; before.items.has(`${base}.${i}`); i++) {
    const k = before.items.get(`${base}.${i}`) as Placement;
    keys.push({ at: Number(k.props.at), value: k.props.value, easing: k.props.easing as string | undefined });
  }
  if (keys.length === 0) return undefined;
  keys.sort((a, b) => a.at - b.at);
  // A file's keys start at the element's start: what came before is where the value stood then.
  const early = keys.filter((k) => k.at <= 0);
  const rest = keys.filter((k) => k.at > 0);
  const kept: CurveKey[] =
    early.length === 0 ? rest : [{ ...(early.at(-1) as CurveKey), at: 0, value: curveAt(keys, 0) }, ...rest];
  const constant = kept.every((k) => k.value === kept[0]?.value);
  const list = kept.map((k) => ({
    at: tidySeconds(k.at),
    value: k.value as Json,
    ...(k.easing !== undefined && k.easing !== "linear" ? { easing: k.easing } : {}),
  }));
  const over: Json = constant ? (kept[0]?.value as Json) : list;
  const g = before.items.get(`${base}.generator`)?.props;
  if (g?.type === "wiggle")
    return {
      type: "wiggle",
      base: over,
      amount: g.amount as number,
      ...(g.frequency !== undefined ? { frequency: g.frequency as number } : {}),
      ...(g.seed !== undefined ? { seed: g.seed as number } : {}),
    };
  if (g?.type === "drift") return { type: "drift", base: over, speed: g.speed as number };
  if (g?.type === "loop" && list.length >= 2) return { type: "loop", keys: list, mode: g.mode as string };
  return over;
}

/**
 * The cameras whose `push` names something that goes (`edges`), each with a push that no longer does: those leave
 * `push.on` and `push.keep`, and a push left with nothing to make room for is taken off the camera.
 */
function pushWithout(edges: readonly RefEdge[], { gone, before }: Removal): ActionInput[] {
  const cameras = new Set<string>();
  for (const edge of edges) cameras.add(edge.from);
  const out: ActionInput[] = [];
  for (const cameraId of cameras) {
    const push = before.tree.byId.get(cameraId)?.props.push as
      | (Record<string, Json> & { on: string[]; keep?: string[] })
      | undefined;
    if (!push) continue;
    const on = push.on.filter((id) => !gone.has(id));
    const next =
      on.length === 0 ? null : { ...push, on, ...(push.keep ? { keep: push.keep.filter((id) => !gone.has(id)) } : {}) };
    out.push({ type: "camera/setPush", params: { cameraId, push: next } } as ActionInput);
  }
  return out;
}

/**
 * `child` no longer following `leader` (which is removed): it follows what `leader` followed, or nothing, and its
 * numbers are written again in that space so it stays where it was drawn. Its anchor point goes where `leader` put it;
 * `leader`'s rotation is added to its own and `leader`'s scale multiplied into it. That is exact while `leader`'s
 * values are constants and its scale is the same on both axes; a keyed value is taken where it stands when `child`
 * starts, and a scale that differs by axis is kept by axis, which a turned element only approximates.
 */
function unfollow(child: string, leader: string, before: ResolvedState): ActionInput {
  const c = before.items.get(child);
  const l = before.items.get(leader);
  const next = l ? followOf(l) : undefined;
  if (!c || !l) return setProps(child, { follow: next });
  const own = (nodeIn(before.tree, child)?.props ?? {}) as Record<string, unknown>;
  const lead = (nodeIn(before.tree, leader)?.props ?? {}) as Record<string, unknown>;
  const rel = S(c.range.start.minus(l.range.start));
  const comp = { width: before.composition.width, height: before.composition.height };
  const outer = next ? restBox(before.items.get(next) ?? l, comp, before.manifest, before.items) : null;
  const outerFrame = outer && next && before.items.has(next) ? { width: outer.w, height: outer.h } : comp;
  // Where the leader stands in the space the child moves to, and how it is turned and scaled there.
  const at = ownRestBox(l, outerFrame, before.manifest);
  const lt = (lead.transform ?? {}) as Record<string, unknown>;
  const la = (lt.anchor ?? { x: 0.5, y: 0.5 }) as { x: number; y: number };
  const turn = restNumber(lt.rotation, rel, 0);
  const [sx, sy] = scalePair(lt.scale, rel);
  const ox = at.x + la.x * at.w,
    oy = at.y + la.y * at.h;
  const cos = Math.cos((turn * Math.PI) / 180),
    sin = Math.sin((turn * Math.PI) / 180);
  /** A point of the leader's own box (pixels from its top left) where the leader's place puts it. */
  const carry = (x: number, y: number): [number, number] => {
    const dx = (at.x + x - ox) * sx,
      dy = (at.y + y - oy) * sy;
    return [ox + dx * cos - dy * sin, oy + dx * sin + dy * cos];
  };
  // The child's own place in the leader's box, its anchor point, and where that point lands.
  const rect = ownRestBox(c, { width: at.w, height: at.h }, before.manifest);
  const ct = (own.transform ?? {}) as Record<string, unknown>;
  const ca = (ct.anchor ?? { x: 0.5, y: 0.5 }) as { x: number; y: number };
  const box = (own.box ?? {}) as Record<string, unknown>;
  const origin = BOX_ORIGIN_POINT[((box.origin as BoxOrigin | undefined) ?? "topLeft") as BoxOrigin];
  const [ax, ay] = carry(rect.x + ca.x * rect.w, rect.y + ca.y * rect.h);
  // The box goes where its origin point must be for its anchor point to land there, the turn and scale about it.
  const x = round3(ax - (ca.x - origin.x) * rect.w);
  const y = round3(ay - (ca.y - origin.y) * rect.h);
  const transform: Record<string, unknown> = { ...ct };
  if (turn !== 0) transform.rotation = addTo(ct.rotation, turn);
  if (sx !== 1 || sy !== 1) transform.scale = scaleTo(ct.scale, sx, sy, rel);
  const props: Record<string, Json | undefined> = {
    follow: next,
    box: {
      ...(box as Record<string, Json>),
      x: shiftTo(box.x, x, restNumber(box.x, 0, rect.x + origin.x * rect.w)),
      y: shiftTo(box.y, y, restNumber(box.y, 0, rect.y + origin.y * rect.h)),
    },
  };
  if (turn !== 0 || sx !== 1 || sy !== 1) props.transform = transform as Json;
  return setProps(child, props);
}

/** A number as it stands at `rel`: itself, its keys read there, or a generator's `base`; `fallback` otherwise. */
function restNumber(v: unknown, rel: number, fallback: number): number {
  if (typeof v === "number") return v;
  if (Array.isArray(v)) {
    const keys = [...(v as CurveKey[])].sort((a, b) => a.at - b.at);
    const r = curveAt(keys, rel);
    return typeof r === "number" ? r : fallback;
  }
  if (v && typeof v === "object" && "base" in v) return restNumber((v as { base: unknown }).base, rel, fallback);
  return fallback;
}

/** A scale as it stands at `rel`, by axis. */
function scalePair(v: unknown, rel: number): [number, number] {
  if (v && typeof v === "object" && !Array.isArray(v) && "x" in v && "y" in v) {
    const s = v as { x: unknown; y: unknown };
    return [restNumber(s.x, rel, 1), restNumber(s.y, rel, 1)];
  }
  if (Array.isArray(v) && v.some((k) => typeof (k as CurveKey).value === "object")) {
    const r = curveAt(
      [...(v as CurveKey[])].sort((a, b) => a.at - b.at),
      rel,
    ) as { x?: number; y?: number };
    return [r?.x ?? 1, r?.y ?? 1];
  }
  const n = restNumber(v, rel, 1);
  return [n, n];
}

/** `v` with `d` added: to a number, to each key, or to a generator's base (a generator with none adds to 0). */
function addTo(v: unknown, d: number): Json {
  if (v === undefined) return round3(d);
  if (typeof v === "number") return round3(v + d);
  if (Array.isArray(v))
    return (v as { value: unknown }[]).map((k) => ({ ...(k as Record<string, Json>), value: addTo(k.value, d) }));
  if (v && typeof v === "object") {
    const g = v as Record<string, Json>;
    return { ...g, base: addTo(g.base ?? 0, d) };
  }
  return v as Json;
}

/** A scale multiplied by (`sx`, `sy`): one number stays one number while both are the same. */
function scaleTo(v: unknown, sx: number, sy: number, rel: number): Json {
  const times = (n: unknown, k: number): Json => {
    if (n === undefined) return round3(k);
    if (typeof n === "number") return round3(n * k);
    if (Array.isArray(n))
      return (n as { value: unknown }[]).map((key) => ({
        ...(key as Record<string, Json>),
        value: times(key.value, k),
      }));
    if (n && typeof n === "object") {
      const g = n as Record<string, Json>;
      return "base" in g ? { ...g, base: times(g.base, k) } : g;
    }
    return n as Json;
  };
  if (v && typeof v === "object" && !Array.isArray(v) && "x" in v && "y" in v) {
    const s = v as { x: unknown; y: unknown };
    return { x: times(s.x, sx), y: times(s.y, sy) };
  }
  if (sx === sy) return times(v, sx);
  const [x, y] = scalePair(v, rel);
  return { x: round3(x * sx), y: round3(y * sy) };
}

/**
 * A `box` axis moved so it stands at `to`, from where it stood (`was`): a number becomes `to`, each key moves by the
 * same amount, a generator's base moves with it.
 */
function shiftTo(v: unknown, to: number, was: number): Json {
  if (v === undefined || typeof v === "number") return to;
  return addTo(v, round3(to - was));
}
