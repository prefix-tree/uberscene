// The music against the picture, as data: the music the timeline plays and its beats, every moment of the video in
// one sorted list, and how far each cut and each start is from its nearest beat. Read from the resolved timeline
// alone, so anything that cannot hear can still tell whether an edit is on the music.
import { kindsWhere, nearestFrame } from "@uberscene/kit/schema";

import { lookupAsset } from "../manifest/types";
import type { Placement, ResolvedState } from "../resolve/resolve";
import { type MusicRow, musicRows } from "./music";
import { spokenWords, type TimelineEntry, timelineBeats, timelineEntries } from "./plays";
import { type CutRow, timelineRows } from "./rows";

/** The beat nearest a moment, and how far the moment is from it. */
export interface NearestBeat {
  readonly clip: string;
  readonly i: number;
  readonly time: number;
  /** The moment minus the beat: positive when the moment comes after the beat. */
  readonly offsetMs: number;
  readonly offsetFrames: number;
}

export type EventKind = "beat" | "word" | "cut" | "start" | "end" | "marker" | "shot" | "silence";

export const EVENT_KINDS: readonly EventKind[] = ["beat", "word", "cut", "start", "end", "marker", "shot", "silence"];

/** One moment of the video: a beat, a word, a cut, an element starting or ending, a marker, a shot or a silence. */
export interface EventRow {
  readonly time: number;
  readonly frame: number;
  readonly kind: EventKind;
  /** What it belongs to: the clip that plays the beat, word, shot or silence; the element; the cut's track. */
  readonly of: string;
  /** A beat's, word's, shot's or silence's index in its asset. */
  readonly i?: number;
  /** A word's text, a cut's `from→to`, an element's kind, a marker's label. */
  readonly label?: string;
  /** For a cut, a start or an end while music plays: the beat it is nearest. */
  readonly nearestBeat?: NearestBeat;
}

/** Elements that start and end without being a moment of their own: cues follow the words, cuts have their kind. */
const NO_EDGES = new Set(["caption", "marker", "transition"]);

/** Elements whose start shows on screen: what a viewer sees change. */
const SEEN = new Set(kindsWhere((kind) => kind.timed && (kind.plane === "canvas" || kind.plane === "dom")));

/**
 * The beat nearest a time, among music that is playing then (or within a beat of it); undefined when none is. `beats`
 * is in time order.
 */
export function nearestBeat(
  state: ResolvedState,
  time: number,
  beats: readonly TimelineEntry[],
  music: readonly MusicRow[],
): NearestBeat | undefined {
  const { rate } = state.composition;
  let best: TimelineEntry | undefined;
  for (const b of beats) {
    const m = music.find((row) => row.clip === b.play);
    if (!m || time < m.from - m.beatSeconds || time > m.to + m.beatSeconds) continue;
    if (!best || Math.abs(b.time - time) < Math.abs(best.time - time)) best = b;
  }
  if (!best) return undefined;
  const m = music.find((row) => row.clip === best.play) as MusicRow;
  // Past the last beat by more than a beat, the nearest beat is not one the moment could be on.
  if (Math.abs(best.time - time) > m.beatSeconds + 1e-6) return undefined;
  return {
    clip: best.play,
    i: best.i,
    time: best.time,
    offsetMs: Math.round((time - best.time) * 1000),
    offsetFrames: nearestFrame(time, rate) - nearestFrame(best.time, rate),
  };
}

export interface EventOptions {
  /** Only events from this second, up to that one. */
  readonly from?: number;
  readonly to?: number;
  readonly kinds?: readonly EventKind[];
}

/**
 * Every moment of the video in one list, in time order: beats, words, cuts, elements starting and ending, markers,
 * shots and silences. Cuts, starts and ends say which beat they are nearest while music plays.
 */
