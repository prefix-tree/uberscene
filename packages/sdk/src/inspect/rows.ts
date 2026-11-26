// The resolved timeline as flat rows: one array per kind of thing, each row with its id, its seconds and its frames.
// Flat rows are what jq, a short script or a SQL table take as they are.
import { framesUntil, nearestFrame, type Rate, round3 } from "@uberscene/kit/schema";

import type { ResolveError } from "../resolve/errors";
import { derivedOrigin } from "../resolve/expand";
import { followOf } from "../resolve/follow";
import type { Placement, ResolvedState } from "../resolve/resolve";
import { type BeatRow, beatRows, type MusicRow, musicRows } from "./music";
import { spokenWords, timelineBeats } from "./plays";

export interface ElementRow {
  readonly id: string;
  readonly kind: string;
  readonly track: string | null;
  readonly parent: string | null;
  readonly start: number;
  readonly end: number;
  readonly duration: number;
  readonly startFrame: number;
  /** The first frame after the element. */
  readonly endFrame: number;
  /** The asset it plays and the range of it, in the asset's own seconds. */
  readonly asset?: string;
  readonly in?: number;
  readonly out?: number;
  readonly speed?: number;
  /** A title's or a caption's words. */
  readonly text?: string;
  /** What it is placed against: `anchor`, `at` and `offset` as the file writes them. */
  readonly anchor?: string;
  readonly at?: string | number;
  readonly offset?: number;
  /** Where its length comes from, when another element gives it: `{ until, at? }` or `{ match }`, as the file writes it. */
  readonly follows?: { readonly until: string; readonly at?: string } | { readonly match: string };
  /** A transition's type and the two clips it joins. */
  readonly type?: string;
  readonly from?: string;
  readonly to?: string;
  /** For a transition at one edge of an element: the element and which edge. */
  readonly on?: string;
  readonly edge?: "in" | "out";
  /** A marker's label. */
  readonly label?: string;
  /** A layer, shape, SVG or sticker the file marks as a ground for other things. */
  readonly ground?: true;
  /** The overlay it moves with, its `follow` prop (`follows` above is where its length comes from). */
  readonly follow?: string;
}

export interface EffectRow {
  readonly id: string;
  readonly element: string;
  readonly type: string;
  readonly params: Readonly<Record<string, unknown>>;
  /** Its place among the element's effects, which run in this order. */
  readonly order: number;
}

export interface KeyframeRow {
  readonly id: string;
  /** The element it animates. */
  readonly element: string;
  /** Where its list is written on the element: `transform.opacity`, `box.x`, `volume`, `effects.0.radius`. */
  readonly property: string;
  /** Seconds of the finished video. */
  readonly at: number;
  readonly frame: number;
  readonly value: unknown;
  readonly easing?: string;
}

export interface WordRow {
  readonly asset: string;
  readonly clip: string;
  readonly i: number;
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly startFrame: number;
}

export interface CutRow {
  readonly time: number;
  readonly frame: number;
  readonly track: string;
  readonly from: string;
  readonly to: string;
  /** The transition over the cut, when there is one; `time` is then where it starts. */
  readonly transition?: string;
}

export interface TimelineRows {
  readonly composition: {
    readonly id: string;
    readonly fps: number;
    /** The exact rate `fps` rounds: 30000/1001 for 29.97. */
    readonly rate: Rate;
    readonly width: number;
    readonly height: number;
    readonly duration: number;
    readonly frames: number;
  };
  readonly tracks: readonly {
    readonly id: string;
    readonly layout: string;
    /** What the track is for, when the file says: `music`, `dialogue`, `effects`… */
    readonly role?: string;
    readonly order: number;
    readonly hidden: boolean;
    readonly muted: boolean;
    readonly solo: boolean;
    readonly locked: boolean;
    /** The camera the track is inside, which moves everything on it. */
    readonly camera?: string;
  }[];
  readonly elements: readonly ElementRow[];
  readonly effects: readonly EffectRow[];
  readonly keyframes: readonly KeyframeRow[];
  /** Values that are computed: a wiggle, a drift or a loop, each on one property of one element. */
  readonly generators: readonly GeneratorRow[];
  readonly words: readonly WordRow[];
  readonly cuts: readonly CutRow[];
  /** The music the timeline plays: each clip or audio whose asset has beats. */
  readonly music: readonly MusicRow[];
  /** Every beat of that music, at the time it plays. */
  readonly beats: readonly BeatRow[];
  readonly errors: readonly ResolveError[];
}

