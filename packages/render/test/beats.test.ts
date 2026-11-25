import { describe, expect, it } from "vitest";

import { beatGrid, detectBeats } from "../src/beats";

const SR = 44100;

/** Clicks at `bpm` from `first` seconds: a short decaying burst of noise on each beat, quiet noise between. */
function clicks(bpm: number, first: number, seconds: number, seed = 1): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296 - 0.5;
  };
  for (let i = 0; i < out.length; i++) out[i] = rnd() * 0.01;
  for (let t = first; t < seconds; t += 60 / bpm) {
    const at = Math.round(t * SR);
    for (let i = 0; i < 0.03 * SR && at + i < out.length; i++)
      out[at + i] = (out[at + i] as number) + rnd() * 1.6 * Math.exp(-i / (0.006 * SR));
  }
  return out;
}

describe("detectBeats", () => {
  it.each([
    [120, 0.25],
    [96, 0.5],
    [150, 0.1],
    [72, 0.4],
    [180, 0.2],
  ])("finds %d BPM and its beats from %d s", (bpm, first) => {
    const track = detectBeats(clicks(bpm, first, 12), SR);
    // A fast tempo may be heard at half speed, every other beat: still on the beat, as a listener might count it.
    const heard = bpm > 160 && track.tempo < bpm * 0.75 ? bpm / 2 : bpm;
    expect(track.tempo).toBeGreaterThan(heard * 0.98);
    expect(track.tempo).toBeLessThan(heard * 1.02);
    const period = 60 / bpm;
    // Every beat lands within 25 ms of a click.
    for (const b of track.beats) {
      const k = Math.round((b.start - first) / period);
      expect(Math.abs(b.start - (first + k * period))).toBeLessThan(0.025);
    }
    // And it misses almost none of them.
    expect(track.beats.length).toBeGreaterThanOrEqual(Math.floor((12 - first) / (60 / heard)) - 1);
    // Each beat ends where the next starts.
    for (let i = 0; i + 1 < track.beats.length; i++) expect(track.beats[i]?.end).toBe(track.beats[i + 1]?.start);
  });

  it("puts the beats on the kicks, not on a brighter hat between them, and none in the silence after", () => {
    // A low kick on each beat from 0.25 s at 120 BPM, a bright hat half a beat later, then a second of silence.
    const out = new Float32Array(SR * 9);
    let s = 3;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296 - 0.5;
    };
    for (let b = 0; b < 16; b++) {
      const kick = Math.round((0.25 + b * 0.5) * SR);
      for (let i = 0; i < 0.2 * SR; i++)
        out[kick + i] = (out[kick + i] as number) + Math.sin((2 * Math.PI * 60 * i) / SR) * Math.exp(-i / (0.06 * SR));
      const hat = Math.round((0.5 + b * 0.5) * SR);
      let prev = 0;
      for (let i = 0; i < 0.05 * SR; i++) {
        const n = rnd();
        out[hat + i] = (out[hat + i] as number) + 0.6 * (n - prev) * Math.exp(-i / (0.012 * SR));
        prev = n;
      }
    }
    const track = detectBeats(out, SR);
    expect(track.beats).toHaveLength(16);
    for (const [i, b] of track.beats.entries()) expect(Math.abs(b.start - (0.25 + i * 0.5))).toBeLessThan(0.03);
  });

  it("gives no beats for silence or a sound too short to have a tempo", () => {
    expect(detectBeats(new Float32Array(SR * 4), SR).beats).toEqual([]);
    expect(detectBeats(new Float32Array(2000), SR).beats).toEqual([]);
  });
});

describe("beatGrid", () => {
  it("spaces beats evenly from the first, up to the end", () => {
    const g = beatGrid(120, 0.3, 2.4);
    expect(g.tempo).toBe(120);
    expect(g.beats.map((b) => b.start)).toEqual([0.3, 0.8, 1.3, 1.8, 2.3]);
    expect(g.beats.at(-1)).toEqual({ i: 4, start: 2.3, end: 2.8 });
  });

  it("refuses a tempo or a first beat that cannot be", () => {
    expect(() => beatGrid(0, 0, 10)).toThrow(/positive/);
    expect(() => beatGrid(120, -1, 10)).toThrow(/0 s or later/);
  });
});