export function timelineEvents(state: ResolvedState, options: EventOptions = {}): EventRow[] {
  const { rate } = state.composition;
  const frame = (t: number): number => nearestFrame(t, rate);
  const rows = timelineRows(state);
  const beats = timelineBeats(state);
  const music = musicRows(state, beats);
  const near = (time: number): Pick<EventRow, "nearestBeat"> => {
    const beat = nearestBeat(state, time, beats, music);
    return beat ? { nearestBeat: beat } : {};
  };
  const out: EventRow[] = [];
  for (const b of beats) out.push({ time: b.time, frame: frame(b.time), kind: "beat", of: b.play, i: b.i });
  for (const kind of ["shots", "silences"] as const)
    for (const e of timelineEntries(state, kind))
      out.push({ time: e.time, frame: frame(e.time), kind: kind === "shots" ? "shot" : "silence", of: e.play, i: e.i });
  for (const w of spokenWords(state))
    out.push({ time: w.start, frame: frame(w.start), kind: "word", of: w.play, i: w.i, label: w.text });
  for (const cut of rows.cuts)
    out.push({
      time: cut.time,
      frame: cut.frame,
      kind: "cut",
      of: cut.track,
      label: `${cut.from}→${cut.to}`,
      ...near(cut.time),
    });
  for (const e of rows.elements) {
    if (e.kind === "marker") {
      out.push({
        time: e.start,
        frame: e.startFrame,
        kind: "marker",
        of: e.id,
        ...(e.label ? { label: e.label } : {}),
      });
      continue;
    }
    if (NO_EDGES.has(e.kind) || !(e.end > e.start)) continue;
    out.push({ time: e.start, frame: e.startFrame, kind: "start", of: e.id, label: e.kind, ...near(e.start) });
    out.push({ time: e.end, frame: e.endFrame, kind: "end", of: e.id, label: e.kind, ...near(e.end) });
  }
  const from = options.from ?? Number.NEGATIVE_INFINITY,
    to = options.to ?? Number.POSITIVE_INFINITY;
  const kinds = options.kinds ? new Set(options.kinds) : null;
  const order = new Map(EVENT_KINDS.map((k, i) => [k, i]));
  return out
    .filter((e) => e.time >= from - 1e-9 && e.time <= to + 1e-9 && (!kinds || kinds.has(e.kind)))
    .sort((a, b) => a.time - b.time || (order.get(a.kind) ?? 0) - (order.get(b.kind) ?? 0));
}

/** A cut, or something starting on screen, against the music. */
export interface SyncPoint {
  readonly time: number;
  readonly frame: number;
  /** A cut between two clips of a sequence, or an element starting on screen. */
  readonly kind: "cut" | "start";
  /** The element that starts: for a cut, the clip it cuts to. */
  readonly id: string;
  /** For a cut, the clip it cuts from. */
  readonly from?: string;
  readonly beat: NearestBeat;
  /**
   * `on`: within a frame of the beat. `near`: off it, but by less than a quarter of a beat, which reads as a miss.
   * `off`: further, which reads as a choice (a cut on a word, on the off-beat).
   */
  readonly status: "on" | "near" | "off";
  /** The file ties it to a beat (`at="beat:N"`), so it follows the music when the music changes. */
  readonly anchored: boolean;
}

export interface SyncIssue {
  readonly rule: "near-beat" | "music-cut-off";
  readonly id: string;
  readonly time: number;
  readonly message: string;
  readonly fix: string;
}

export interface SyncReport {
  readonly music: readonly MusicRow[];
  /** Every cut and every start on screen while music plays, in time order. */
  readonly points: readonly SyncPoint[];
  readonly summary: {
    readonly points: number;
    readonly on: number;
    readonly near: number;
    readonly off: number;
    /** Points the file ties to a beat. */
    readonly anchored: number;
    /** Cuts and starts on screen while no music plays, which the report leaves out. */
    readonly outsideMusic: number;
  };
  readonly issues: readonly SyncIssue[];
}

const isBeatRef = (at: unknown): boolean => typeof at === "string" && at.startsWith("beat:");

/**
 * How the picture sits on the music: each cut and each start on screen with its nearest beat and its distance from
 * it, the ones that miss a beat by a little (`near-beat`), and music that stops between beats with no fade
 * (`music-cut-off`). A film with no music that has beats gives an empty report.
 */