/** A generator on a value: what it is, where, and its params (a wiggle's seed filled in). */
export interface GeneratorRow {
  readonly id: string;
  readonly element: string;
  /** The prop it is written at: `transform.rotation`, `effects.0.radius`, a camera's `zoom`. */
  readonly property: string;
  readonly type: string;
  readonly params: Readonly<Record<string, unknown>>;
}

/** Children of an element that are rows of their own, or that only shape its timing. */
const NOT_ELEMENTS = new Set([
  "composition",
  "track",
  "effect",
  "keyframe",
  "generator",
  "speedKey",
  "freeze",
  "mask",
  "angle",
  "cut",
]);

/** The flat rows of a resolved timeline. */
export function timelineRows(state: ResolvedState): TimelineRows {
  const { rate } = state.composition;
  const frame = (t: number): number => nearestFrame(t, rate);
  const elements: ElementRow[] = [];
  const effects: EffectRow[] = [];
  const keyframes: KeyframeRow[] = [];
  const generators: GeneratorRow[] = [];
  const order = new Map<string, number>();

  for (const p of state.items.values()) {
    if (p.kind === "effect") {
      const n = order.get(p.parent ?? "") ?? 0;
      order.set(p.parent ?? "", n + 1);
      effects.push({
        id: p.id,
        element: p.parent ?? "",
        type: typeof p.props.type === "string" ? p.props.type : shaderName(p.props.type),
        params: (p.props.params ?? {}) as Record<string, unknown>,
        order: n,
      });
    } else if (p.kind === "generator") {
      const origin = derivedOrigin(p.id);
      const { id: _id, property: _p, param: _q, type, ...params } = p.props;
      generators.push({
        id: p.id,
        element: origin?.id ?? p.parent ?? "",
        property: origin ? origin.path.replace(/\.generator$/, "") : String(p.props.property ?? p.props.param ?? ""),
        type: String(type),
        params,
      });
    } else if (p.kind === "keyframe") {
      const origin = derivedOrigin(p.id);
      keyframes.push({
        id: p.id,
        element: origin?.id ?? p.parent ?? "",
        property: origin ? origin.path.replace(/\.\d+$/, "") : String(p.props.property ?? ""),
        at: round3(p.start),
        frame: frame(p.start),
        value: p.props.value,
        ...(typeof p.props.easing === "string" ? { easing: p.props.easing } : {}),
      });
    } else if (!NOT_ELEMENTS.has(p.kind)) {
      elements.push(elementRow(state, p, frame));
    }
  }
  elements.sort((a, b) => a.start - b.start);

  const cuts: CutRow[] = [];
  for (const track of state.tracks) {
    if (track.layout !== "sequence") continue;
    const clips = track.items
      .map((id) => state.items.get(id))
      .filter(
        (p): p is Placement => p !== undefined && (p.kind === "clip" || p.kind === "audio" || p.kind === "nested"),
      );
    const transitions = [...state.items.values()].filter((p) => p.kind === "transition" && p.track === track.id);
    for (let i = 0; i + 1 < clips.length; i++) {
      const a = clips[i] as Placement,
        b = clips[i + 1] as Placement;
      // Clips with a gap between them do not cut to each other; overlays on a track are placed, not cut.
      if (b.start > a.end + 1e-6) continue;
      const over = transitions.find((t) => t.between?.[0] === a.id && t.between[1] === b.id);
      cuts.push({
        time: round3(b.start),
        frame: frame(b.start),
        track: track.id,
        from: a.id,
        to: b.id,
        ...(over ? { transition: over.id } : {}),
      });
    }
  }
  cuts.sort((a, b) => a.time - b.time);
  const played = timelineBeats(state);

  return {
    composition: {
      ...state.composition,
      duration: round3(state.composition.duration),
      frames: framesUntil(state.composition.duration, rate),
    },
    tracks: state.tracks.map((t) => ({
      id: t.id,
      layout: t.layout,
      ...(t.role !== undefined ? { role: t.role } : {}),
      order: t.order,
      hidden: t.hidden,
      muted: t.muted,
      solo: t.solo,
      locked: t.locked,
      ...(t.camera !== undefined ? { camera: t.camera } : {}),
    })),
    elements,
    effects,
    keyframes: keyframes.sort((a, b) => a.at - b.at),
    generators,
    words: spokenWords(state).map((w) => ({
      asset: w.asset,
      clip: w.play,
      i: w.i,
      text: w.text,
      start: w.start,
      end: w.end,
      startFrame: frame(w.start),
    })),
    cuts,
    music: musicRows(state, played),
    beats: beatRows(state, played),
    errors: state.errors,
  };
}

