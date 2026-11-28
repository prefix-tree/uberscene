// A film's timeline as lanes, for drawing it: each track a lane, each element on it a clip with its seconds and name,
// and each sound its level over its seconds, read from the waveform `uberscene add` measured. The picture of an editor's
// timeline, from the timeline itself: what a breakdown of a film's sound shows under the film.
import { lookupAsset } from "../manifest/types";
import type { Placement, ResolvedState } from "../resolve/resolve";

export interface LaneClip {
  readonly id: string;
  /** The element's kind: `clip`, `audio`, `title`, `layer`… */
  readonly kind: string;
  /** Seconds of the film. */
  readonly from: number;
  readonly to: number;
  /** What to write on it: the element's id. */
  readonly label: string;
  /** A sound's level, 0 to 1, at even steps across `from`–`to`; absent when its sound is not measured. */
  readonly level?: readonly number[];
}

export interface Lane {
  /** The track's id; a track whose clips overlap takes more than one lane, `music`, `music-2`… */
  readonly id: string;
  /** The track the lane shows. */
  readonly track: string;
  /** The track's role: `music`, `effects`, `ambience`, `dialogue`, or `general`. */
  readonly role: string;
  /** `sound` when every element on it is a sound, `picture` otherwise. */
  readonly kind: "picture" | "sound";
  readonly clips: readonly LaneClip[];
}

export interface TimelineLanes {
  /** The film's length in seconds. */
  readonly length: number;
  /** Top to bottom as an editor stacks them: picture above sound, each in the file's order. */
  readonly lanes: readonly Lane[];
}

/** Elements that are a lane's clips: what plays or shows for a stretch. */
const SHOWN = new Set([
  "clip",
  "audio",
  "title",
  "shape",
  "svg",
  "sticker",
  "layer",
  "nested",
  "motion",
  "three",
  "captions",
]);

const round3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * The timeline as lanes. `steps` is how many level values a second of sound gets (default 25); a clip's level is
 * the peak of its asset's waveform over each step, scaled by its volume when that is a number.
 */
export function timelineLanes(state: ResolvedState, { steps = 25 }: { steps?: number } = {}): TimelineLanes {
  const lanes: Lane[] = [];
  for (const track of [...state.tracks].sort((a, b) => a.order - b.order)) {
    const clips: LaneClip[] = [];
    for (const id of track.items) {
      const p = state.items.get(id);
      if (!p || !SHOWN.has(p.kind) || !(p.end > p.start)) continue;
      // What a helper or a loop made inside an element stands with its parent.
      if (p.parent !== null && p.parent !== track.id) continue;
      const level = p.kind === "audio" ? levelOf(state, p, steps) : undefined;
      clips.push({
        id: p.id,
        kind: p.kind,
        from: round3(p.start),
        to: round3(p.end),
        label: p.id,
        ...(level ? { level } : {}),
      });
    }
    if (clips.length === 0) continue;
    const kind = clips.every((c) => c.kind === "audio") ? "sound" : "picture";
    // Clips that overlap go to the next lane down, as an editor stacks them: each to the first lane free at its start.
    const rows: LaneClip[][] = [];
    for (const c of clips.sort((a, b) => a.from - b.from || a.to - b.to)) {
      const row = rows.find((r) => (r[r.length - 1] as LaneClip).to <= c.from + 1e-6);
      if (row) row.push(c);
      else rows.push([c]);
    }
    rows.forEach((row, i) =>
      lanes.push({
        id: i === 0 ? track.id : `${track.id}-${i + 1}`,
        track: track.id,
        role: track.role ?? "general",
        kind,
        clips: row,
      }),
    );
  }
  // An editor stacks picture above sound; within each, the file's order.
  lanes.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "picture" ? -1 : 1));
  return { length: round3(state.composition.duration), lanes };
}

function levelOf(state: ResolvedState, p: Placement, steps: number): number[] | undefined {
  const source = p.source;
  const wave = source ? lookupAsset(state.manifest, source.asset)?.waveform : undefined;
  if (!source || !wave || wave.peaks.length === 0) return undefined;
  const volume = typeof p.props.volume === "number" ? p.props.volume : 1;
  const n = Math.max(1, Math.round((p.end - p.start) * steps));
  const span = (p.end - p.start) / n;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    // The step's stretch of the source, in its own seconds.
    const a = source.in + i * span * source.speed;
    const b = source.in + (i + 1) * span * source.speed;
    const first = Math.floor(a / wave.binSeconds);
    const last = Math.max(first, Math.ceil(b / wave.binSeconds) - 1);
    let peak = 0;
    for (let k = first; k <= last && k < wave.peaks.length; k++) peak = Math.max(peak, wave.peaks[k] ?? 0);
    out.push(Math.round(Math.min(1, peak * volume) * 100) / 100);
  }
  return out;
}
