// The beats of a piece of music, for `beat:N`: an onset envelope from the spectral flux, the tempo from its
// autocorrelation, and the beats from dynamic programming that rewards beats on onsets one period apart (the method
// of Ellis, "Beat Tracking by Dynamic Programming", 2007). Or a grid, when the tempo and the first beat are known.
import type { Beat } from "@uberscene/sdk";

/** What the music's beats are: the tempo and every beat, each to the next. */
export interface BeatTrack {
  /** Beats per minute, to two decimals. */
  readonly tempo: number;
  readonly beats: readonly Beat[];
}

const FRAME = 1024;
const HOP = 512;
/** The tempos it looks for, and the one it leans toward when two are equally strong (a half or a double). */
const MIN_BPM = 60;
const MAX_BPM = 200;
const PREFER_BPM = 120;
/** How much the tracker pays for a beat off the period: higher keeps the beats steadier. */
const TIGHTNESS = 100;

const round3 = (t: number) => Math.round(t * 1000) / 1000;

/** Beats evenly spaced from `first` (seconds) at `bpm`, up to `duration`. */
export function beatGrid(bpm: number, first: number, duration: number): BeatTrack {
  if (!(bpm > 0)) throw new Error(`a tempo is a positive number of beats per minute, not ${bpm}`);
  if (!(first >= 0)) throw new Error(`the first beat is at 0 s or later, not ${first}`);
  const period = 60 / bpm;
  const times: number[] = [];
  for (let t = first; t < duration - 1e-6; t += period) times.push(t);
  return { tempo: Math.round(bpm * 100) / 100, beats: toBeats(times, period) };
}

/** Finds the beats of mono samples at `sampleRate`. Fewer than four beats' worth of sound gives none. */
export function detectBeats(samples: Float32Array, sampleRate: number): BeatTrack {
  const onset = onsetEnvelope(samples, sampleRate);
  const fps = sampleRate / HOP;
  if (onset.length < 8) return { tempo: 0, beats: [] };
  const period = tempoPeriod(onset, fps);
  if (period === 0) return { tempo: 0, beats: [] };
  const frames = track(onset, period);
  // An onset frame's time is its centre: the window starts FRAME/2 earlier than the hop says.
  const times = frames.map((f) => ((f + peakOffset(onset, f)) * HOP + FRAME / 2) / sampleRate);
  const step = period / fps;
  return { tempo: Math.round((60 / step) * 100) / 100, beats: toBeats(times, step) };
}

/** How far the onset's peak is from frame `f`, in hops (-0.5 to 0.5): the top of a parabola through it and its neighbours. */
function peakOffset(onset: Float32Array, f: number): number {
  const a = onset[f - 1];
  const b = onset[f] as number;
  const c = onset[f + 1];
  if (a === undefined || c === undefined || b < a || b < c) return 0;
  const d = a - 2 * b + c;
  return d < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / d)) : 0;
}

function toBeats(times: readonly number[], period: number): Beat[] {
  return times.map((t, i) => ({ i, start: round3(t), end: round3(times[i + 1] ?? t + period) }));
}

/** Below this, an onset is a kick or a bass note: what a listener taps a foot to. */
const LOW_HZ = 200;

/**
 * The spectral flux per hop: how much louder each frequency got since the last frame, summed, on a log scale. The low
 * end counts once more on its own, as much as all the rest: a hat between the beats is bright and wide, and without
 * this it can outweigh the kick and pull the beats half a period off.
 */
function onsetEnvelope(samples: Float32Array, sampleRate: number): Float32Array {
  const count = Math.max(0, Math.floor((samples.length - FRAME) / HOP) + 1);
  const window = new Float32Array(FRAME);
  for (let i = 0; i < FRAME; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FRAME);
  const re = new Float32Array(FRAME);
  const im = new Float32Array(FRAME);
  const half = FRAME / 2;
  let prev = new Float32Array(half);
  let next = new Float32Array(half);
  const all = new Float32Array(count);
  const low = new Float32Array(count);
  const lowBins = Math.max(2, Math.ceil((LOW_HZ * FRAME) / sampleRate));
  for (let f = 0; f < count; f++) {
    const at = f * HOP;
    for (let i = 0; i < FRAME; i++) {
      re[i] = (samples[at + i] as number) * (window[i] as number);
      im[i] = 0;
    }
    fft(re, im);
    let sum = 0;
    let lowSum = 0;
    for (let k = 0; k < half; k++) {
      const mag = Math.log1p(1000 * Math.hypot(re[k] as number, im[k] as number));
      next[k] = mag;
      if (f === 0) continue;
      const up = Math.max(0, mag - (prev[k] as number));
      sum += up;
      if (k < lowBins) lowSum += up;
    }
    all[f] = sum;
    low[f] = lowSum;
    [prev, next] = [next, prev];
  }
  const allPeak = all.reduce((m, v) => Math.max(m, v), 0) || 1;
  const lowPeak = low.reduce((m, v) => Math.max(m, v), 0) || 1;
  const flux = new Float32Array(count);
  for (let f = 0; f < count; f++) flux[f] = (all[f] as number) / allPeak + (low[f] as number) / lowPeak;
  // Take away the local mean (about 0.5 s) so a loud passage doesn't count as onsets, keep what's above it.
  const span = 21;
  const out = new Float32Array(count);
  let acc = 0;
  for (let i = 0; i < count + span; i++) {
    if (i < count) acc += flux[i] as number;
    if (i - 2 * span - 1 >= 0) acc -= flux[i - 2 * span - 1] as number;
    const c = i - span;
    if (c >= 0 && c < count) {
      const lo = Math.max(0, c - span);
      const hi = Math.min(count - 1, c + span);
      out[c] = Math.max(0, (flux[c] as number) - acc / (hi - lo + 1));
    }
  }
  const peak = out.reduce((m, v) => Math.max(m, v), 0);
  if (peak > 0) for (let i = 0; i < count; i++) out[i] = (out[i] as number) / peak;
  return out;
}

