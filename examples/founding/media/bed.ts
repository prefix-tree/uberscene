// The film's music bed, made here rather than downloaded, so it is ours to share under the repository's licence.
// A pad that moves through one chord every five seconds, minor while the story is the problem and major once the
// video becomes a file, where a pulse, a bass and an arpeggio come in. The same code writes the same bytes on every
// machine.
//
//   pnpm --filter @uberscene/example-founding bed
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const RATE = 48_000;
const LENGTH = 55;
/** The bed peaks here, -6 dBFS, so it sits under the cues. */
const PEAK = 10 ** (-6 / 20);
/** 96 beats a minute; the pulse starts on the beat the video becomes a file. */
const BEAT = 60 / 96;
const PULSE_FROM = 20;
const PULSE_TO = 49;

/** A note's frequency from its MIDI number. */
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// One chord every five seconds, as MIDI notes: the root low, then the voicing. Am F Dm E, then C G Am F C G C.
const CHORDS: readonly (readonly number[])[] = [
  [45, 57, 60, 64],
  [41, 57, 60, 65],
  [38, 57, 62, 65],
  [40, 56, 59, 64],
  [36, 55, 60, 64],
  [43, 55, 59, 62],
  [45, 57, 60, 64],
  [41, 57, 60, 65],
  [36, 55, 60, 64],
  [43, 55, 59, 62],
  [36, 52, 55, 60],
];
const SPAN = 5;

const chordAt = (t: number) => CHORDS[Math.min(CHORDS.length - 1, Math.floor(t / SPAN))] as readonly number[];

/** A soft saw: the first harmonics, each quieter than the last. */
function soft(phase: number): number {
  let v = 0;
  for (let h = 1; h <= 6; h++) v += Math.sin(phase * h) / h ** 1.6;
  return v;
}

/** One-pole low-pass. */
function lowPass(cutoff: number): (x: number) => number {
  const k = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
  let y = 0;
  return (x) => {
    y += k * (x - y);
    return y;
  };
}

export function bed(): Float32Array {
  const out = new Float32Array(LENGTH * RATE);
  // The pad: each chord swells in over 0.8 s and lets go over 1.2 s, overlapping the next.
  for (let c = 0; c < CHORDS.length; c++) {
    const chord = CHORDS[c] as readonly number[];
    const from = c * SPAN;
    const to = c === CHORDS.length - 1 ? LENGTH : from + SPAN;
    const start = Math.max(0, Math.round((from - 0.3) * RATE));
    const end = Math.min(out.length, Math.round((to + 1.2) * RATE));
    for (const [v, note] of chord.slice(1).entries()) {
      for (const detune of [-0.0018, 0.0018]) {
        const f = hz(note) * (1 + detune);
        for (let i = start; i < end; i++) {
          const t = i / RATE;
          const attack = Math.min(1, (t - (from - 0.3)) / 0.8);
          const release = t > to ? Math.max(0, 1 - (t - to) / 1.2) : 1;
          const breathe = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.2 * t + v);
          out[i] = (out[i] as number) + 0.07 * soft(2 * Math.PI * f * t + v) * attack * release * breathe;
        }
      }
    }
  }
  // The pulse, the bass and the arpeggio, from the moment the video becomes a file until the foundation is laid.
  const beats = Math.round((PULSE_TO - PULSE_FROM) / BEAT);
  for (let b = 0; b < beats; b++) {
    const at = PULSE_FROM + b * BEAT;
    const chord = chordAt(at + 0.01);
    // A soft kick on every beat: a sine falling from 110 Hz to 45 Hz.
    let phase = 0;
    for (let i = 0; i < 0.3 * RATE; i++) {
      const t = i / RATE;
      phase += (2 * Math.PI * (45 + 65 * Math.exp(-t / 0.03))) / RATE;
      const j = Math.round(at * RATE) + i;
      if (j < out.length) out[j] = (out[j] as number) + 0.32 * Math.sin(phase) * Math.exp(-t / 0.09);
    }
    // The bass on the first and third beat of a bar: the root, plucked.
    if (b % 2 === 0) {
      const f = hz(chord[0] as number);
      for (let i = 0; i < BEAT * 2 * RATE; i++) {
        const t = i / RATE;
        const j = Math.round(at * RATE) + i;
        const v = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
        if (j < out.length) out[j] = (out[j] as number) + 0.16 * v * Math.min(1, t / 0.01) * Math.exp(-t / 0.5);
      }
    }
    // The arpeggio: two notes a beat, up through the chord an octave above the pad.
    for (let half = 0; half < 2; half++) {
      const step = b * 2 + half;
      const tones = chord.slice(1);
      const note = (tones[step % tones.length] as number) + 12;
      const f = hz(note);
      const begin = at + (half * BEAT) / 2;
      const tone = lowPass(2600);
      for (let i = 0; i < 0.5 * RATE; i++) {
        const t = i / RATE;
        const j = Math.round(begin * RATE) + i;
        const tri = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f * t));
        if (j < out.length)
          out[j] = (out[j] as number) + 0.06 * tone(tri) * Math.min(1, t / 0.004) * Math.exp(-t / 0.18);
      }
    }
  }
  // In at the start, out over the last two seconds; then normalized to the peak.
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    out[i] = (out[i] as number) * Math.min(1, t / 1.5) * Math.min(1, (LENGTH - t) / 2);
  }
  let max = 0;
  for (const s of out) max = Math.max(max, Math.abs(s));
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] = ((out[i] as number) / max) * PEAK;
  return out;
}

/** A mono 16-bit PCM WAV file of the samples. */
export function wav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] as number));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0, "ascii");
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVE", 8, "ascii");
  head.write("fmt ", 12, "ascii");
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36, "ascii");
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

if (import.meta.filename === process.argv[1]) {
  writeFileSync(join(import.meta.dirname, "bed.wav"), wav(bed()));
  process.stdout.write("bed.wav\n");
}