function elementRow(state: ResolvedState, p: Placement, frame: (t: number) => number): ElementRow {
  const props = p.props;
  const follow = followOf(p);
  // A title's words are the element's children, kept on its node; a caption's are a prop.
  const text = p.kind === "title" ? state.tree.byId.get(p.id)?.text : p.kind === "caption" ? props.text : undefined;
  return {
    id: p.id,
    kind: p.kind,
    track: p.track,
    parent: p.parent,
    start: round3(p.start),
    end: round3(p.end),
    duration: round3(p.end - p.start),
    startFrame: frame(p.start),
    endFrame: frame(p.end),
    ...(p.source
      ? { asset: p.source.asset, in: round3(p.source.in), out: round3(p.source.out), speed: p.source.speed }
      : {}),
    ...(typeof text === "string" && text.length > 0 ? { text } : {}),
    ...(typeof props.anchor === "string" ? { anchor: props.anchor } : {}),
    ...(typeof props.at === "string" || typeof props.at === "number" ? { at: props.at } : {}),
    ...(typeof props.offset === "number" ? { offset: props.offset } : {}),
    ...followsOf(props.duration),
    ...(p.kind === "transition" && typeof props.type === "string" ? { type: props.type } : {}),
    ...(p.kind === "transition" && typeof props.type !== "string" ? { type: shaderName(props.type) } : {}),
    ...(p.between ? { from: p.between[0], to: p.between[1] } : {}),
    ...(p.kind === "transition" && typeof p.props.on === "string"
      ? { on: p.props.on, edge: p.props.edge === "in" ? ("in" as const) : ("out" as const) }
      : {}),
    ...(typeof props.label === "string" ? { label: props.label } : {}),
    ...(props.ground === true ? { ground: true as const } : {}),
    ...(follow !== undefined ? { follow } : {}),
  };
}

/** The name of an effect or transition the file declares itself. */
function shaderName(type: unknown): string {
  const name = (type as { name?: unknown } | null)?.name;
  return typeof name === "string" ? name : "custom";
}

/** The `follows` of a row: the element (and moment) a `duration={{ until }}` or `{{ match }}` takes its length from. */
function followsOf(duration: unknown): Pick<ElementRow, "follows"> {
  if (typeof duration !== "object" || duration === null) return {};
  const d = duration as { until?: unknown; at?: unknown; match?: unknown };
  if (typeof d.until === "string")
    return { follows: { until: d.until, ...(typeof d.at === "string" ? { at: d.at } : {}) } };
  return typeof d.match === "string" ? { follows: { match: d.match } } : {};
}
