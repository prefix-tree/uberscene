// `uberscene video.tsx --check-motion`: the stretches where nothing on screen moves. A contact sheet of stills can't
// show a frozen video, since a still of a frozen scene looks fine; this draws small frames at an even step, as the
// export draws them, and compares each with the next. A run of identical frames longer than `min` is reported with
// what is on screen in it, so a hold you meant is easy to tell from a scene that died.
import { frameStartSeconds, framesUntil, nearestFrame, round3 } from "@uberscene/kit/schema";
import type { MediaResolver } from "@uberscene/player/engine";
import type { ResolvedState } from "@uberscene/sdk";

import type { FontFile } from "./fonts";
import { FrameKeys, readCached, writeCached } from "./frame-cache";
import { describeAt } from "./inspect";
import { decodePng, type Picture } from "./png";
import { type ExportSource, openEngine } from "./renderer";
import { TILE_BAND } from "./web/page/protocol";

export interface MotionCheckOptions {
  readonly state: ResolvedState;
  readonly source: ExportSource;
  readonly media: MediaResolver;
  readonly fonts?: readonly FontFile[];
  /** Seconds between the frames compared; default 0.2. */
  readonly step?: number;
  /** The shortest still stretch reported, in seconds; default 1. */
  readonly min?: number;
  readonly from?: number;
  readonly to?: number;
  readonly cacheDir?: string;
  readonly frameTimeout?: number;
  readonly onLog?: (message: string) => void;
}

/** A stretch where the picture does not change. */
export interface StillStretch {
  readonly from: number;
  readonly to: number;
  readonly seconds: number;
  /** What is on screen in it, by id. */
  readonly seen: readonly string[];
}

export interface MotionCheckResult {
  readonly step: number;
  readonly min: number;
  readonly samples: number;
  /** The change from each frame to the next: the share of its pixels that changed, in percent. */
  readonly change: readonly { readonly t: number; readonly change: number }[];
  readonly still: readonly StillStretch[];
  readonly warnings: readonly string[];
}

/** Frames with a smaller share of changed pixels than this, in percent, count as the same picture. */
const SAME = 0.02;
/** A pixel counts as changed when a channel moves by more than this, out of 255. */
const PIXEL = 3;
const CELL = 240;
/** The most frames drawn in one call to the page. */
const BATCH = 48;