export function syncReport(state: ResolvedState): SyncReport {
  const { fps } = state.composition;
  const frameMs = 1000 / fps;
  const rows = timelineRows(state);
  const beats = timelineBeats(state);
  const music = musicRows(state, beats);
  const musicClips = new Set(music.map((m) => m.clip));
  const cutTo = new Map<string, CutRow>(rows.cuts.map((c) => [c.to, c]));

  const points: SyncPoint[] = [];
  let outsideMusic = 0;
  for (const e of rows.elements) {
    if (!SEEN.has(e.kind) || !(e.end > e.start) || musicClips.has(e.id)) continue;
    // What a helper or a loop made stands with its parent; the report is about what the file places.
    if (e.parent !== e.track && e.parent !== null) continue;
    const beat = nearestBeat(state, e.start, beats, music);
    if (!beat) {
      if (music.length > 0) outsideMusic++;
      continue;
    }
    const cut = cutTo.get(e.id);
    const m = music.find((row) => row.clip === beat.clip) as MusicRow;
    const off = Math.abs(beat.offsetMs);
    const p = state.items.get(e.id) as Placement;
    points.push({
      time: e.start,
      frame: e.startFrame,
      kind: cut ? "cut" : "start",
      id: e.id,
      ...(cut ? { from: cut.from } : {}),
      beat,
      status: off <= frameMs + 0.5 ? "on" : off <= (m.beatSeconds * 1000) / 4 ? "near" : "off",
      anchored: isBeatRef(p.props.at) || isBeatRef((p.props.duration as { at?: unknown } | undefined)?.at),
    });
  }
  points.sort((a, b) => a.time - b.time);

  const issues: SyncIssue[] = [];
  for (const point of points) {
    if (point.status !== "near") continue;
    const { beat } = point;
    const side = beat.offsetMs > 0 ? "after" : "before";
    const what = point.kind === "cut" ? `the cut ${point.from}→${point.id}` : `"${point.id}"`;
    issues.push({
      rule: "near-beat",
      id: point.id,
      time: point.time,
      message: `${what} at ${point.time.toFixed(2)} s is ${Math.abs(beat.offsetMs)} ms ${side} beat ${beat.i} of "${beat.clip}" (${beat.time.toFixed(2)} s): close enough to read as a miss`,
      fix:
        point.kind === "cut"
          ? `end "${point.from}" on the beat: duration={{ until: "${beat.clip}", at: "beat:${beat.i}" }}`
          : `start it on the beat: anchor="${beat.clip}" at="beat:${beat.i}"`,
    });
  }
  for (const m of music) {
    const p = state.items.get(m.clip);
    const asset = lookupAsset(state.manifest, m.asset);
    if (!p?.source || !asset?.beats) continue;
    const fade = (p.props.fade as { out?: number } | undefined)?.out ?? 0;
    if (fade >= 0.2) continue;
    // The edges of the asset's beats, in its own seconds; the clip's last source second against them.
    const edges = [...asset.beats.map((b) => b.start), asset.beats[asset.beats.length - 1]?.end ?? 0];
    const out = p.source.out;
    if (out >= asset.duration - 0.05) continue; // the track's own ending
    const nearest = edges.reduce((best, t) => (Math.abs(t - out) < Math.abs(best - out) ? t : best), edges[0] ?? 0);
    if (Math.abs(nearest - out) * 1000 <= frameMs + 0.5) continue;
    const before = [...asset.beats].reverse().find((b) => b.end <= out + 1e-6);
    issues.push({
      rule: "music-cut-off",
      id: m.clip,
      time: m.to,
      message: `"${m.clip}" stops at ${m.to.toFixed(2)} s, ${Math.round(Math.abs(nearest - out) * 1000)} ms from a beat, with no fade: the music is cut off mid-beat`,
      fix: before
        ? `end it on a beat (out="beat:${before.i}.end") or fade it out (fade={{ out: 0.5 }})`
        : "fade it out (fade={{ out: 0.5 }})",
    });
  }
  issues.sort((a, b) => a.time - b.time);

  const count = (status: SyncPoint["status"]): number => points.filter((p) => p.status === status).length;
  return {
    music,
    points,
    summary: {
      points: points.length,
      on: count("on"),
      near: count("near"),
      off: count("off"),
      anchored: points.filter((p) => p.anchored).length,
      outsideMusic,
    },
    issues,
  };
}
