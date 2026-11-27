import { type Kind, Time } from "@uberscene/kit/schema";

import type { PatchLog } from "../../patches/types";
import type { Placement, ResolvedState } from "../../resolve/resolve";
import { S, startSeconds, T } from "../../time";
import { carry, carryTrackRemoval } from "../carry";
import {
  define,
  insertNode,
  isError,
  makePropHandler,
  rawNode,
  rawProp,
  requireElement,
  setProps,
  siblingAfter,
  uniqueId,
} from "../handler-kit";
import { type ActionInput, invalid, type NodeSpec, nodeSpecOf, ok } from "../types";
import { restoreTiming } from "./clip-timing";

/** A microsecond, in ticks: a hole or an overlap smaller than this is none. */
const EPS = T(1e-6);

type Tree = Parameters<typeof rawNode>[0];
type Row = { readonly id: string; readonly kind: Kind; readonly parent: string };

/**
 * What the composition holds, in file order, with a camera's tracks in the camera's place: positions count these
 * rows, so they mean the same with a camera and without.
 */
function rows(state: Tree): Row[] {
  const root = state.tree.root;
  return root.children.flatMap((c) =>
    c.kind === "camera"
      ? c.children.filter((t) => t.kind === "track").map((t) => ({ id: t.id, kind: t.kind, parent: c.id }))
      : [{ id: c.id, kind: c.kind, parent: root.id }],
  );
}

function trackIndex(state: Tree, trackId: string): number {
  return rows(state).findIndex((c) => c.id === trackId);
}

/** Whether a track is written inside the camera. */
function inCamera(state: Tree, trackId: string): boolean {
  return rawNode(state, trackId)?.parent !== state.tree.root.id;
}

/**
 * Where a track goes to stand at `position` among `list` (the rows without it): after the row below it, and in that
 * row's parent, so a track put above one of the camera's is the camera's too. `camera` decides at the camera's
 * edge: true puts it inside (first, when the row below is outside), false outside (after the camera, when the row
 * below is inside).
 */
function trackPlace(
  state: Tree,
  list: readonly Row[],
  position: number,
  camera?: boolean,
): { parent: string; after: string | null } {
  const root = state.tree.root;
  const cam = root.children.find((c) => c.kind === "camera")?.id;
  const below = position <= 0 ? undefined : list[Math.min(position, list.length) - 1];
  const belowInside = below !== undefined && below.parent === cam;
  if (cam !== undefined && (camera ?? belowInside)) return { parent: cam, after: belowInside ? below.id : null };
  return { parent: root.id, after: belowInside ? (cam as string) : (below?.id ?? null) };
}

define({
  type: "track/add",
  validate: (a, state) =>
    state.items.has(a.params.trackId) || state.tree.byId.has(a.params.trackId)
      ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.trackId}" exists` })
      : ok,
  apply: (a, log, ctx) => {
    const tracks = rows(ctx.before).filter((c) => c.kind === "track");
    const { parent, after } = trackPlace(
      ctx.before,
      tracks,
      a.params.position ?? tracks.length,
      // A track added without a position goes on top of the stack, over the camera and not in it.
      a.params.camera ?? (a.params.position === undefined ? false : undefined),
    );
    const props: Record<string, never> = { id: a.params.trackId } as never;
    const p = props as Record<string, unknown>;
    if (a.params.layout) p.layout = a.params.layout;
    if (a.params.role) p.role = a.params.role;
    if (a.params.name) p.name = a.params.name;
    insertNode(log, parent, after, { id: a.params.trackId, kind: "track", props, children: [] });
  },
  invert: (a) => ({ type: "track/remove", params: { trackId: a.params.trackId } }),
  fold: () => [],
});

define(carry(
  {
    type: "track/remove",
    validate: (a, state) =>
      rawNode(state, a.params.trackId)?.kind === "track"
        ? ok
        : invalid({ code: "ELEMENT_NOT_FOUND", message: `track "${a.params.trackId}" does not exist` }),
    apply: (a, log) => log.append({ op: "remove", id: a.params.trackId }),
    invert: (a, before) => ({
      type: "track/restore",
      params: {
        trackId: a.params.trackId,
        node: nodeSpecOf(rawNode(before, a.params.trackId)!),
        position: trackIndex(before, a.params.trackId),
        ...(inCamera(before, a.params.trackId) ? { camera: true } : {}),
      },
    }),
    fold: () => [],
  },
  // A duck under the track and a camera's push for what is on it go with it.
  (a, before) => carryTrackRemoval(a.params.trackId, before),
));

