// What an edit carries along. Removing, splitting or trimming a clip changes what other elements are placed from:
// titles anchored to it, transitions beside it, lengths that follow it. Left alone, those point at nothing or at a word
// the clip no longer plays. A carried action repairs them with ordinary actions of its own, run before or after the
// edit, so the patches, the write-back and the undo of the repairs are those of the actions they are.
import {
  BOX_ORIGIN_POINT,
  type BoxOrigin,
  type CurveKey,
  capabilitiesOf,
  curveAt,
  isSequenceItem,
  maxTicks,
  minTicks,
  round3,
  ZERO_TICKS,
} from "@uberscene/kit/schema";

import { createPatchLog } from "../patches/log";
import type { Json } from "../patches/types";
import { type Dependent, dependentsOf } from "../resolve/dependents";
import { followOf } from "../resolve/follow";
import { ownRestBox, restBox } from "../resolve/push";
import { type Placement, type ResolvedState, resolve } from "../resolve/resolve";
import { lengthS, lengthT, minus, S, startT } from "../time";
import { type ActionHandler, type ApplyContext, getHandler, inverseOf } from "./registry";
import type { Action, ActionInput, ActionType } from "./types";

/** The repairs of one edit: actions to run before it, and actions worked out from the timeline after it. */
export interface Carry {
  readonly pre?: readonly ActionInput[];
  readonly post?: (after: ResolvedState) => readonly ActionInput[];
}

/**
 * `handler`, carrying what depends on its target: `plan` names the repairs for an action on the state before it, or
 * nothing when there are none, and then the action behaves exactly as `handler` does.
 */
export function carry<T extends ActionType>(
  handler: ActionHandler<T>,
  plan: (action: Action<T>, before: ResolvedState) => Carry | null,
): ActionHandler<T> {
  return {
    ...handler,
    apply: (action, log, ctx) => {
      const repairs = plan(action, ctx.before);
      if (!repairs) return handler.apply(action, log, ctx);
      for (const sub of repairs.pre ?? []) runSub(sub, log, ctx);
      handler.apply(action, log, { ...ctx, before: ctx.current() });
      for (const sub of repairs.post?.(ctx.current()) ?? []) runSub(sub, log, ctx);
    },
    invert: (action, before) => {
      const repairs = plan(action, before);
      if (!repairs) return handler.invert(action, before);
      // The inverses are taken on a scratch run of the same steps, each against the state the step before left.
      const log = createPatchLog({
        isSource: (id) => before.tree.byId.has(id),
        sourceParent: (id) => before.tree.byId.get(id)?.parent ?? null,
        sourceNode: (id) => before.tree.byId.get(id),
      });
      const current = () => resolve(before.tree, before.manifest, log);
      const ctx: ApplyContext = { before, manifest: before.manifest, current };
      const inverses: ActionInput[] = [];
      const step = (sub: ActionInput) => {
        const state = current();
        inverses.push(inverseOf({ ...sub, actionId: "carry", ts: 0 } as Action, state));
        runSub(sub, log, ctx);
      };
      for (const sub of repairs.pre ?? []) step(sub);
      const mid = current();
      const own = handler.invert(action, mid);
      inverses.push(...(Array.isArray(own) ? own : [own as ActionInput]));
      handler.apply(action, log, { ...ctx, before: mid });
      for (const sub of repairs.post?.(current()) ?? []) step(sub);
      return inverses.reverse();
    },
  };
}

function runSub(sub: ActionInput, log: Parameters<ActionHandler["apply"]>[1], ctx: ApplyContext): void {
  const handler = getHandler(sub.type);
  if (!handler) throw new Error(`no handler for ${sub.type}`);
  const state = ctx.current();
  const action = { ...sub, actionId: "carry", ts: 0 } as Action;
  const result = handler.validate(action, state);
  if (!result.valid) throw new Error(`cannot carry ${sub.type}: ${result.errors.map((e) => e.message).join("; ")}`);
  handler.apply(action, log, { ...ctx, before: state });
}

const setProps = (id: string, props: Record<string, Json | undefined>): ActionInput => ({
  type: "source/setProps",
  params: { id, props },
});

