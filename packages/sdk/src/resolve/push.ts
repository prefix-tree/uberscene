import { capabilitiesOf, type DrawRect, type ElementBox, type FitMode, placeBox } from "@uberscene/kit/schema";

import { type AssetManifest, lookupAsset } from "../manifest/types";
import { endT, plus, S, startT, T } from "../time";
import { followOf } from "./follow";
import type { RefGraph } from "./refs";
import type { Placement, ResolvedTrack } from "./resolve";

/** A camera's `push` as the schema parses it. */
export interface PushSpec {
  readonly on: readonly string[];
  readonly keep?: readonly string[];
  readonly margin?: number;
  readonly duration: number;
  readonly easing: string;
}

/** One key of a camera value the push makes: `value` at `at` seconds of the video. */
export interface PushKey {
  readonly field: "x" | "y" | "zoom";
  readonly at: number;
  readonly value: number;
  readonly easing?: string;
}

interface Frame {
  readonly width: number;
  readonly height: number;
}

interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

const round = (v: number): number => Math.round(v * 1000) / 1000;

/**
 * Where an element stands when it starts, in composition pixels, by the rule every element is placed by. Footage is
 * its asset fitted into its `box`; a shape is its `width` and `height`; anything else is its `box` when that has a
 * size, and the point at its `box.x`, `box.y` when it does not (its real size is only known once it is drawn).
 * Its own keys, scale and rotation are not followed. An overlay with a `follow` stands in the rest box of the one it
 * follows.
 */
export function restBox(
  item: Placement,
  frame: Frame,
  manifest: AssetManifest,
  items: ReadonlyMap<string, Placement>,
  seen: ReadonlySet<string> = new Set(),
): DrawRect {
  const leader = items.get(followOf(item) ?? "");
  if (leader && !seen.has(leader.id)) {
    const space = restBox(leader, frame, manifest, items, new Set([...seen, item.id]));
    const own = ownRestBox(item, { width: space.w, height: space.h }, manifest);
    return { ...own, x: own.x + space.x, y: own.y + space.y };
  }
  return ownRestBox(item, frame, manifest);
}

export function ownRestBox(item: Placement, frame: Frame, manifest: AssetManifest): DrawRect {
  const box = item.props.box as ElementBox | undefined;
  const sized = (width: number, height: number, fit: FitMode): DrawRect =>
    placeBox(frame, { width, height }, fit, box).rect;
  if (item.kind === "shape") return sized(Number(item.props.width ?? 0), Number(item.props.height ?? 0), "none");
  if (item.source) {
    const asset = lookupAsset(manifest, item.source.asset);
    const fit = (item.props.fit as FitMode | undefined) ?? "contain";
    return sized(asset?.width ?? frame.width, asset?.height ?? frame.height, fit);
  }
  if (box?.width !== undefined && box.height !== undefined) return sized(box.width, box.height, "none");
  return { x: box?.x ?? frame.width / 2, y: box?.y ?? frame.height / 2, w: 0, h: 0 };
}

const union = (a: DrawRect, b: DrawRect): DrawRect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/**
 * The view that holds `held` inside the margin, moved as little as it can be from `from`: the zoom pulls back only
 * when `held` cannot fit, and each axis pans the shortest way that brings `held` inside.
 */
function leastMove(from: View, held: DrawRect, frame: Frame, margin: number): View {
  const roomW = Math.max(1, frame.width - 2 * margin);
  const roomH = Math.max(1, frame.height - 2 * margin);
  const fits = Math.min(held.w > 0 ? roomW / held.w : Infinity, held.h > 0 ? roomH / held.h : Infinity);
  const zoom = Math.min(from.zoom, fits);
  // What the view shows inside the margin, in composition pixels, is this far each side of its centre.
  const halfW = roomW / 2 / zoom;
  const halfH = roomH / 2 / zoom;
  const axis = (centre: number, low: number, size: number, half: number): number =>
    // The centre may sit anywhere from "held's far edge at the margin" to "held's near edge at the margin".
    Math.min(Math.max(centre, low + size - half), low + half);
  const cx = axis(frame.width / 2 + from.x, held.x, held.w, halfW);
  const cy = axis(frame.height / 2 + from.y, held.y, held.h, halfH);
  return { x: round(cx - frame.width / 2), y: round(cy - frame.height / 2), zoom: round(zoom) };
}

/**
 * The keys a camera's `push` makes for `x`, `y` and `zoom`: one move per moment an element in `on` starts, from the
 * view as it was to the least move that holds everything so far. A value that never changes gets no keys.
 */
export function pushKeys(
  camera: Placement,
  push: PushSpec,
  items: ReadonlyMap<string, Placement>,
  tracks: readonly ResolvedTrack[],
  frame: Frame,
  manifest: AssetManifest,
  refs: RefGraph,
): readonly PushKey[] {
  const under = new Set(tracks.filter((t) => t.camera === camera.id).map((t) => t.id));
  // What the push names, from the reference graph: the ones that exist and the camera moves. The rest are its errors.
  const named = (prop: string): Placement[] =>
    (refs.from.get(camera.id) ?? [])
      .filter((e) => e.type === "push" && e.prop === prop && !e.broken)
      .flatMap((e) => items.get(e.to) ?? []);
  const on = named("push.on").sort((a, b) => startT(a) - startT(b));
  const keep = named("push.keep");

  const number = (field: "x" | "y" | "zoom", fallback: number): number =>
    typeof camera.props[field] === "number" ? (camera.props[field] as number) : fallback;
  let view: View = { x: number("x", 0), y: number("y", 0), zoom: number("zoom", 1) };
  const margin = push.margin ?? Math.min(frame.width, frame.height) / 20;

  // What must stay in view at a moment: the elements to keep, or everything the camera is showing then.
  const drawn = [...items.values()].filter((i) => i.track !== null && i.parent === i.track && under.has(i.track));
  const active = (i: Placement, t: number): boolean =>
    capabilitiesOf(i.kind).sequenceRole !== "between" && startT(i) <= plus(T(t), T(1e-6)) && T(t) < endT(i);
  const heldAt = (t: number): DrawRect | null => {
    const boxes = [...(push.keep ? [...keep, ...on.filter((i) => active(i, t))] : drawn.filter((i) => active(i, t)))];
    return boxes.length > 0 ? boxes.map((i) => restBox(i, frame, manifest, items)).reduce(union) : null;
  };

  const keys: PushKey[] = [];
  let free = 0;
  for (let i = 0; i < on.length; ) {
    const first = startT(on[i] as Placement);
    const start = S(first);
    // Elements that start together are one move.
    while (i < on.length && startT(on[i] as Placement) <= plus(first, T(1e-6))) i++;
    const held = heldAt(start);
    if (!held) continue;
    const next = leastMove(view, held, frame, margin);
    // A move begins when its element starts, or when the move before it ends.
    const at = round(Math.max(start, free));
    const end = round(at + push.duration);
    for (const field of ["x", "y", "zoom"] as const) {
      if (next[field] === view[field]) continue;
      // A move that follows another at once starts on the key the first one ended on.
      const last = keys.map((k) => k.field).lastIndexOf(field);
      if (last >= 0 && (keys[last] as PushKey).at === at) keys.splice(last, 1);
      keys.push({ field, at, value: view[field], easing: push.easing }, { field, at: end, value: next[field] });
    }
    if (next.x !== view.x || next.y !== view.y || next.zoom !== view.zoom) free = end;
    view = next;
  }
  return keys;
}