export async function checkMotion(options: MotionCheckOptions): Promise<MotionCheckResult> {
  const { state } = options;
  const { rate, duration } = state.composition;
  const stepS = options.step ?? 0.2;
  const min = options.min ?? 1;
  if (!(stepS > 0)) throw new Error(`step must be above 0 seconds, got ${stepS}`);
  if (!(min > 0)) throw new Error(`min must be above 0 seconds, got ${min}`);
  if (min < stepS * 2) throw new Error(`min (${min} s) must be at least two steps (${stepS * 2} s)`);
  const first = nearestFrame(options.from ?? 0, rate);
  const last = framesUntil(Math.min(duration, options.to ?? duration), rate);
  const every = Math.max(1, Math.round(stepS * state.composition.fps));
  const frames: number[] = [];
  for (let n = first; n < last; n += every) frames.push(n);
  if (frames.length < 2)
    throw new Error("the stretch is too short to compare frames; give a longer one or a smaller step");

  const warnings: string[] = [];
  const keys = options.cacheDir
    ? new FrameKeys({ state, source: options.source, media: options.media, fonts: options.fonts })
    : null;
  const names = await Promise.all(
    frames.map(async (n) =>
      keys ? `tile-${await keys.key(n, { tile: CELL, label: "", hidden: null }, state)}.png` : null,
    ),
  );
  const tiles: (Uint8Array | null)[] = names.map((name) =>
    options.cacheDir && name ? readCached(options.cacheDir, name) : null,
  );
  const missing = tiles.map((t, i) => (t ? -1 : i)).filter((i) => i >= 0);
  if (missing.length > 0) {
    const engine = await openEngine({ ...options, warnings });
    try {
      for (let at = 0; at < missing.length; at += BATCH) {
        const batch = missing.slice(at, at + BATCH);
        const drawn = await engine.tiles({
          cells: batch.map((i) => ({ t: frameStartSeconds(frames[i] as number, rate), label: "" })),
          cellWidth: CELL,
        });
        for (const [k, i] of batch.entries()) {
          tiles[i] = drawn.tiles[k] as Uint8Array;
          const name = names[i];
          if (options.cacheDir && name) writeCached(options.cacheDir, name, tiles[i] as Uint8Array);
        }
      }
      const failed = await engine.errors();
      for (const f of failed) warnings.push(`asset error: ${f}`);
    } finally {
      await engine.close();
    }
  }

  const pictures = tiles.map((bytes) => decodePng(bytes as Uint8Array));
  const change: { t: number; change: number }[] = [];
  for (let i = 1; i < pictures.length; i++)
    change.push({
      t: round3(frameStartSeconds(frames[i] as number, rate)),
      change: Math.round(difference(pictures[i - 1] as Picture, pictures[i] as Picture) * 1000) / 1000,
    });

  // Runs of frames each the same as the one before.
  const still: StillStretch[] = [];
  let runStart = -1;
  const close = (endIndex: number) => {
    if (runStart < 0) return;
    const from = frameStartSeconds(frames[runStart] as number, rate);
    const to = frameStartSeconds(frames[endIndex] as number, rate);
    if (to - from >= min - 1e-6) {
      const mid = frames[Math.floor((runStart + endIndex) / 2)] as number;
      const seen = describeAt(state, {
        time: frameStartSeconds(mid, rate),
        frame: mid,
        label: "",
        about: "",
      }).seen.map((s) => s.id);
      still.push({ from: round3(from), to: round3(to), seconds: round3(to - from), seen });
    }
    runStart = -1;
  };
  for (let i = 1; i < pictures.length; i++) {
    const same = (change[i - 1] as { change: number }).change < SAME;
    if (same && runStart < 0) runStart = i - 1;
    if (!same) close(i - 1);
  }
  close(pictures.length - 1);
  return { step: round3(every / state.composition.fps), min, samples: frames.length, change, still, warnings };
}

/**
 * The share of pixels that changed between two tiles' pictures (the band with the label left out), in percent. A
 * count rather than a mean, so a small thing that moves (a button pressed, a letter typed) still counts.
 */
function difference(a: Picture, b: Picture): number {
  const h = Math.min(a.height, b.height) - TILE_BAND;
  const w = Math.min(a.width, b.width);
  if (h <= 0 || w <= 0) return 0;
  let changed = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ia = (y * a.width + x) * 4;
      const ib = (y * b.width + x) * 4;
      if (
        Math.abs((a.rgba[ia] as number) - (b.rgba[ib] as number)) > PIXEL ||
        Math.abs((a.rgba[ia + 1] as number) - (b.rgba[ib + 1] as number)) > PIXEL ||
        Math.abs((a.rgba[ia + 2] as number) - (b.rgba[ib + 2] as number)) > PIXEL
      )
        changed++;
    }
  }
  return (changed / (w * h)) * 100;
}

/** The result as lines to read: each still stretch, then a count. */
export function formatMotion(result: MotionCheckResult): string {
  const lines = result.still.map(
    (s) =>
      `still ${s.from.toFixed(2)}-${s.to.toFixed(2)} s (${s.seconds.toFixed(1)} s): nothing on screen moves${s.seen.length ? `; on screen: ${s.seen.join(", ")}` : ""}`,
  );
  for (const w of result.warnings) lines.push(`warning: ${w}`);
  lines.push(
    result.still.length === 0
      ? `no still stretch of ${result.min} s or more (${result.samples} frames, ${result.step} s apart)`
      : `${result.still.length} still stretch${result.still.length === 1 ? "" : "es"} of ${result.min} s or more (${result.samples} frames, ${result.step} s apart). Look at each with look --motion <from>..<to>; keep a hold you meant, give the rest a move`,
  );
  return `${lines.join("\n")}\n`;
}
