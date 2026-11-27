// The liftoff film's music, synthesized here so it is ours to share under the repository's licence: 20 bars at
// 120 BPM, the first beat at 0 s, so beat N is at N / 2 seconds and the beats are a grid, not a guess. Stereo, 48 kHz.
//
//   bars 1–4    countdown  a low drone opening up, a clock tick on every beat, a mission-control beep on each count
//                          from ten (beat 6) to one (beat 15)
//   bar 5       ignition   a sub drop, a burst of noise that falls into the rumble of the engines (beat 16)
//   bars 5–8    Apollo     a half-time kick under the rumble, the chords coming in
//   bars 9–12   Shuttle    four on the floor, snares from bar 11, a riser over bar 12 cut a sixteenth before the drop
//   bars 13–18  SpaceX     the drop: supersaw chords and bass pumping against the kick, an arpeggio with a delay
//   bars 19–20  end        the beat stops; the last chord and the drone ring out
//
//   pnpm --filter @uberscene/example-liftoff music     writes media/song.wav, then adds it with its grid
//
// The sounds are band-limited saws (polyBLEP), resonant filters, a sidechain duck from the kick and a small stereo
// reverb, mastered through a soft clipper to about -14 LUFS.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { addAsset } from "@uberscene/render";

const here = join(import.meta.dirname, "..");
const media = join(here, "media");
mkdirSync(media, { recursive: true });
const file = join(media, "song.wav");

const RATE = 48_000;
const BPM = 120;
const BEAT = 60 / BPM;
const BARS = 20;
/** The last chord rings this long after the final bar. */
const TAIL = 3;
/** The beat the engines light on. */
const IGNITION = 16;
/** The master's drive into the clipper, set so the export measures about -14 LUFS. */
const DRIVE = 1.6;

const T = (beat: number): number => beat * BEAT;
const midi = (n: number): number => 440 * 2 ** ((n - 69) / 12);

/** D minor, one chord a bar: Dm, B♭, F, C — the notes as MIDI numbers, and the root for the bass. */
const CHORDS: readonly { notes: readonly number[]; root: number }[] = [
  { notes: [62, 65, 69, 74], root: 38 },
  { notes: [58, 62, 65, 70], root: 34 },
  { notes: [60, 65, 69, 72], root: 41 },
  { notes: [60, 64, 67, 72], root: 36 },
];

