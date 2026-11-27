// `uberscene inspect video.tsx`: the timeline read back as an editor reads it, in text or as flat JSON rows, and what
// is on screen and heard at chosen moments. It runs the resolver and the player's model only: no browser, no media.
import type { Knob } from "@uberscene/kit";
import {
  capabilitiesOf,
  type ElementBox,
  elapsedSeconds,
  frameStartSeconds,
  rateLabel,
  round3,
  secondsToTicks,
} from "@uberscene/kit/schema";
import {
  animatedBox,
  animatedTransform,
  buildGainEnvelope,
  type CameraValues,
  cameraValuesAt,
  paramsAt,
  placementSourceTime,
  spaceOf,
  visiblePlacements,
} from "@uberscene/player/engine";
import {
  type ElementRow,
  EVENT_KINDS,
  type EventKind,
  type EventRow,
  followOf,
  listenRange,
  lookupAsset,
  type Moment,
  parseMoments,
  type ResolvedState,
  resolveMoments,
  spokenWords,
  type TimelineRows,
  timelineEvents,
  timelineRows,
} from "@uberscene/sdk";

import { envelopeAt } from "./mixer";

/** One element on screen at a moment, with its values there. */
export interface SeenElement {
  readonly id: string;
  readonly kind: string;
  readonly track: string;
  /** Set when the track is inside the camera: `box` and `transform` are then the element's own, before the camera. */
  readonly camera?: true;
  /** The overlay it moves with (`follow`): `box` is then read in that element's box, before its transform. */
  readonly follow?: string;
  /**
   * With a `follow`: where the point its `box.x` and `box.y` name lands in composition pixels, carried by what it
   * follows (a coordinate left out is that element's centre), before its own transform and the camera.
   */
  readonly placedAt?: { readonly x: number; readonly y: number };
  /** 0..1 through the element. */
  readonly progress: number;
  /** The second of its asset on screen, for footage. */
  readonly sourceTime?: number;
  readonly text?: string;
  /** Where it is placed (`box`), keyframes applied and rounded, in pixels from the frame's top left; absent when it is centred. */
  readonly box?: Readonly<Record<string, unknown>>;
  /** The transform where it differs from the resting one, keyframes applied. */
  readonly transform?: Readonly<Record<string, unknown>>;
  /** Each effect in the order it runs, with its params at this moment. */
  readonly effects: readonly {
    readonly id: string;
    readonly type: string;
    readonly params: Readonly<Record<string, unknown>>;
  }[];
  /** The transition it is in, and how far through. */
  readonly transition?: { readonly id: string; readonly role: "out" | "in"; readonly progress: number };
}

/** One sound playing at a moment. */
export interface HeardElement {
  readonly id: string;
  readonly track: string;
  readonly asset: string;
  /** The gain after volume, keyframes, fades, automation and ducking. */
  readonly gain: number;
}

export interface MomentView extends Moment {
  /** The camera's values at this moment, in a file with one: what it does to every element marked `camera`. */
  readonly camera?: CameraValues;
  /** What is drawn, the top of the picture first. */
  readonly seen: readonly SeenElement[];
  readonly heard: readonly HeardElement[];
  /** The transcript word being said. */
  readonly word?: { readonly i: number; readonly text: string; readonly clip: string };
  /** The caption on screen. */
  readonly caption?: string;
}

const typeName = (type: unknown): string =>
  typeof type === "string" ? type : String((type as { name?: unknown } | null)?.name ?? "custom");

/** Where the point an element's `box.x`, `box.y` name lands once what it follows carries it. */
function placedAt(
  state: ResolvedState,
  p: Parameters<typeof spaceOf>[1],
  children: Parameters<typeof animatedBox>[1],
  t: number,
): { x: number; y: number } {
  const space = spaceOf(state, p, t);
  const box = animatedBox(p.props.box as never, children, t - p.start) as { x?: unknown; y?: unknown } | undefined;
  const x = typeof box?.x === "number" ? box.x : space.frame.width / 2;
  const y = typeof box?.y === "number" ? box.y : space.frame.height / 2;
  const m = space.matrix;
  return { x: Math.round(m.a * x + m.c * y + m.e), y: Math.round(m.b * x + m.d * y + m.f) };
}

