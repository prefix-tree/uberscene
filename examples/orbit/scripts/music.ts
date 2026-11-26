// The orbit film's music, synthesized here so it is ours to share under the repository's licence: 16 bars at 120 BPM,
// the first beat at 0 s, so beat N is at N / 2 seconds and the beats are a grid, not a guess. Four sections of four
// bars: an intro of pad and a soft pulse, a build where hats and snares come in under a riser, a drop with the full
// beat and bass, and an outro that thins back to the pad and ends on the downbeat of bar 16.
//
//   pnpm --filter @uberscene/example-orbit music     writes media/song.wav, then adds it with its grid
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { addAsset } from "@uberscene/render";

import { wav } from "../../shorts/media/sounds";

const here = join(import.meta.dirname, "..");
const media = join(here, "media");
mkdirSync(media, { recursive: true });
const file = join(media, "song.wav");

const RATE = 48_000;
const BPM = 120;
const BEAT = 60 / BPM;
const BARS = 16;
/** The last chord rings this long after the final downbeat. */
const TAIL = 2;

/** The sections, by bar (from 0). */
const INTRO = [0, 4],
  BUILD = [4, 8],
  DROP = [8, 12],
  OUTRO = [12, 16];
const inside = (bar: number, [from, to]: number[]): boolean => bar >= (from as number) && bar < (to as number);

/** A minor progression, one chord a bar: A minor, F, C, G, as the frequencies of their notes. */
const CHORDS = [
  [220, 261.63, 329.63, 392],
  [174.61, 220, 261.63, 349.23],
  [196, 261.63, 329.63, 392],
  [196, 246.94, 293.66, 392],
];
const ROOTS = [55, 43.65, 65.41, 49];

if (!existsSync(file)) {
  const length = BARS * 4 * BEAT + TAIL;
  const out = new Float32Array(Math.round(length * RATE));
  let seed = 7;
  const white = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
  /** Adds `voice(t)` from `at` seconds for `len` seconds. */
  const add = (at: number, len: number, voice: (t: number) => number): void => {
    const from = Math.round(at * RATE);
    for (let i = 0; i < len * RATE && from + i < out.length; i++)
      out[from + i] = (out[from + i] as number) + voice(i / RATE);
  };
  const tone = (f: number, x: number): number =>
    Math.sin(2 * Math.PI * f * x) + 0.35 * Math.sin(2 * Math.PI * 2 * f * x) + 0.12 * Math.sin(2 * Math.PI * 3 * f * x);

  const kick = (t: number, gain = 1): void =>
    add(
      t,
      0.3,
      (x) => gain * Math.sin(2 * Math.PI * (48 * x + 110 * 0.035 * (1 - Math.exp(-x / 0.035)))) * Math.exp(-x / 0.09),
    );
  const snare = (t: number, gain = 1): void =>
    add(
      t,
      0.25,
      (x) =>
        gain *
        (0.42 * white() * Math.exp(-x / 0.06) +
          0.3 * Math.sin(2 * Math.PI * 185 * x) * Math.exp(-x / 0.035) +
          0.18 * white() * Math.exp(-Math.max(0, x - 0.012) / 0.02) * (x > 0.012 ? 1 : 0)),
    );
  const hat = (t: number, gain: number): void => {
    let prev = 0;
    add(t, 0.06, (x) => {
      const n = white();
      const high = n - prev;
      prev = n;
      return gain * high * Math.exp(-x / 0.014);
    });
  };

  for (let bar = 0; bar < BARS; bar++) {
    const t0 = bar * 4 * BEAT;
    const chord = CHORDS[bar % 4] as number[];
    const root = ROOTS[bar % 4] as number;
    const last = bar === BARS - 1;

    // The pad: the chord, slow in and out, under everything; the last one rings out.
    const padLen = last ? 4 * BEAT + TAIL : 4 * BEAT + 0.4;
    const padGain = inside(bar, DROP) ? 0.075 : 0.09;
    for (const f of chord)
      add(t0, padLen, (x) => {
        const env = Math.min(1, x / 0.6) * Math.min(1, (padLen - x) / (last ? TAIL : 0.5));
        return padGain * env * (tone(f, x) + 0.6 * tone(f * 1.004, x));
      });

    // The arpeggio, from bar 3: the chord's notes an octave up, a pluck every eighth.
    if (bar >= 2 && !last)
      for (let e = 0; e < 8; e++) {
        const f = (chord[[0, 2, 1, 3, 2, 1, 3, 2][e] as number] as number) * 2;
        const g = inside(bar, DROP) ? 0.07 : 0.05;
        add(t0 + e * (BEAT / 2), 0.4, (x) => g * Math.sin(2 * Math.PI * f * x) * Math.exp(-x / 0.12));
      }

    for (let b = 0; b < 4; b++) {
      const t = t0 + b * BEAT;
      // Intro: a soft low pulse on the beat, a heartbeat.
      if (inside(bar, INTRO)) kick(t, 0.28);
      // Build: hats from bar 5, snares on 2 and 4 from bar 6, the kick from bar 7.
      if (inside(bar, BUILD)) {
        hat(t + BEAT / 2, 0.16);
        if (bar >= 5 && b % 2 === 1) snare(t, 0.85);
        if (bar >= 6 && !(bar === 7 && b === 3)) kick(t, 0.8);
      }
      // Drop: the full beat, with the bass on the root.
      if (inside(bar, DROP)) {
        kick(t, 1);
        if (b % 2 === 1) snare(t, 1);
        hat(t + BEAT / 2, 0.22);
        hat(t + BEAT / 4, 0.08);
        hat(t + (3 * BEAT) / 4, 0.08);
        const bass = (f: number, len: number) => (x: number) =>
          0.42 * tone(f, x) * Math.min(1, x / 0.004) * Math.exp(-x / len);
        add(t, 0.4, bass(root * 2, 0.22));
        add(t + BEAT / 2, 0.3, bass(root * 4, 0.12));
      }
      // Outro: the beat falls away; one kick on each downbeat, and the last bar is the chord alone.
      if (inside(bar, OUTRO) && b === 0) kick(t, last ? 0.9 : 0.6);
      if (inside(bar, OUTRO) && bar < 14) hat(t + BEAT / 2, 0.1 * (14 - bar));
    }
  }

  // The riser over bar 8: noise swelling into the drop, cut a sixteenth before it so the drop lands in a gap.
  const riseFrom = 7 * 4 * BEAT,
    riseLen = 4 * BEAT - BEAT / 4;
  let low = 0;
  add(riseFrom, riseLen, (x) => {
    const k = x / riseLen;
    low += (white() - low) * (0.02 + 0.5 * k * k);
    return 0.35 * k * k * low;
  });

  // Mastered as a limiter would: driven into a soft clip under a peak of -3.8 dBFS. The film plays this mono file on
  // both channels, which measures 3 LU louder: about -14 LUFS there, the level TikTok and Reels play at.
  let max = 0;
  for (const s of out) max = Math.max(max, Math.abs(s));
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(((out[i] as number) / max) * 2.4) * 10 ** (-3.8 / 20);
  writeFileSync(file, wav(out));
  process.stdout.write(`song.wav: ${BARS} bars at ${BPM} BPM, ${length.toFixed(1)} s\n`);
}

// Added with its grid: every beat is where the music put it.
const added = await addAsset(file, { id: "song", manifest: join(here, "uberscene.json"), bpm: BPM, firstBeat: 0 });
process.stdout.write(`song: ${added.entry.beats?.length} beats at ${added.entry.tempo} BPM in ${added.manifest}\n`);
