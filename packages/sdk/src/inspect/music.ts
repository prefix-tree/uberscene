// The music a timeline plays, and its beats at the times they play.
import { nearestFrame, round3 } from "@uberscene/kit/schema";

import { lookupAsset } from "../manifest/types";
import type { ResolvedState } from "../resolve/resolve";
import { endS, startS } from "../time";
import { type TimelineEntry, timelineBeats } from "./plays";

/** A clip or audio whose asset has beats: the music the timeline plays. */
export interface MusicRow {
  readonly clip: string;
  readonly asset: string;
  readonly track: string | null;
  /** The track's role, when the file gives one. */
  readonly role?: string;
  /** Beats per minute, as the manifest has it. */
  readonly tempo?: number;
  /** Seconds from one beat to the next as they play: the middle one of the beats' lengths on the timeline. */
  readonly beatSeconds: number;
  /** How many of its beats play, and the first and last by their index in the asset (`beat:N`). */
  readonly beats: number;
  readonly first: number;
  readonly last: number;
  /** When the clip plays, in the finished video. */
  readonly from: number;
  readonly to: number;
  /** Where the beats come from: found in the sound by `uberscene add`, or set as a grid there. */
  readonly grid: "detected";
}

/** A beat at the time it plays. */
export interface BeatRow {
  readonly asset: string;
  readonly clip: string;
  /** Its index in the asset: `beat:N`. */
  readonly i: number;
  readonly time: number;
  readonly frame: number;
  /** Its time in the asset's own seconds. */
  readonly sourceTime: number;
}

const middle = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/** The music the timeline plays: each clip or audio whose asset has beats, with its tempo and the beats it plays. */
export function musicRows(state: ResolvedState, beats: readonly TimelineEntry[] = timelineBeats(state)): MusicRow[] {
  const byPlay = new Map<string, TimelineEntry[]>();
  for (const b of beats) byPlay.set(b.play, [...(byPlay.get(b.play) ?? []), b]);
  const roles = new Map(state.tracks.map((t) => [t.id, t.role]));
  const out: MusicRow[] = [];
  for (const [clip, played] of byPlay) {
    const p = state.items.get(clip);
    const first = played[0],
      last = played[played.length - 1];
    if (!p || !first || !last) continue;
    const tempo = lookupAsset(state.manifest, first.asset)?.tempo;
    const gaps = played.slice(1).map((b, i) => b.time - (played[i] as TimelineEntry).time);
    const role = p.track ? roles.get(p.track) : undefined;
    out.push({
      clip,
      asset: first.asset,
      track: p.track,
      ...(role ? { role } : {}),
      ...(tempo !== undefined ? { tempo } : {}),
      beatSeconds: round3(gaps.length > 0 ? middle(gaps) : tempo ? 60 / tempo : 0),
      beats: played.length,
      first: first.i,
      last: last.i,
      from: round3(startS(p)),
      to: round3(endS(p)),
      grid: "detected",
    });
  }
  return out.sort((a, b) => a.from - b.from);
}

/** The beats the timeline plays, as rows. */
export function beatRows(state: ResolvedState, beats: readonly TimelineEntry[] = timelineBeats(state)): BeatRow[] {
  const { rate } = state.composition;
  return beats.map((b) => ({
    asset: b.asset,
    clip: b.play,
    i: b.i,
    time: b.time,
    frame: nearestFrame(b.time, rate),
    sourceTime: round3(b.sourceTime),
  }));
}