/** What is on screen and heard at one moment. */
export function describeAt(state: ResolvedState, moment: Moment): MomentView {
  // The frame it names, as drawn: the moment's time is rounded to the ms, and 0.333 is in frame 9 at 30 fps, not 10.
  const t = frameStartSeconds(moment.frame, state.composition.rate);
  const at = secondsToTicks(t);
  const within = (start: number, end: number): boolean => at >= secondsToTicks(start) && at < secondsToTicks(end);
  const seen: SeenElement[] = [];
  for (const { placement: p, track, children, transition } of visiblePlacements(state, t)) {
    // A clip at the very end of the transition it leaves through draws nothing.
    if (transition?.role === "out" && transition.progress >= 1) continue;
    const rel = elapsedSeconds(t, p.start);
    const transform = restless(animatedTransform(p.props.transform as never, children, rel) as Record<string, unknown>);
    const box = placed(animatedBox(p.props.box as never, children, rel));
    const text = capabilitiesOf(p.kind).hasText ? state.tree.byId.get(p.id)?.text : undefined;
    const follow = followOf(p);
    seen.push({
      id: p.id,
      kind: p.kind,
      track: track.id,
      ...(track.camera !== undefined ? { camera: true as const } : {}),
      ...(follow !== undefined ? { follow, placedAt: placedAt(state, p, children, t) } : {}),
      progress: round3(p.duration > 0 ? Math.min(1, Math.max(0, rel / p.duration)) : 0),
      ...(p.source ? { sourceTime: round3(placementSourceTime(p, children, t)) } : {}),
      ...(text ? { text } : {}),
      ...(box ? { box } : {}),
      ...(transform ? { transform } : {}),
      effects: children
        .filter((c) => c.kind === "effect" && c.props.enabled !== false)
        .map((c) => ({ id: c.id, type: typeName(c.props.type), params: paramsAt(state.items, c, rel) })),
      ...(transition
        ? { transition: { id: transition.placement.id, role: transition.role, progress: round3(transition.progress) } }
        : {}),
    });
  }
  // The file's first track is the bottom of the picture; a person reads a frame from the top.
  seen.reverse();

  const heard: HeardElement[] = [];
  const anySolo = state.tracks.some((track) => track.solo);
  for (const track of state.tracks) {
    if (track.hidden || track.muted || (anySolo && !track.solo)) continue;
    for (const p of state.items.values()) {
      if (p.track !== track.id || p.parent === null || !capabilitiesOf(p.kind).audio) continue;
      // In ticks, as the mixer and the player count: a sound plays from its start up to its end.
      if (!within(p.start, p.end) || !p.source) continue;
      const asset = lookupAsset(state.manifest, p.source.asset);
      if (!asset || asset.kind === "image" || (asset.kind === "video" && !asset.audio)) continue;
      const gain = envelopeAt(buildGainEnvelope(p, track, state, p.start, p.end), t, 1);
      heard.push({ id: p.id, track: track.id, asset: asset.id, gain: Math.round(gain * 100) / 100 });
    }
  }

  const word = spokenWords(state).find((w) => within(w.start, w.end));
  const caption = [...state.items.values()].find(
    (p) => p.kind === "caption" && state.items.get(p.parent ?? "")?.kind === "captions" && within(p.start, p.end),
  );
  const view = cameraValuesAt(state, t);
  return {
    ...moment,
    ...(view
      ? { camera: { x: round3(view.x), y: round3(view.y), zoom: round3(view.zoom), rotation: round3(view.rotation) } }
      : {}),
    seen,
    heard,
    ...(word ? { word: { i: word.i, text: word.text, clip: word.play } } : {}),
    ...(caption ? { caption: String(caption.props.text ?? "") } : {}),
  };
}

/** A box's numbers, rounded; undefined when it places nothing (the element is centred). */
function placed(box: ElementBox | undefined): Record<string, unknown> | undefined {
  if (!box) return undefined;
  const out: Record<string, unknown> = {};
  if (typeof box.x === "number" && Number.isFinite(box.x)) out.x = round3(box.x);
  if (typeof box.y === "number" && Number.isFinite(box.y)) out.y = round3(box.y);
  if (Object.keys(out).length === 0) return undefined;
  if (box.origin) out.origin = box.origin;
  return out;
}