define({
  type: "track/restore",
  validate: (a, state) =>
    rawNode(state, a.params.trackId) ? invalid({ code: "DUPLICATE_ID", message: `"${a.params.trackId}" exists` }) : ok,
  apply: (a, log, ctx) => {
    const { parent, after } = trackPlace(ctx.before, rows(ctx.before), a.params.position, a.params.camera ?? false);
    insertNode(log, parent, after, a.params.node);
  },
  invert: (a) => ({ type: "track/remove", params: { trackId: a.params.trackId } }),
  fold: () => [],
});

define({
  type: "track/duplicate",
  validate: (a, state) => {
    if (rawNode(state, a.params.sourceTrackId)?.kind !== "track")
      return invalid({ code: "ELEMENT_NOT_FOUND", message: "source track does not exist" });
    if (rawNode(state, a.params.trackId))
      return invalid({ code: "DUPLICATE_ID", message: `"${a.params.trackId}" exists` });
    return ok;
  },
  apply: (a, log, ctx) => {
    const source = rawNode(ctx.before, a.params.sourceTrackId)!;
    const map = a.params.idMap;
    const remap = (id: string): string => map[id] ?? `${id}_${a.params.trackId}`;
    const copy = (spec: ReturnType<typeof nodeSpecOf>): ReturnType<typeof nodeSpecOf> => ({
      ...spec,
      id: spec.id === source.id ? a.params.trackId : remap(spec.id),
      props: Object.fromEntries(
        Object.entries(spec.props).map(([k, v]) => [
          k,
          k === "id"
            ? spec.id === source.id
              ? a.params.trackId
              : remap(spec.id)
            : (k === "anchor" || k === "on") && typeof v === "string" && map[v]
              ? map[v]
              : v,
        ]),
      ),
      children: (spec.children ?? []).map(copy),
    });
    const pos = a.params.position ?? trackIndex(ctx.before, source.id) + 1;
    const { parent, after } = trackPlace(ctx.before, rows(ctx.before), pos, a.params.camera);
    const spec = copy(nodeSpecOf(source));
    insertNode(log, parent, after, {
      ...spec,
      props: { ...spec.props, name: `${String(source.props.name ?? source.id)} Copy` },
    });
  },
  invert: (a) => ({ type: "track/remove", params: { trackId: a.params.trackId } }),
  fold: () => [],
});

define(makePropHandler({
  type: "track/rename",
  target: (p) => p.trackId,
  write: (p) => ({ name: p.name }),
  kinds: ["track"],
}));
define(makePropHandler({
  type: "track/setFlag",
  target: (p) => p.trackId,
  write: (p) => ({ [p.flag]: p.value }),
  kinds: ["track"],
}));
define(makePropHandler({
  type: "track/setGroup",
  target: (p) => p.trackId,
  write: (p) => ({ group: p.group }),
  kinds: ["track"],
}));

define({
  type: "track/reorder",
  validate: (a, state) =>
    rawNode(state, a.params.trackId)?.kind === "track"
      ? ok
      : invalid({ code: "ELEMENT_NOT_FOUND", message: "track does not exist" }),
  apply: (a, log, ctx) => {
    const siblings = rows(ctx.before).filter((c) => c.id !== a.params.trackId);
    const pos = Math.max(0, Math.min(a.params.position, siblings.length));
    const { parent, after } = trackPlace(ctx.before, siblings, pos, a.params.camera);
    log.append({ op: "move", id: a.params.trackId, parent, after });
  },
  invert: (a, before) => ({
    type: "track/reorder",
    params: {
      trackId: a.params.trackId,
      position: trackIndex(before, a.params.trackId),
      camera: inCamera(before, a.params.trackId),
    },
  }),
  fold: () => [],
});