/** The beat period in hops: the lag where the envelope best matches itself, weighted toward PREFER_BPM. */
function tempoPeriod(raw: Float32Array, fps: number): number {
  // Smoothed first, so a period that falls between two whole hops still makes one broad peak, not two halves.
  const onset = smooth(raw, 2);
  const minLag = Math.max(1, Math.floor((60 / MAX_BPM) * fps));
  const maxLag = Math.min(onset.length - 1, Math.ceil((60 / MIN_BPM) * fps));
  const preferLag = (60 / PREFER_BPM) * fps;
  let best = 0;
  let bestScore = 0;
  // Out to twice the slowest period, for the bonus below.
  const top = Math.min(onset.length - 1, 2 * maxLag + 1);
  const corr = new Float32Array(top + 2);
  for (let lag = Math.max(1, minLag - 1); lag <= top; lag++) {
    let s = 0;
    for (let i = lag; i < onset.length; i++) s += (onset[i] as number) * (onset[i - lag] as number);
    corr[lag] = s / (onset.length - lag);
  }
  // A period between two whole hops splits its peak over both, so each lag counts its neighbours; and a beat's period
  // also matches at twice the lag, so that counts too, which keeps a tempo from being heard at half its speed.
  const near = (lag: number) =>
    lag < 1 || lag > top ? 0 : ((corr[lag - 1] ?? 0) + 2 * (corr[lag] ?? 0) + (corr[lag + 1] ?? 0)) / 4;
  for (let lag = minLag; lag <= maxLag; lag++) {
    // A log-Gaussian over the octave around the preferred tempo: half and double tempos weigh less.
    const w = Math.exp(-0.5 * (Math.log2(lag / preferLag) / 1) ** 2);
    const score = (near(lag) + 0.5 * near(2 * lag)) * w;
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  if (best === 0) return 0;
  // Between whole hops: the peak of a parabola through the best lag and its neighbours.
  const a = corr[best - 1] ?? 0;
  const b = corr[best] as number;
  const c = corr[best + 1] ?? 0;
  const d = a - 2 * b + c;
  return d < 0 ? best + (0.5 * (a - c)) / d : best;
}

/** A Gaussian blur of `sigma` hops. */
function smooth(x: Float32Array, sigma: number): Float32Array {
  const r = Math.ceil(sigma * 3);
  const k = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-0.5 * ((i - r) / sigma) ** 2));
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let s = 0;
    let w = 0;
    for (let j = -r; j <= r; j++) {
      const v = x[i + j];
      if (v === undefined) continue;
      s += v * (k[j + r] as number);
      w += k[j + r] as number;
    }
    out[i] = s / w;
  }
  return out;
}

/** The beat frames: each beat an onset, one period after the last, found by dynamic programming. */
function track(onset: Float32Array, period: number): number[] {
  const n = onset.length;
  const score = new Float64Array(n);
  const from = new Int32Array(n).fill(-1);
  const lo = Math.max(1, Math.round(period / 2));
  const hi = Math.round(period * 2);
  for (let t = 0; t < n; t++) {
    let best = 0;
    let arg = -1;
    for (let back = lo; back <= hi && t - back >= 0; back++) {
      const off = Math.log(back / period);
      const s = (score[t - back] as number) - TIGHTNESS * off * off;
      if (arg === -1 || s > best) {
        best = s;
        arg = t - back;
      }
    }
    score[t] = (onset[t] as number) + (arg === -1 ? 0 : Math.max(0, best));
    from[t] = arg !== -1 && best > 0 ? arg : -1;
  }
  // The last beat: the best score in the final period, then back through each beat's predecessor.
  let end = n - 1;
  for (let t = Math.max(0, n - Math.round(period)); t < n; t++)
    if ((score[t] as number) > (score[end] as number)) end = t;
  const frames: number[] = [];
  for (let t = end; t >= 0; t = from[t] as number) frames.push(t);
  frames.reverse();
  // A beat counted on into silence, before the music starts or after it stops, is not one: drop those at the ends.
  const sounds = (f: number) => Math.max(onset[f - 1] ?? 0, onset[f] ?? 0, onset[f + 1] ?? 0) > 0.05;
  while (frames.length > 0 && !sounds(frames.at(-1) as number)) frames.pop();
  while (frames.length > 0 && !sounds(frames[0] as number)) frames.shift();
  return frames;
}

/** An in-place radix-2 FFT; the length is a power of two. */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j] as number, re[i] as number];
      [im[i], im[j]] = [im[j] as number, im[i] as number];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = (re[b] as number) * cr - (im[b] as number) * ci;
        const ti = (re[b] as number) * ci + (im[b] as number) * cr;
        re[b] = (re[a] as number) - tr;
        im[b] = (im[a] as number) - ti;
        re[a] = (re[a] as number) + tr;
        im[a] = (im[a] as number) + ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}
