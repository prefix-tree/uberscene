// Music for the beat film (beats.tsx), synthesized here so it is ours to share under the repository's licence.
// `pnpm --filter @uberscene/example-showcase gen` runs it; it skips a file that exists.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { wav } from "../shorts/media/sounds";

const dir = join(import.meta.dirname, "media");
mkdirSync(dir, { recursive: true });

/**
 * Music for the beat film: 34 beats at 120 BPM after a half-beat of lead-in, synthesized here so it is ours to share.
 * A kick on every beat, a hat between, a snare on beats two and four, and a bass line that changes every bar.
 */
const groove = join(dir, "groove.wav");
if (!existsSync(groove)) {
  const RATE = 48_000;
  const BEAT = 0.5;
  const LEAD = 0.25;
  const BEATS = 34;
  const out = new Float32Array(Math.round((LEAD + BEATS * BEAT + 0.5) * RATE));
  let seed = 11;
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
  // A minor line: the root of each bar, in Hz (A, F, C, G).
  const roots = [55, 43.65, 65.41, 49];
  for (let b = 0; b < BEATS; b++) {
    const t = LEAD + b * BEAT;
    // Kick: a sine that drops from 150 to 50 Hz.
    add(
      t,
      0.22,
      (x) => Math.sin(2 * Math.PI * (50 * x + 100 * 0.03 * (1 - Math.exp(-x / 0.03)))) * Math.exp(-x / 0.07),
    );
    // Hat on the off-beat: bright noise, 40 ms.
    let prev = 0;
    add(t + BEAT / 2, 0.05, (x) => {
      const n = white();
      const high = n - prev;
      prev = n;
      return 0.22 * high * Math.exp(-x / 0.012);
    });
    // Snare on beats two and four: noise with a little body.
    if (b % 2 === 1)
      add(
        t,
        0.16,
        (x) => 0.35 * white() * Math.exp(-x / 0.045) + 0.25 * Math.sin(2 * Math.PI * 190 * x) * Math.exp(-x / 0.03),
      );
    // Bass: the bar's root, an octave up on the off-beat.
    const root = roots[Math.floor(b / 4) % roots.length] as number;
    const bass = (f: number) => (x: number) =>
      0.4 *
      (Math.sin(2 * Math.PI * f * x) + 0.3 * Math.sin(2 * Math.PI * 2 * f * x)) *
      Math.min(1, x / 0.005) *
      Math.exp(-x / 0.14);
    add(t, 0.24, bass(root * 2));
    add(t + BEAT / 2, 0.2, bass(root * 4));
  }
  // Driven into a soft clip, as a limiter would: the mix gets denser and louder under the same peak, -2.5 dBFS.
  let max = 0;
  for (const s of out) max = Math.max(max, Math.abs(s));
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(((out[i] as number) / max) * 3.2) * 10 ** (-2.5 / 20);
  writeFileSync(groove, wav(out));
  process.stdout.write("groove.wav\n");
}
