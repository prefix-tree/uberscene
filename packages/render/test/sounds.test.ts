// The sound kit: every sound the same on every run, peaking at -3 dBFS, as long as asked; another seed another take;
// a bed never falls silent part way.
import { describe, expect, it } from "vitest";

import { makeSound, SOUND_KIT } from "../src/sounds/kit";
import { PEAK, RATE, wav } from "../src/sounds/synth";

const peak = (s: Float32Array) => s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rms = (s: Float32Array) => Math.sqrt(s.reduce((sum, v) => sum + v * v, 0) / s.length);

describe.each(Object.keys(SOUND_KIT))("%s", (name) => {
  const spec = SOUND_KIT[name] as (typeof SOUND_KIT)[string];
  const made = makeSound(name);

  it("is the same on every run, as long as its spec says, and peaks at -3 dBFS", () => {
    expect(wav(makeSound(name)).equals(wav(made))).toBe(true);
    expect(made.length).toBe(Math.round(spec.length * RATE));
    expect(peak(made)).toBeCloseTo(PEAK, 5);
    expect(spec.moment).toBeGreaterThanOrEqual(0);
    expect(spec.moment).toBeLessThanOrEqual(1);
  });

  it("takes another length", () => {
    expect(makeSound(name, { length: spec.length * 2 }).length).toBe(Math.round(spec.length * 2 * RATE));
  });

  if (spec.bed)
    it("never falls silent part way: every second holds sound", () => {
      const all = rms(made);
      for (let s = 0; s + 1 <= spec.length; s++) {
        const second = made.subarray(s * RATE, (s + 1) * RATE);
        expect(rms(second)).toBeGreaterThan(all * 0.25);
      }
    });
});

describe("takes", () => {
  it("another seed is another take of a sound with noise in it", () => {
    for (const name of ["whoosh", "hit", "wind", "crackle", "rain"])
      expect(wav(makeSound(name, { seed: 99 })).equals(wav(makeSound(name)))).toBe(false);
  });

  it("names the kit when asked for a sound it lacks, and refuses a length out of range", () => {
    expect(() => makeSound("kazoo")).toThrow(/there are tick, click/);
    expect(() => makeSound("hit", { length: 0 })).toThrow(/between 0 and 120/);
  });
});

describe("wav", () => {
  it("writes mono, or stereo from two channels", () => {
    const left = new Float32Array([0.5, -0.5]);
    expect(wav(left).readUInt16LE(22)).toBe(1);
    const stereo = wav(left, new Float32Array([0.25, -0.25]));
    expect(stereo.readUInt16LE(22)).toBe(2);
    expect(stereo.readInt16LE(46)).toBe(Math.round(0.25 * 32767));
  });
});