/** The clip before `id` on its track, skipping transitions and gaps. */
function clipBefore(state: ResolvedState, id: string): Placement | undefined {
  const track = state.tracks.find((t) => t.items.includes(id));
  const siblings = track ? (state.tree.byId.get(track.id)?.children ?? []) : [];
  for (let i = siblings.findIndex((c) => c.id === id) - 1; i >= 0; i--) {
    const kind = siblings[i]?.kind;
    if (onTrack(kind)) return state.items.get(siblings[i]!.id);
  }
  return undefined;
}

/**
 * Removing a clip: what starts from it moves to the clip before it on its track, keeping its time on the timeline
 * where that clip is still playing, and otherwise held inside it; with no clip before, it is removed too. A transition
 * left with nothing on one side is removed; one that still has a clip on each side stays. A length that follows the
 * clip becomes the seconds it was. An overlay that followed it follows what it followed, or nothing, and stays where it
 * was drawn (`unfollow`).
 */
export function carryRemoval(id: string, before: ResolvedState): Carry | null {
  const deps = dependentsOf(before, id);
  if (deps.length === 0) return null;
  const pre: ActionInput[] = [];
  const prev = clipBefore(before, id);
  const removed = new Set<string>();
  const anchored = deps.filter((d): d is Extract<Dependent, { kind: "anchor" }> => d.kind === "anchor");
  if (!prev) for (const d of anchored) removed.add(d.id);
  for (const d of deps) {
    if (d.kind !== "match" && d.kind !== "until") continue;
    const p = before.items.get(d.id);
    if (p && !removed.has(d.id)) pre.push(setProps(d.id, { duration: lengthS(p) }));
  }
  for (const d of deps) if (d.kind === "follow" && !removed.has(d.id)) pre.push(unfollow(d.id, id, before));
  for (const d of anchored) {
    const p = before.items.get(d.id);
    if (!p) continue;
    if (!prev) {
      pre.push({ type: "element/remove", params: { id: d.id } });
      continue;
    }
    const room = maxTicks(ZERO_TICKS, minus(lengthT(prev), lengthT(p)));
    const offset = S(minTicks(room, maxTicks(ZERO_TICKS, minus(startT(p), startT(prev)))));
    pre.push(setProps(d.id, { anchor: prev.id, at: undefined, offset }));
  }
  // With a clip on each side once this one is gone, one transition still joins them: the one before it, if any.
  const beside = deps.filter((d): d is Extract<Dependent, { kind: "beside" }> => d.kind === "beside");
  const joins = prev !== undefined && hasClipAfter(before, id);
  const kept = joins ? (beside.find((d) => d.side === "before") ?? beside[0]) : undefined;
  for (const d of deps) {
    if (d.kind === "on" || (d.kind === "beside" && d !== kept))
      pre.push({ type: "transition/remove", params: { transitionId: d.id } });
  }
  return pre.length > 0 ? { pre } : null;
}

/** Whether a sibling on a track is something placed there, not a transition or a gap. */
const onTrack = (kind: string | undefined): boolean => kind !== undefined && isSequenceItem(kind);

/** The clip a transition leads into on its track, else the one it leaves; transitions and gaps are skipped. */
function clipBeside(state: ResolvedState, id: string): Placement | undefined {
  const track = state.tracks.find((t) => t.items.includes(id));
  const siblings = track ? (state.tree.byId.get(track.id)?.children ?? []) : [];
  const at = siblings.findIndex((c) => c.id === id);
  const next = siblings.slice(at + 1).find((c) => capabilitiesOf(c.kind).sequenceRole !== "between");
  if (next && onTrack(next.kind)) return state.items.get(next.id);
  return clipBefore(state, id);
}

/**
 * Removing a transition: what starts from it (a whoosh on the cut) moves to the clip the transition led into, or with
 * none the clip it left, keeping its distance from that clip's start; with no clip beside it, it is removed too. A
 * length that follows the transition becomes the seconds it was. Removing a clip removes the transitions it leaves
 * with one side, and so carries what hangs off them as well.
 */