if (!existsSync(file)) {
  const length = BARS * 4 * BEAT + TAIL;
  const n = Math.round(length * RATE);
  // Two buses: the drums, and everything else, which dips under the kick.
  const L = new Float32Array(n),
    R = new Float32Array(n),
    DL = new Float32Array(n),
    DR = new Float32Array(n);
  /** What goes to the reverb, mono. */
  const send = new Float32Array(n);
  /** The kick's level over time, for the duck. */
  const duckBus = new Float32Array(n);

  let seed = 11;
  const white = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };

  /** Adds a voice from `at` seconds for `len` seconds; `voice(x)` returns [left, right] or a mono value. */
  const add = (
    at: number,
    len: number,
    voice: (x: number) => number | [number, number],
    wet = 0,
    pan = 0,
    drum = false,
  ): void => {
    const [bl, br] = drum ? [DL, DR] : [L, R];
    const from = Math.round(at * RATE);
    const gl = Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2,
      gr = Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    for (let i = 0; i < len * RATE && from + i < n; i++) {
      if (from + i < 0) continue;
      const v = voice(i / RATE);
      const [l, r] = typeof v === "number" ? [v * gl, v * gr] : v;
      bl[from + i] = (bl[from + i] as number) + l;
      br[from + i] = (br[from + i] as number) + r;
      if (wet) send[from + i] = (send[from + i] as number) + wet * (l + r) * 0.5;
    }
  };

  /** A band-limited saw: its phase and the polyBLEP correction at the wrap. */
  const saw = (): ((f: number) => number) => {
    let p = (white() + 1) / 2;
    return (f) => {
      const dt = f / RATE;
      p += dt;
      if (p >= 1) p -= 1;
      let v = 2 * p - 1;
      if (p < dt) {
        const t = p / dt;
        v -= t + t - t * t - 1;
      } else if (p > 1 - dt) {
        const t = (p - 1) / dt;
        v -= t * t + t + t + 1;
      }
      return v;
    };
  };
  /** A resonant low-pass (state-variable): cutoff in Hz, resonance 0–1. */
  const lowpass = (): ((x: number, cutoff: number, res?: number) => number) => {
    let low = 0,
      band = 0;
    return (x, cutoff, res = 0.2) => {
      const f = 2 * Math.sin((Math.PI * Math.min(cutoff, RATE / 6)) / RATE);
      const q = 1 - res * 0.9;
      for (let k = 0; k < 2; k++) {
        low += f * band;
        const high = x - low - q * band;
        band += f * high;
      }
      return low;
    };
  };
  const bandpass = (): ((x: number, centre: number, q?: number) => number) => {
    let low = 0,
      band = 0;
    return (x, centre, q = 0.5) => {
      const f = 2 * Math.sin((Math.PI * Math.min(centre, RATE / 6)) / RATE);
      low += f * band;
      const high = x - low - q * band;
      band += f * high;
      return band;
    };
  };
  const highpass = (): ((x: number, cutoff: number) => number) => {
    let low = 0,
      band = 0;
    return (x, cutoff) => {
      const f = 2 * Math.sin((Math.PI * Math.min(cutoff, RATE / 6)) / RATE);
      low += f * band;
      const high = x - low - 0.7 * band;
      band += f * high;
      return high;
    };
  };

  // ── Drums ──
  const kick = (beat: number, gain = 1): void => {
    let ph = 0;
    add(
      T(beat),
      0.5,
      (x) => {
        const f = 45 + 110 * Math.exp(-x / 0.03);
        ph += (2 * Math.PI * f) / RATE;
        const body = Math.sin(ph) * Math.exp(-x / 0.28);
        const click = x < 0.004 ? white() * (1 - x / 0.004) * 0.5 : 0;
        return gain * Math.tanh(1.8 * (body + click)) * 0.9;
      },
      0,
      0,
      true,
    );
    // The duck: the pads and bass dip under each kick and come back over a beat.
    const from = Math.round(T(beat) * RATE);
    for (let i = 0; i < BEAT * RATE && from + i < n; i++)
      duckBus[from + i] = Math.max(duckBus[from + i] as number, gain * Math.exp(-i / RATE / 0.12));
  };
  const snare = (beat: number, gain = 1): void => {
    const bp = bandpass(),
      hp = highpass();
    add(
      T(beat),
      0.4,
      (x) => {
        const noise = bp(white(), 1800, 0.9) * 1.4 + hp(white(), 6000) * 0.5;
        const body = Math.sin(2 * Math.PI * (180 + 60 * Math.exp(-x / 0.01)) * x) * Math.exp(-x / 0.05);
        return gain * (0.55 * noise * Math.exp(-x / 0.09) + 0.5 * body);
      },
      0.35,
      0,
      true,
    );
  };
  const hat = (beat: number, gain: number, open = false): void => {
    const hp = highpass();
    add(
      T(beat),
      open ? 0.25 : 0.06,
      (x) => gain * hp(white(), 8000) * Math.exp(-x / (open ? 0.08 : 0.015)),
      0.05,
      0.25,
      true,
    );
  };
  const tick = (beat: number, gain: number): void => {
    const bp = bandpass();
    add(T(beat), 0.03, (x) => gain * bp(white(), 4200, 0.25) * Math.exp(-x / 0.004), 0.1, -0.3, true);
  };
  /** A mission-control beep on a count. */
  const beep = (beat: number, high = false): void =>
    add(
      T(beat),
      0.16,
      (x) =>
        0.12 *
        Math.sin(2 * Math.PI * (high ? 1760 : 1046.5) * x) *
        Math.min(1, x / 0.003) *
        (x < 0.12 ? 1 : Math.max(0, 1 - (x - 0.12) / 0.04)),
      0.4,
      0.2,
    );

  // ── The drone, under the countdown and the end: two detuned saws on D, the filter opening. ──
  for (const [from, to, open] of [
    [0, IGNITION + 0.5, [180, 1400]],
    [72, BARS * 4 + TAIL / BEAT, [900, 200]],
  ] as const) {
    const len = T(to - from);
    for (const [f, pan] of [
      [midi(38), -0.4],
      [midi(38) * 1.006, 0.4],
      [midi(50), 0],
    ] as const) {
      const osc = saw(),
        lp = lowpass();
      add(
        T(from),
        len,
        (x) => {
          const k = x / len;
          const cutoff = open[0] * (open[1] / open[0]) ** k;
          const env = Math.min(1, x / 1.5) * Math.min(1, (len - x) / (from === 0 ? 0.05 : 2.5));
          return 0.11 * env * lp(osc(f), cutoff, 0.35);
        },
        0.25,
        pan,
      );
    }
  }

  // ── The countdown: a tick on every beat, the beeps from ten to one, a swell into ignition. ──
  for (let b = 0; b < IGNITION; b++) tick(b, b % 4 === 0 ? 0.5 : 0.32);
  for (let b = 6; b < IGNITION; b++) beep(b, b === IGNITION - 1);
  {
    const len = T(2),
      lp = lowpass();
    add(
      T(IGNITION - 2),
      len,
      (x) => {
        const k = x / len;
        return 0.5 * k ** 3 * lp(white(), 300 + 6000 * k ** 2, 0.5);
      },
      0.3,
    );
  }

  // ── Ignition: a sub drop and a noise burst that falls into the engines' rumble. ──
  {
    let ph = 0;
    add(T(IGNITION), 2.5, (x) => {
      const f = 30 + 60 * Math.exp(-x / 0.12);
      ph += (2 * Math.PI * f) / RATE;
      return Math.tanh(2.2 * Math.sin(ph) * Math.exp(-x / 0.9)) * 0.85;
    });
    const lpL = lowpass(),
      lpR = lowpass();
    const len = T(16) + 0.5;
    add(
      T(IGNITION),
      len,
      (x) => {
        const cutoff = 120 + 9000 * Math.exp(-x / 0.35);
        const env = (0.25 + 0.75 * Math.exp(-x / 1.2)) * Math.min(1, (len - x) / 2) * Math.min(1, x / 0.002);
        return [0.7 * env * lpL(white(), cutoff, 0.1), 0.7 * env * lpR(white(), cutoff, 0.1)];
      },
      0.2,
    );
  }

  // ── Chords: a supersaw of five detuned saws a note, the filter shaped per bar. ──
  const chord = (bar: number, gain: number, cutoff: number, len = 4 * BEAT + 0.05, release = 0.08): void => {
    const c = CHORDS[bar % 4] as (typeof CHORDS)[number];
    for (const note of c.notes)
      for (const [detune, pan] of [
        [-0.12, -0.8],
        [-0.05, -0.35],
        [0, 0],
        [0.05, 0.35],
        [0.12, 0.8],
      ] as const) {
        const osc = saw(),
          lp = lowpass(),
          f = midi(note + detune);
        add(
          T(bar * 4),
          len,
          (x) => {
            const env = Math.min(1, x / 0.02) * Math.min(1, (len - x) / release);
            return (gain / 5) * env * lp(osc(f), cutoff * (1 + 0.6 * Math.exp(-x / 0.25)), 0.25);
          },
          0.3,
          pan,
        );
      }
  };
  const bass = (beat: number, note: number, len: number, gain = 0.5): void => {
    const a = saw(),
      b = saw(),
      lp = lowpass();
    add(T(beat), len, (x) => {
      const env = Math.min(1, x / 0.003) * Math.min(1, (len - x) / 0.02);
      const v = lp(a(midi(note)) + 0.6 * b(midi(note) * 0.5), 220 + 900 * Math.exp(-x / 0.06), 0.3);
      return gain * env * Math.tanh(1.5 * v);
    });
  };

  // Apollo (bars 5–8): a half-time kick, the chords low and dark under the rumble.
  for (let bar = 4; bar < 8; bar++) {
    chord(bar, 0.18, 500 + (bar - 4) * 180);
    kick(bar * 4, 1);
    kick(bar * 4 + 2.5, 0.6);
    snare(bar * 4 + 2, bar >= 6 ? 0.7 : 0.45);
    for (let b = 0; b < 4; b++) hat(bar * 4 + b + 0.5, 0.12);
  }
  // Shuttle (bars 9–12): four on the floor, snares from bar 11, the filter rising, a riser over bar 12.
  for (let bar = 8; bar < 12; bar++) {
    chord(bar, 0.2, 900 + (bar - 8) * 500);
    for (let b = 0; b < 4; b++) {
      const beat = bar * 4 + b;
      if (!(bar === 11 && b === 3)) kick(beat, 1);
      if (bar >= 10 && b % 2 === 1) snare(beat, 0.85);
      hat(beat + 0.5, 0.16);
      bass(beat, (CHORDS[bar % 4] as (typeof CHORDS)[number]).root, BEAT * 0.45, 0.35);
    }
  }
  // The snare roll and riser into the drop, cut a sixteenth before it so the drop lands in a gap.
  for (let s = 0; s < 8; s++) snare(46 + s * 0.25, 0.25 + s * 0.08);
  {
    const len = T(4) - T(0.25),
      bp = bandpass(),
      osc = saw(),
      lp = lowpass();
    add(
      T(44),
      len,
      (x) => {
        const k = x / len;
        return (
          0.35 * k * k * (bp(white(), 400 + 7000 * k * k, 0.4) * 1.5 + 0.3 * lp(osc(110 * 2 ** (2 * k)), 3000, 0.2))
        );
      },
      0.4,
    );
  }
  // SpaceX (bars 13–18): the drop.
  for (let bar = 12; bar < 18; bar++) {
    const c = CHORDS[bar % 4] as (typeof CHORDS)[number];
    chord(bar, 0.26, 2600);
    for (let b = 0; b < 4; b++) {
      const beat = bar * 4 + b;
      kick(beat, 1);
      if (b % 2 === 1) snare(beat, 1);
      hat(beat + 0.5, 0.2, b === 3);
      hat(beat + 0.25, 0.07);
      hat(beat + 0.75, 0.07);
      bass(beat + 0.5, c.root + 12, BEAT * 0.45, 0.45);
      bass(beat, c.root, BEAT * 0.3, 0.35);
    }
    // The arpeggio: the chord's notes an octave up, a sixteenth each, plucked.
    for (let s = 0; s < 16; s++) {
      const note = (c.notes[[0, 1, 2, 3, 2, 1, 2, 3][s % 8] as number] as number) + 12;
      const osc = saw(),
        lp = lowpass();
      add(
        T(bar * 4 + s * 0.25),
        0.22,
        (x) => 0.07 * lp(osc(midi(note)), 600 + 4000 * Math.exp(-x / 0.05), 0.4) * Math.exp(-x / 0.1),
        0.45,
        s % 2 ? 0.5 : -0.5,
      );
    }
  }
  // The end (bars 19–20): one crash of noise on the downbeat, and the first chord rings out.
  {
    const hp = highpass();
    add(T(72), 2.5, (x) => 0.35 * hp(white(), 5000) * Math.exp(-x / 0.7), 0.5);
    kick(72, 1);
    chord(18, 0.22, 1600, T(8) + TAIL, TAIL);
  }

  // ── The duck: everything but the drums dips under the kick, deeper in the drop, and the drums go back on top. ──
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const g = 1 - (t >= T(48) && t < T(72) ? 0.45 : 0.25) * (duckBus[i] as number);
    L[i] = (L[i] as number) * g + (DL[i] as number);
    R[i] = (R[i] as number) * g + (DR[i] as number);
  }

  // ── Reverb: four combs and two all-passes a side, of slightly different lengths, on the send. ──
  const verb = (offset: number): Float32Array => {
    const out = new Float32Array(n);
    const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(d + offset), i: 0, lp: 0 }));
    const alls = [556, 441].map((d) => ({ buf: new Float32Array(d + offset), i: 0 }));
    for (let k = 0; k < n; k++) {
      const x = (send[k] as number) * 0.3;
      let y = 0;
      for (const c of combs) {
        const v = c.buf[c.i] as number;
        c.lp = v * 0.7 + c.lp * 0.3;
        c.buf[c.i] = x + c.lp * 0.84;
        c.i = (c.i + 1) % c.buf.length;
        y += v;
      }
      for (const a of alls) {
        const v = a.buf[a.i] as number;
        a.buf[a.i] = y + v * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        y = v - y * 0.5;
      }
      out[k] = y;
    }
    return out;
  };
  const vl = verb(0),
    vr = verb(23);
  for (let i = 0; i < n; i++) {
    L[i] = (L[i] as number) + (vl[i] as number);
    R[i] = (R[i] as number) + (vr[i] as number);
  }

  // ── Master: a gentle high-pass under 25 Hz, then a soft clip to a peak of -2.8 dBFS. ──
  let max = 0;
  for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(L[i] as number), Math.abs(R[i] as number));
  const ceiling = 10 ** (-2.8 / 20);
  const hpl = highpass(),
    hpr = highpass();
  const pcm = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const l = Math.tanh((hpl(L[i] as number, 25) / max) * DRIVE) * ceiling;
    const r = Math.tanh((hpr(R[i] as number, 25) / max) * DRIVE) * ceiling;
    pcm.writeInt16LE(Math.round(l * 32767), i * 4);
    pcm.writeInt16LE(Math.round(r * 32767), i * 4 + 2);
  }
  writeFileSync(file, Buffer.concat([waveHeader(pcm.length), pcm]));
  process.stdout.write(`song.wav: ${BARS} bars at ${BPM} BPM, ${length.toFixed(1)} s, stereo\n`);
}

/** The 44-byte header of a 16-bit stereo WAV file at RATE. */
function waveHeader(bytes: number): Buffer {
  const head = Buffer.alloc(44);
  head.write("RIFF", 0, "ascii");
  head.writeUInt32LE(36 + bytes, 4);
  head.write("WAVEfmt ", 8, "ascii");
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 4, 28);
  head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36, "ascii");
  head.writeUInt32LE(bytes, 40);
  return head;
}

// Added with its grid: every beat is where the music put it.
const added = await addAsset(file, { id: "song", manifest: join(here, "uberscene.json"), bpm: BPM, firstBeat: 0 });
process.stdout.write(`song: ${added.entry.beats?.length} beats at ${added.entry.tempo} BPM in ${added.manifest}\n`);