/** Free layout only: pack every timed child from 0 with no gaps, preserving order by start. */
define({
  type: "track/consolidate",
  validate: (a, state) => {
    const track = state.tracks.find((t) => t.id === a.params.trackId);
    if (!track) return invalid({ code: "ELEMENT_NOT_FOUND", message: "track does not exist" });
    if (track.layout !== "free")
      return invalid({ code: "UNSUPPORTED_ON_LAYOUT", message: "sequence tracks have no gaps to remove" });
    if (track.locked) return invalid({ code: "TRACK_LOCKED", message: "track is locked" });
    return ok;
  },
  apply: (a, log, ctx) => {
    let cursor = Time.ZERO;
    for (const item of orderedItems(ctx.before, a.params.trackId)) {
      setProps(log, item.id, { start: S(cursor) });
      cursor = cursor.plus(item.range.duration);
    }
  },
  invert: (a, before) => ({
    type: "track/restorePositions",
    params: {
      trackId: a.params.trackId,
      positions: orderedItems(before, a.params.trackId).map((i) => ({ id: i.id, start: startSeconds(i) })),
    },
  }),
  fold: () => [],
});

define({
  type: "track/restorePositions",
  validate: (a, state) => {
    for (const p of a.params.positions) {
      const item = requireElement(state, p.id);
      if (isError(item)) return invalid(item);
    }
    return ok;
  },
  apply: (a, log) => {
    for (const p of a.params.positions) setProps(log, p.id, { start: p.start });
  },
  invert: (a, before) => ({
    type: "track/restorePositions",
    params: {
      trackId: a.params.trackId,
      positions: a.params.positions.map((p) => ({ id: p.id, start: Number(rawProp(before, p.id, "start") ?? 0) })),
    },
  }),
  fold: () => [],
});

/**
 * Sequence → free: every sequenced child gets its resolved start, a sibling
 * transition becomes an edge transition on the outgoing clip, gaps go. Free
 * → sequence: children are reordered by start, holes become <Gap>s and
 * starts are dropped. Both keep every element where it played.
 */
define({
  type: "track/setLayout",
  validate: (a, state) => {
    const track = state.tracks.find((t) => t.id === a.params.trackId);
    if (!track) return invalid({ code: "ELEMENT_NOT_FOUND", message: "track does not exist" });
    if (track.locked) return invalid({ code: "TRACK_LOCKED", message: `track "${track.id}" is locked` });
    if (track.layout === a.params.layout)
      return invalid({ code: "INVALID_PARAMS", message: `"${track.id}" is already a ${a.params.layout} track` });
    if (a.params.layout === "sequence") {
      const items = sequenced(state, track.id);
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1] as Placement,
          next = items[i] as Placement;
        if (next.range.start.isBefore(prev.range.end.minus(EPS)))
          return invalid({
            code: "UNSUPPORTED_ON_LAYOUT",
            message: `"${prev.id}" and "${next.id}" overlap; a sequence track cannot express overlaps`,
          });
      }
    }
    return ok;
  },
  apply: (a, log, ctx) =>
    a.params.layout === "free"
      ? toFree(log, ctx.before, a.params.trackId)
      : toSequence(log, ctx.before, a.params.trackId),
  invert: (a, before) =>
    a.params.layout === "free" ? undoToFree(before, a.params.trackId) : undoToSequence(before, a.params.trackId),
  fold: () => [],
});

function orderedItems(state: Parameters<typeof rawNode>[0], trackId: string) {
  const track = state.tracks.find((t) => t.id === trackId);
  if (!track) return [];
  return track.items
    .map((id) => state.items.get(id))
    .filter(
      (i): i is NonNullable<typeof i> =>
        Boolean(i) && i!.kind !== "transition" && typeof rawProp(state, i!.id, "anchor") !== "string",
    )
    .sort((x, y) => x.range.start.compare(y.range.start));
}

/** The children a sequence orders: timed, not anchored, not a transition, gap or multicam; by resolved start. */
function sequenced(state: ResolvedState, trackId: string): Placement[] {
  return orderedItems(state, trackId).filter((i) => i.kind !== "gap" && i.kind !== "multicam");
}

function gapsOf(state: ResolvedState, trackId: string) {
  return (rawNode(state, trackId)?.children ?? []).filter((c) => c.kind === "gap");
}