/** The parts of a transform that differ from one at rest, rounded; undefined when none do. */
function restless(t: Record<string, unknown>): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  const pair = (v: unknown, rest: number): { x: number; y: number } | undefined => {
    const p = typeof v === "number" ? { x: v, y: v } : (v as { x?: number; y?: number } | undefined);
    if (!p) return undefined;
    const x = round3(p.x ?? rest),
      y = round3(p.y ?? rest);
    return x === rest && y === rest ? undefined : { x, y };
  };
  const scale = pair(t.scale, 1);
  if (scale) out.scale = scale;
  if (typeof t.rotation === "number" && round3(t.rotation) !== 0) out.rotation = round3(t.rotation);
  if (typeof t.opacity === "number" && round3(t.opacity) !== 1) out.opacity = round3(t.opacity);
  return Object.keys(out).length > 0 ? out : undefined;
}

const seconds = (x: number): string => x.toFixed(2);
const quote = (text: string, max = 48): string =>
  `"${text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text}"`;
const value = (v: unknown): string =>
  typeof v === "number" ? String(round3(v)) : typeof v === "string" ? v : JSON.stringify(v);
const paramList = (params: Readonly<Record<string, unknown>>): string =>
  Object.entries(params)
    .map(([name, v]) => `${name}=${value(v)}`)
    .join(" ");

/** The timeline as text: a line for the video, then each track with its elements in time order. */
export function formatTimeline(file: string, rows: TimelineRows): string {
  const c = rows.composition;
  const lines = [
    `${file}  ${c.width}x${c.height}  ${rateLabel(c.rate)} fps  ${seconds(c.duration)} s (${c.frames} frames)  ${rows.errors.length} error${rows.errors.length === 1 ? "" : "s"}`,
  ];
  for (const e of rows.errors) lines.push(`  error: ${e.id ?? "?"}: ${e.message}`);
  const effects = new Map<string, string[]>();
  for (const fx of rows.effects) {
    const params = paramList(fx.params);
    effects.set(fx.element, [...(effects.get(fx.element) ?? []), `${fx.id}(${fx.type}${params ? ` ${params}` : ""})`]);
  }
  const keyed = new Map<string, Set<string>>();
  for (const k of rows.keyframes) keyed.set(k.element, (keyed.get(k.element) ?? new Set()).add(k.property));
  const words = new Map<string, TimelineRows["words"][number][]>();
  for (const w of rows.words) words.set(w.clip, [...(words.get(w.clip) ?? []), w]);

  const music = new Map(rows.music.map((m) => [m.clip, m]));

  const line = (e: ElementRow): string => {
    const when =
      e.end > e.start
        ? `${seconds(e.start).padStart(7)}–${seconds(e.end).padEnd(7)}`
        : seconds(e.start).padStart(7).padEnd(15);
    const parts = [when, e.kind.padEnd(10), e.id];
    if (e.kind === "transition")
      parts.push(`${e.type ?? ""} (${e.on === undefined ? `${e.from} → ${e.to}` : `${e.edge} of ${e.on}`})`);
    if (e.ground) parts.push("ground");
    if (e.asset)
      parts.push(
        `asset:${e.asset} ${seconds(e.in ?? 0)}–${seconds(e.out ?? 0)}${e.speed !== 1 ? ` at ${e.speed}x` : ""}`,
      );
    const m = music.get(e.id);
    if (m) parts.push(`${m.tempo !== undefined ? `${round3(m.tempo)} BPM  ` : ""}beat:${m.first}–${m.last}`);
    if (e.text) parts.push(quote(e.text));
    if (e.label) parts.push(`"${e.label}"`);
    if (e.anchor)
      parts.push(`anchor ${e.anchor}${e.at !== undefined ? ` at ${e.at}` : ""}${e.offset ? ` +${e.offset}` : ""}`);
    if (e.follows)
      parts.push(
        "match" in e.follows
          ? `as long as ${e.follows.match}`
          : `until ${e.follows.until}${e.follows.at !== undefined ? ` ${e.follows.at}` : " ends"}`,
      );
    const said = words.get(e.id);
    if (said?.length) {
      const first = said[0] as (typeof said)[number],
        last = said[said.length - 1] as (typeof said)[number];
      parts.push(`words ${first.i}–${last.i} ${quote(said.map((w) => w.text).join(" "))}`);
    }
    const fx = effects.get(e.id);
    if (fx) parts.push(`effects: ${fx.join(", ")}`);
    const keys = keyed.get(e.id);
    if (keys) parts.push(`keyframes: ${[...keys].join(", ")}`);
    return `  ${parts.join("  ")}`;
  };

  for (const track of [...rows.tracks].sort((a, b) => a.order - b.order)) {
    const flags = [track.hidden && "hidden", track.muted && "muted", track.solo && "solo"].filter(Boolean);
    lines.push(
      `track ${track.id} (${[track.layout, track.role === "general" ? undefined : track.role, ...flags]
        .filter((part) => part !== undefined)
        .join(", ")})`,
    );
    for (const e of rows.elements) if (e.track === track.id && e.parent === track.id) lines.push(line(e));
  }
  const loose = rows.elements.filter((e) => e.track === null && e.kind !== "caption");
  if (loose.length > 0) {
    lines.push("composition");
    for (const e of loose) {
      lines.push(line(e));
      if (e.kind === "captions") for (const cue of rows.elements) if (cue.parent === e.id) lines.push(`  ${line(cue)}`);
    }
  }
  if (rows.cuts.length > 0)
    lines.push(
      `cuts: ${rows.cuts.map((cut) => `${seconds(cut.time)} ${cut.from}→${cut.to}${cut.transition ? ` (${cut.transition})` : ""}`).join(", ")}`,
    );
  for (const m of rows.music)
    lines.push(
      `music: ${m.clip}  ${m.tempo !== undefined ? `${round3(m.tempo)} BPM  ` : ""}a beat every ${seconds(m.beatSeconds)} s  beat:${m.first} at ${seconds(rows.beats.find((b) => b.clip === m.clip)?.time ?? m.from)} s to beat:${m.last}  (beats ${m.grid})`,
    );
  return `${lines.join("\n")}\n`;
}

