import { describe, expect, it } from "vitest";

import { generatedValue, generatorSeed, isGenerator, smoothNoise } from "../src/schema";

const flat = (v: number) => () => v;

describe("smooth noise", () => {
  it("stays between -1 and 1, and is the same for the same seed and place", () => {
    for (let i = 0; i < 2000; i++) {
      const v = smoothNoise(7, i * 0.137);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(smoothNoise(7, 3.21)).toBe(smoothNoise(7, 3.21));
  });

  it("differs from one seed to another", () => {
    const a = Array.from({ length: 20 }, (_, i) => smoothNoise(1, i * 0.4));
    const b = Array.from({ length: 20 }, (_, i) => smoothNoise(2, i * 0.4));
    expect(a).not.toEqual(b);
  });

  it("moves a little from one frame to the next", () => {
    // At one wobble a second and 30 frames a second, no frame jumps by more than a fifth of the range.
    for (let f = 0; f < 600; f++)
      expect(Math.abs(smoothNoise(3, (f + 1) / 30) - smoothNoise(3, f / 30))).toBeLessThan(0.2);
  });

  it("wanders both ways, about nothing on average", () => {
    const values = Array.from({ length: 4000 }, (_, i) => smoothNoise(11, i * 0.05));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(Math.abs(mean)).toBeLessThan(0.1);
    expect(Math.max(...values)).toBeGreaterThan(0.4);
    expect(Math.min(...values)).toBeLessThan(-0.4);
  });
});

describe("a generated value", () => {
  it("a wiggle adds at most its amount to the base, and follows the base's keys", () => {
    const g = { type: "wiggle", amount: 2, frequency: 1.5, seed: 5 } as const;
    for (let t = 0; t < 20; t += 0.033) {
      const v = generatedValue(g, t, flat(10));
      expect(v).toBeGreaterThanOrEqual(8);
      expect(v).toBeLessThanOrEqual(12);
    }
    const ramp = (t: number) => t * 100;
    expect(generatedValue(g, 3, ramp) - 300).toBeCloseTo(generatedValue(g, 3, flat(0)), 10);
  });

  it("a wiggle with a higher frequency changes faster", () => {
    const travel = (frequency: number) => {
      let sum = 0;
      for (let f = 0; f < 300; f++)
        sum += Math.abs(
          generatedValue({ type: "wiggle", amount: 1, frequency, seed: 9 }, (f + 1) / 30, flat(0)) -
            generatedValue({ type: "wiggle", amount: 1, frequency, seed: 9 }, f / 30, flat(0)),
        );
      return sum;
    };
    expect(travel(3)).toBeGreaterThan(travel(0.5) * 2);
  });

  it("a drift adds its speed each second", () => {
    const g = { type: "drift", speed: 0.01 } as const;
    expect(generatedValue(g, 0, flat(1))).toBe(1);
    expect(generatedValue(g, 5, flat(1))).toBeCloseTo(1.05, 10);
  });

  it("a loop plays its stretch of the base again, or back and forth", () => {
    // The base rises from 0 at 1 s to 10 at 3 s.
    const base = (t: number) => Math.max(0, Math.min(10, (t - 1) * 5));
    const repeat = { type: "loop", span: [1, 3] } as const;
    expect(generatedValue(repeat, 0.5, base)).toBe(0);
    expect(generatedValue(repeat, 2, base)).toBe(5);
    expect(generatedValue(repeat, 3.5, base)).toBe(2.5);
    expect(generatedValue(repeat, 5.5, base)).toBe(2.5);
    const pingpong = { type: "loop", span: [1, 3], mode: "pingpong" } as const;
    expect(generatedValue(pingpong, 2.5, base)).toBe(7.5);
    expect(generatedValue(pingpong, 3.5, base)).toBe(7.5);
    expect(generatedValue(pingpong, 4.5, base)).toBe(2.5);
    expect(generatedValue(pingpong, 5.5, base)).toBe(2.5);
  });
});

describe("telling a generator from a value", () => {
  it("is an object whose type names one", () => {
    expect(isGenerator({ type: "wiggle", amount: 1 })).toBe(true);
    expect(isGenerator({ type: "blur", radius: 3 })).toBe(false);
    expect(isGenerator([{ at: 0, value: 1 }])).toBe(false);
    expect(isGenerator(3)).toBe(false);
    expect(isGenerator({ x: 1, y: 2 })).toBe(false);
  });

  it("seeds from the element and the prop, so no two wobble alike", () => {
    expect(generatorSeed("card", "transform.rotation")).toBe(generatorSeed("card", "transform.rotation"));
    expect(generatorSeed("card", "transform.rotation")).not.toBe(generatorSeed("card2", "transform.rotation"));
    expect(generatorSeed("card", "transform.rotation")).not.toBe(generatorSeed("card", "box.x"));
  });
});