function betweenTransitions(state: ResolvedState, trackId: string): Placement[] {
  const track = state.tracks.find((t) => t.id === trackId);
  return (track?.items ?? [])
    .map((id) => state.items.get(id))
    .filter((p): p is Placement => Boolean(p && p.kind === "transition" && p.between));
}

function toFree(log: PatchLog, state: ResolvedState, trackId: string): void {
  setProps(log, trackId, { layout: "free" });
  for (const item of sequenced(state, trackId)) setProps(log, item.id, { start: startSeconds(item) });
  for (const x of betweenTransitions(state, trackId))
    setProps(log, x.id, { on: (x.between as readonly [string, string])[0], edge: "out" });
  for (const gap of gapsOf(state, trackId)) log.append({ op: "remove", id: gap.id });
}

function undoToFree(before: ResolvedState, trackId: string): ActionInput[] {
  return [
    { type: "source/setProps", params: { id: trackId, props: { layout: rawProp(before, trackId, "layout") } } },
    ...gapsOf(before, trackId).map(
      (gap): ActionInput => ({
        type: "element/restore",
        params: { id: gap.id, node: nodeSpecOf(gap), trackId, place: { after: siblingAfter(before, gap.id) } },
      }),
    ),
    ...betweenTransitions(before, trackId).map(
      (x): ActionInput => ({
        type: "source/setProps",
        params: { id: x.id, props: { on: rawProp(before, x.id, "on"), edge: rawProp(before, x.id, "edge") } },
      }),
    ),
    ...sequenced(before, trackId).map((i) => restoreTiming(before, i.id)),
  ];
}

/** The gaps a free → sequence conversion inserts: one per hole, before the item that follows it. */
function plannedGaps(state: ResolvedState, trackId: string): { spec: NodeSpec; nextId: string }[] {
  const out: { spec: NodeSpec; nextId: string }[] = [];
  const taken = new Set<string>();
  let cursor = Time.ZERO;
  for (const item of sequenced(state, trackId)) {
    const hole = item.range.start.minus(cursor);
    if (hole.isAfter(EPS)) {
      const id = uniqueId(state, `gap-${trackId}-${out.length + 1}`, taken);
      taken.add(id);
      out.push({ spec: { id, kind: "gap", props: { id, duration: S(hole) } }, nextId: item.id });
    }
    cursor = item.range.end;
  }
  return out;
}

function orderChanges(state: ResolvedState, trackId: string): boolean {
  const items = sequenced(state, trackId);
  const current = (rawNode(state, trackId)?.children ?? [])
    .filter((c) => items.some((i) => i.id === c.id))
    .map((c) => c.id);
  return current.some((id, i) => id !== items[i]?.id);
}

function toSequence(log: PatchLog, state: ResolvedState, trackId: string): void {
  const items = sequenced(state, trackId);
  if (orderChanges(state, trackId)) {
    let after: string | null = null;
    for (const item of items) {
      log.append({ op: "move", id: item.id, parent: trackId, after });
      after = item.id;
    }
  }
  const gaps = plannedGaps(state, trackId);
  let prev: string | null = null;
  for (const item of items) {
    const gap = gaps.find((g) => g.nextId === item.id);
    if (gap) insertNode(log, trackId, prev, gap.spec);
    setProps(log, item.id, { start: undefined });
    prev = item.id;
  }
  setProps(log, trackId, { layout: undefined });
}

function undoToSequence(before: ResolvedState, trackId: string): ActionInput[] {
  const items = sequenced(before, trackId);
  const moves = orderChanges(before, trackId)
    ? (rawNode(before, trackId)?.children ?? [])
        .filter((c) => items.some((i) => i.id === c.id))
        .map(
          (c): ActionInput => ({
            type: "clip/move",
            params: { id: c.id, trackId, place: { after: siblingAfter(before, c.id) } },
          }),
        )
    : [];
  return [
    ...plannedGaps(before, trackId).map(
      (g): ActionInput => ({ type: "clip/closeGapBefore", params: { id: g.nextId } }),
    ),
    ...moves,
    ...items.map((i) => restoreTiming(before, i.id)),
    { type: "source/setProps", params: { id: trackId, props: { layout: rawProp(before, trackId, "layout") } } },
  ];
}