export function carryTransitionRemoval(id: string, before: ResolvedState): Carry | null {
  const deps = dependentsOf(before, id).filter((d) => d.kind === "anchor" || d.kind === "match" || d.kind === "until");
  if (deps.length === 0) return null;
  const pre: ActionInput[] = [];
  const target = clipBeside(before, id);
  for (const d of deps) {
    const p = before.items.get(d.id);
    if (!p) continue;
    if (d.kind === "match" || d.kind === "until") pre.push(setProps(d.id, { duration: lengthS(p) }));
    else if (!target) pre.push({ type: "element/remove", params: { id: d.id } });
    else pre.push(setProps(d.id, { anchor: target.id, at: undefined, offset: S(minus(startT(p), startT(target))) }));
  }
  return pre.length > 0 ? { pre } : null;
}

/** Whether what follows `id` on its track, past any transitions, is a clip a transition can join (not a gap). */
function hasClipAfter(state: ResolvedState, id: string): boolean {
  const track = state.tracks.find((t) => t.items.includes(id));
  const siblings = track ? (state.tree.byId.get(track.id)?.children ?? []) : [];
  const next = siblings
    .slice(siblings.findIndex((c) => c.id === id) + 1)
    .find((c) => capabilitiesOf(c.kind).sequenceRole !== "between");
  return next !== undefined && capabilitiesOf(next.kind).sequenceRole !== "empty";
}

/**
 * Splitting a clip: what belongs to its second half moves to `newId`. A title at a word that now plays in the second
 * half is anchored to it with the same word, an anchor on the clip's end and a length until the clip ends follow the
 * end, and so does a transition on the clip's out edge. A length until a word the second half now plays follows it
 * there, with the same word.
 */
export function carrySplit(id: string, newId: string, before: ResolvedState): Carry | null {
  const deps = dependentsOf(before, id).filter((d) => d.kind !== "beside" && d.kind !== "match");
  if (deps.length === 0) return null;
  return {
    post: (after) => {
      const post: ActionInput[] = [];
      for (const d of deps) {
        if (d.kind === "anchor" && d.edge === "end") post.push(setProps(d.id, { anchor: `${newId}.end` }));
        else if (d.kind === "anchor" && d.at !== undefined && lostWord(after, d.id))
          post.push(setProps(d.id, { anchor: newId }));
        else if (d.kind === "until") {
          if (d.at === undefined) post.push(setProps(d.id, { duration: { until: newId } }));
          else if (lostWord(after, d.id, "duration"))
            post.push(setProps(d.id, { duration: { until: newId, at: d.at } }));
        } else if (d.kind === "on" && d.edge === "out") post.push(setProps(d.id, { on: newId }));
      }
      return post;
    },
  };
}

/**
 * Trimming a clip: a title at a word trimmed away keeps the time it had, held inside the clip, as an offset; a length
 * until a word trimmed away keeps the seconds it had.
 */
export function carryTrim(id: string, before: ResolvedState): Carry | null {
  const deps = dependentsOf(before, id).filter(
    (d) => (d.kind === "anchor" || d.kind === "until") && d.at !== undefined,
  );
  if (deps.length === 0) return null;
  return {
    post: (after) => {
      const clip = after.items.get(id);
      if (!clip) return [];
      const post: ActionInput[] = [];
      for (const d of deps) {
        if (d.kind === "until") {
          const was = before.items.get(d.id);
          if (lostWord(after, d.id, "duration") && was !== undefined)
            post.push(setProps(d.id, { duration: lengthS(was) }));
          continue;
        }
        if (!lostWord(after, d.id)) continue;
        const was = startT(before.items.get(d.id) ?? clip);
        post.push(
          setProps(d.id, {
            at: undefined,
            offset: S(minTicks(lengthT(clip), maxTicks(ZERO_TICKS, minus(was, startT(clip))))),
          }),
        );
      }
      return post;
    },
  };
}

/** Whether `id` names a word (in `at`, or in its duration's `until`) that the element it follows no longer plays. */
function lostWord(state: ResolvedState, id: string, prop: "at" | "duration" = "at"): boolean {
  return state.items.get(id)?.errors.some((e) => e.code === "INVALID_ANCHOR" && e.prop === prop) ?? false;
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
  const own = (before.tree.byId.get(child)?.props ?? {}) as Record<string, unknown>;
  const lead = (before.tree.byId.get(leader)?.props ?? {}) as Record<string, unknown>;
  const rel = S(minus(startT(c), startT(l)));
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