/** The timeline's text with the knob lines after its first line, the one that names the file. */
function withKnobs(timeline: string, knobs: readonly Knob[]): string {
  const header = timeline.indexOf("\n") + 1;
  return `${timeline.slice(0, header)}${formatKnobs(knobs)}${timeline.slice(header)}`;
}

/** The file's knobs as text, one line each: key, kind, value, and what it means. */
function formatKnobs(knobs: readonly Knob[]): string {
  return knobs
    .map((k) => {
      const kind = k.kind === "choice" && k.options ? `choice of ${k.options.join(" | ")}` : k.kind;
      const range = k.min !== undefined || k.max !== undefined ? ` ${k.min ?? ""}..${k.max ?? ""}` : "";
      const parts = [`knob ${k.key}`, `${kind}${range}${k.optional ? ", optional" : ""}`];
      if (k.value !== undefined) parts.push(`= ${value(k.value)}`);
      if (k.description) parts.push(quote(k.description, 96));
      return `${parts.join("  ")}\n`;
    })
    .join("");
}

/** Each moment as text: where it is, what is drawn from the top down, what is heard and said. */
export function formatAt(views: readonly MomentView[]): string {
  const blocks = views.map((v) => {
    const lines = [`${v.label}  ${seconds(v.time)} s  frame ${v.frame}  (${v.about})`];
    if (v.seen.length === 0) lines.push("  seen: nothing but the background");
    for (const s of v.seen) {
      const parts = [`${s.kind} ${s.id}`, `${Math.round(s.progress * 100)}% through`];
      if (s.sourceTime !== undefined) parts.push(`source ${seconds(s.sourceTime)} s`);
      if (s.text) parts.push(quote(s.text));
      if (s.transition)
        parts.push(
          `${s.transition.role === "in" ? "coming in" : "going out"} through ${s.transition.id} at ${Math.round(s.transition.progress * 100)}%`,
        );
      if (s.box) parts.push(`box ${paramList(s.box)}`);
      if (s.follow !== undefined)
        parts.push(`follows "${s.follow}"${s.placedAt ? ` (at x ${s.placedAt.x}, y ${s.placedAt.y})` : ""}`);
      if (s.transform) parts.push(`transform ${paramList(flat(s.transform))}`);
      for (const fx of s.effects)
        parts.push(`${fx.id}(${fx.type}${Object.keys(fx.params).length ? ` ${paramList(fx.params)}` : ""})`);
      lines.push(`  seen: ${parts.join("  ")}`);
    }
    for (const h of v.heard) lines.push(`  heard: ${h.id} (asset:${h.asset}) gain ${h.gain.toFixed(2)}`);
    if (v.word) lines.push(`  said: word ${v.word.i} ${quote(v.word.text)} in ${v.word.clip}`);
    if (v.caption) lines.push(`  caption: ${quote(v.caption, 80)}`);
    return lines.join("\n");
  });
  return `${blocks.join("\n\n")}\n`;
}

