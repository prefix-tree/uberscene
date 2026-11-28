// The action that is a nested sequence's alone: writing its scene's tracks into the file.
import { capabilitiesOf } from "@uberscene/kit/schema";

import {
  define,
  insertNode,
  onElement,
  placementOf,
  rawNode,
  siblingAfter,
  uniqueId,
  validateTarget,
} from "../../actions/handler-kit";
import { type ActionInput, invalid, type NodeSpec, nodeSpecOf, ok } from "../../actions/types";
import type { Json } from "../../patches/types";
import type { Placement, ResolvedState } from "../../resolve/resolve";
import { resolveScene, type SceneFn } from "../../resolve/scene";
import { lengthSeconds, S, T } from "../../time";

/** A microsecond, in ticks: what is closer than this to an edge is on it. */
const EPS = T(1e-6);
/** Nested props that re-time or re-draw the scene as a whole; the extracted elements could not carry them. */
const EXTRACT_BLOCKERS = ["in", "out", "transform", "fit", "blend", "blendOpacity", "emphasis"] as const;

/**
 * Write the scene's tracks into the file: one free track per inner track,
 * inserted after the nested element's track, every item at the time it
 * played. On a sequence track a <Gap> keeps the slot so later items stay put.
 */
define({
  type: "nested/extract",
  targets: onElement({
    kinds: ["nested"],
    when: (item, state) => typeof rawNode(state, item.id)?.props.of === "function",
  }),
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, []);
    if (!base.valid) return base;
    const item = state.items.get(a.params.id) as Placement;
    if (item.kind !== "nested")
      return invalid({ code: "INVALID_PARAMS", message: `"${a.params.id}" is not a <Nested>` });
    const node = rawNode(state, a.params.id)!;
    if (typeof node.props.of !== "function")
      return invalid({ code: "INVALID_PARAMS", message: "only a scene given as a function can be extracted" });
    const blocker = EXTRACT_BLOCKERS.find((p) => node.props[p] !== undefined);
    if (blocker)
      return invalid({
        code: "INVALID_PARAMS",
        message: `"${a.params.id}.${blocker}" would re-time or re-draw the scene; remove it before extracting`,
      });
    const scene = sceneOf(state, item);
    if (scene.errors.length > 0)
      return invalid({
        code: "INVALID_PARAMS",
        message: `the scene has ${scene.errors[0]?.code}; fix it before extracting`,
      });
    if (scene.tracks.length === 0) return invalid({ code: "INVALID_PARAMS", message: "the scene has no tracks" });
    const unsupported = scene.tracks
      .flatMap((t) => t.items)
      .map((id) => scene.items.get(id))
      .find((p) => p && (p.kind === "transition" || p.kind === "multicam"));
    if (unsupported)
      return invalid({
        code: "INVALID_PARAMS",
        message: `the scene's <${unsupported.kind}> "${unsupported.id}" cannot be extracted yet`,
      });
    return ok;
  },
  apply: (a, log, ctx) => {
    const state = ctx.before;
    const trackId = rawNode(state, a.params.id)?.parent as string;
    const plan = extractionPlan(state, a.params.id);
    let after = trackId;
    for (const track of plan.tracks) {
      // Beside the track the scene was on: inside the camera when that track is.
      insertNode(log, rawNode(state, trackId)?.parent ?? state.tree.root.id, after, track);
      after = track.id;
    }
    if (plan.gap) insertNode(log, trackId, siblingAfter(state, a.params.id), plan.gap);
    log.append({ op: "remove", id: a.params.id });
  },
  invert: (a, before) => {
    const node = rawNode(before, a.params.id)!;
    const plan = extractionPlan(before, a.params.id);
    const spec = nodeSpecOf(node);
    const { id: _id, start: _s, anchor: _an, offset: _o, ...rest } = spec.props;
    return [
      ...plan.tracks.map((t): ActionInput => ({ type: "track/remove", params: { trackId: t.id } })),
      ...(plan.gap ? [{ type: "element/remove", params: { id: plan.gap.id } } as ActionInput] : []),
      {
        type: "element/create",
        params: {
          id: a.params.id,
          kind: "nested",
          trackId: node.parent as string,
          place: placementOf(before, a.params.id),
          props: rest,
          children: spec.children ?? [],
          after: siblingAfter(before, a.params.id),
        },
      },
    ];
  },
  fold: () => [],
});

function sceneOf(state: ResolvedState, item: Placement): ResolvedState {
  return resolveScene(item.props.of as SceneFn, item.props, state.composition, state.manifest);
}

function extractionPlan(state: ResolvedState, id: string): { tracks: NodeSpec[]; gap: NodeSpec | null } {
  const item = state.items.get(id) as Placement;
  const node = rawNode(state, id)!;
  const scene = sceneOf(state, item);
  const volume = Number(item.props.volume ?? 1);
  const taken = new Set<string>();
  const fresh = (base: string): string => {
    const v = uniqueId(state, base, taken);
    taken.add(v);
    return v;
  };
  const prefixed = (spec: NodeSpec): NodeSpec => {
    const nid = fresh(`${id}-${spec.id}`);
    return { ...spec, id: nid, props: { ...spec.props, id: nid }, children: (spec.children ?? []).map(prefixed) };
  };
  const tracks: NodeSpec[] = [];
  for (const track of scene.tracks) {
    const trackId = fresh(`${id}-${track.id}`);
    const raw = scene.tree.byId.get(track.id);
    const children: NodeSpec[] = [];
    for (const childId of track.items) {
      const p = scene.items.get(childId);
      const rn = scene.tree.byId.get(childId);
      if (!p || !rn || p.kind === "gap") continue;
      const startAt = item.range.start.plus(p.range.start);
      if (startAt.isAtOrAfter(item.range.end.minus(EPS))) continue;
      const start = S(startAt);
      const room = item.range.end.minus(startAt);
      const limit = S(room);
      const spec = prefixed(nodeSpecOf(rn));
      const props: Record<string, Json | undefined> = {
        ...spec.props,
        anchor: undefined,
        offset: undefined,
        at: undefined,
        start,
      };
      if (p.range.duration.isAfter(room.plus(EPS))) {
        if (p.source) {
          props.in = p.source.in;
          props.out = p.source.in + limit * p.source.speed;
          props.duration = undefined;
        } else props.duration = limit;
      } else if (typeof props.duration !== "number" && props.out === undefined) {
        props.duration = lengthSeconds(p);
      }
      if (volume !== 1 && capabilitiesOf(p.kind).audio) props.volume = Number(rn.props.volume ?? 1) * volume;
      children.push({ ...spec, props: Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined)) });
    }
    const trackProps: Record<string, Json> = { id: trackId, layout: "free" };
    for (const key of ["name", "role", "hidden", "muted", "solo"])
      if (raw?.props[key] !== undefined) trackProps[key] = raw.props[key] as Json;
    tracks.push({ id: trackId, kind: "track", props: trackProps, children });
  }
  const layout = state.tracks.find((t) => t.id === node.parent)?.layout;
  const anchored = typeof node.props.anchor === "string";
  const gapId = layout === "sequence" && !anchored ? fresh(`${id}-gap`) : null;
  return {
    tracks,
    gap: gapId ? { id: gapId, kind: "gap", props: { id: gapId, duration: lengthSeconds(item) } } : null,
  };
}
