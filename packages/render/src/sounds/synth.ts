// The parts the sound kit is made of: seeded noise, filters, and a render that normalizes to one peak. Everything is
// computed sample by sample from a seed, so the same sound is the same bytes on every machine.

export const RATE = 48_000;
/** Every sound peaks here, -3 dBFS, so sounds layered on each other and on a voice leave headroom. */
export const PEAK = 10 ** (-3 / 20);

export type Noise = { white(): number };

/** White noise from a seed (mulberry32), the same on every run. */
export function noise(seed: number): Noise {
  let a = seed >>> 0;
  return {
    white(): number {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
    },
  };
}

/** Samples of `len` seconds from `at(t)`, normalized to the peak, with 5 ms faded out at the end. */
export function render(len: number, at: (t: number, n: Noise) => number, seed = 1): Float32Array {
  const n = noise(seed);
  const out = new Float32Array(Math.round(len * RATE));
  for (let i = 0; i < out.length; i++) out[i] = at(i / RATE, n);
  const fade = Math.round(0.005 * RATE);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] = (out[out.length - 1 - i] as number) * (i / fade);
  let max = 0;
  for (const s of out) max = Math.max(max, Math.abs(s));
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] = ((out[i] as number) / max) * PEAK;
  return out;
}

/** A biquad band-pass (RBJ cookbook, constant peak gain) at a fixed centre. */
export function bandPass(centre: number, q: number): (x: number) => number {
  const band = movingBandPass();
  return (x) => band(x, centre, q);
}

/** A biquad band-pass whose centre may change on every sample. */
export function movingBandPass(): (x: number, centre: number, q: number) => number {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  return (x, centre, q) => {
    const w = (2 * Math.PI * centre) / RATE;
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    const y = (alpha * x - alpha * x2 + 2 * Math.cos(w) * y1 - (1 - alpha) * y2) / a0;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

/** A one-pole low-pass. */
export function lowPass(cutoff: number): (x: number) => number {
  const k = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
  let y = 0;
  return (x) => {
    y += k * (x - y);
    return y;
  };
}

/** A one-pole high-pass: what the low-pass takes away. */
export function highPass(cutoff: number): (x: number) => number {
  const low = lowPass(cutoff);
  return (x) => x - low(x);
}

/** Brown noise: white noise summed and held near zero, deep and soft. */
export function brown(n: Noise): () => number {
  let y = 0;
  return () => {
    y = (y + 0.02 * n.white()) * 0.998;
    return y * 3.5;
  };
}

/**
 * A slow wander between -1 and 1: a few sines at unrelated rates with seeded phases. For a wind that gusts, a stream
 * that bubbles, a rumble that swells, without anything repeating where the ear finds it.
 */
export function wander(seed: number, rate: number): (t: number) => number {
  const n = noise(seed);
  const parts = [1, 1.618, 2.414, 3.303].map((k) => ({ f: rate * k, phase: n.white() * Math.PI, gain: 1 / k }));
  const total = parts.reduce((s, p) => s + p.gain, 0);
  return (t) => parts.reduce((s, p) => s + p.gain * Math.sin(2 * Math.PI * p.f * t + p.phase), 0) / total;
}

/** A 16-bit PCM WAV file of the samples: mono, or stereo when given a second channel. */
export function wav(left: Float32Array, right?: Float32Array): Buffer {
  const channels = right ? 2 : 1;
  const data = Buffer.alloc(left.length * 2 * channels);
  for (let i = 0; i < left.length; i++)
    for (let ch = 0; ch < channels; ch++) {
      const s = Math.max(-1, Math.min(1, ((ch === 0 ? left : right) as Float32Array)[i] as number));
      data.writeInt16LE(Math.round(s * 32767), (i * channels + ch) * 2);
    }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0, "ascii");
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVE", 8, "ascii");
  head.write("fmt ", 12, "ascii");
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(channels, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 2 * channels, 28);
  head.writeUInt16LE(2 * channels, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36, "ascii");
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}