/** `{ scale: { x, y } }` as `scale.x`, `scale.y`, for one line of text. */
function flat(t: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, v] of Object.entries(t)) {
    if (v && typeof v === "object") for (const [k, inner] of Object.entries(v)) out[`${name}.${k}`] = inner;
    else out[name] = v;
  }
  return out;
}

export interface InspectOptions {
  /** A comma-separated list of moments; without it, the whole timeline. */
  readonly at?: string;
  /** Flat rows as JSON instead of text. */
  readonly json?: boolean;
  /** The file's `schema` values, listed before the timeline (and as `knobs` in the JSON). */
  readonly knobs?: readonly Knob[];
  /** Every moment of the video in one list, in time order, instead of the timeline. */
  readonly events?: boolean;
  /** (events) only a stretch: `all`, a range such as `2..6`, or an element's id. */
  readonly in?: string;
  /** (events) only these kinds, comma-separated: beat, word, cut, start, end, marker, shot, silence. */
  readonly kinds?: string;
}

export interface InspectResult {
  /** What to print. */
  readonly output: string;
  /** What was wrong with the moments asked for; the command fails when any is. */
  readonly errors: readonly string[];
}

/** The timeline of a resolved file, or its moments, as text or JSON. `file` is the name printed. */
export function inspect(file: string, state: ResolvedState, options: InspectOptions = {}): InspectResult {
  if (options.events) return inspectEvents(state, options);
  if (options.in !== undefined || options.kinds !== undefined)
    return { output: "", errors: ["--in and --kinds go with --events"] };
  const rows = timelineRows(state);
  const knobs = options.knobs ?? [];
  if (options.at === undefined)
    return {
      output: options.json
        ? `${JSON.stringify({ knobs, ...rows }, null, 2)}\n`
        : withKnobs(formatTimeline(file, rows), knobs),
      errors: [],
    };
  const { moments, errors } = resolveMoments(state, parseMoments(options.at));
  const views = moments.map((m) => describeAt(state, m));
  return {
    output: options.json ? `${JSON.stringify({ ...rows, at: views }, null, 2)}\n` : formatAt(views),
    errors,
  };
}

function inspectEvents(state: ResolvedState, options: InspectOptions): InspectResult {
  if (options.at !== undefined) return { output: "", errors: ["--events lists moments itself; leave out --at"] };
  let range: { from?: number; to?: number } = {};
  if (options.in !== undefined) {
    const found = listenRange(state, options.in, "list the events of");
    if ("error" in found) return { output: "", errors: [found.error] };
    range = found;
  }
  const kinds = options.kinds?.split(",").map((k) => k.trim());
  const unknown = kinds?.filter((k) => !(EVENT_KINDS as readonly string[]).includes(k)) ?? [];
  if (unknown.length > 0)
    return { output: "", errors: [`--kinds: "${unknown.join('", "')}" is not one of ${EVENT_KINDS.join(", ")}`] };
  const events = timelineEvents(state, { ...range, ...(kinds ? { kinds: kinds as EventKind[] } : {}) });
  return { output: options.json ? `${JSON.stringify({ events }, null, 2)}\n` : formatEvents(events), errors: [] };
}

/** Each event on a line: its second, its frame, its kind, what it belongs to, and the beat it is nearest. */
export function formatEvents(events: readonly EventRow[]): string {
  if (events.length === 0) return "no events\n";
  return events
    .map((e) => {
      const what = e.kind === "word" ? quote(e.label ?? "") : (e.label ?? "");
      const parts = [
        seconds(e.time).padStart(7),
        `f${e.frame}`.padEnd(6),
        e.kind.padEnd(7),
        `${e.of}${e.i !== undefined ? ` ${e.i}` : ""}`,
      ];
      if (what) parts.push(what);
      if (e.nearestBeat) {
        const { clip, i, offsetMs } = e.nearestBeat;
        parts.push(
          offsetMs === 0
            ? `on ${clip}@beat:${i}`
            : `${Math.abs(offsetMs)} ms ${offsetMs > 0 ? "after" : "before"} ${clip}@beat:${i}`,
        );
      }
      return `${parts.join("  ")}\n`;
    })
    .join("");
}
