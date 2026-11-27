// Ticks as the engine's time (decision 0044). The vectors come from craft-time, FilmCraft's Rust implementation, so
// the two agree on every rounding; the rest checks what the vectors can't: sums, the brand's guard, write-back.
import { describe, expect, it } from "vitest";

import {
  addTicks,
  clampTicks,
  frameOfTicks,
  frameStartTicks,
  MAX_SECONDS,
  maxTicks,
  minTicks,
  mulRatio,
  type Rate,
  rangeContains,
  rangeEnd,
  rangeFromBounds,
  rangeIntersect,
  rangesOverlap,
  scaleTicks,
  secondsToTicksExact,
  snapToFrame,
  snapToNearestFrame,
  subTicks,
  TICKS_PER_SECOND,
  type Ticks,
  ticks,
  ticksAsSeconds,
  ticksFromRational,
  ticksFromUnits,
  ticksToFileSeconds,
  ticksToRationalFloor,
  ticksToRationalRound,
  ticksToUnitsFloor,
  timeRange,
} from "@uberscene/kit/schema";

import vectors from "./vectors/ticks.json" with { type: "json" };

interface RangeJson {
  readonly start: number;
  readonly duration: number;
}
const range = (r: RangeJson) => timeRange(ticks(r.start), ticks(r.duration));

describe("craft-time vectors", () => {
  it("uses the same tick count", () => {
    expect(vectors.ticksPerSecond).toBe(TICKS_PER_SECOND);
  });

  it("turns seconds into the same ticks", () => {
    for (const c of vectors.seconds) expect(secondsToTicksExact(c.seconds), String(c.seconds)).toBe(c.ticks);
  });

  it("finds the same frames, frame starts and snaps", () => {
    for (const c of vectors.frames) {
      const rate = c.rate as Rate;
      const label = `${rate.num}/${rate.den} ${JSON.stringify(c)}`;
      if ("frameStart" in c && c.frameStart !== undefined) {
        expect(frameStartTicks(c.frameStart, rate), label).toBe(c.ticks);
        continue;
      }
      const t = ticks(c.ticks);
      expect(frameOfTicks(t, rate), label).toBe(c.frame);
      expect(snapToFrame(t, rate), label).toBe(c.snap);
      expect(snapToNearestFrame(t, rate), label).toBe(c.snapNearest);
    }
  });

  it("reads container timestamps the same way", () => {
    for (const c of vectors.fromRational)
      expect(ticksFromRational(c.pts, c.num, c.den), JSON.stringify(c)).toBe(c.ticks);
  });

  it("writes container timestamps the same way", () => {
    for (const c of vectors.toRational) {
      const t = ticks(c.ticks);
      expect(ticksToRationalFloor(t, c.num, c.den), JSON.stringify(c)).toBe(c.floor);
      expect(ticksToRationalRound(t, c.num, c.den), JSON.stringify(c)).toBe(c.round);
    }
  });

  it("scales by a ratio the same way, past 2^53 in the product", () => {
    for (const c of vectors.mulRatio) expect(mulRatio(ticks(c.ticks), c.num, c.den), JSON.stringify(c)).toBe(c.result);
  });

  it("counts samples the same way", () => {
    for (const c of vectors.units) {
      if ("units" in c && c.units !== undefined) expect(ticksFromUnits(c.units, c.perSecond)).toBe(c.ticks);
      else expect(ticksToUnitsFloor(ticks(c.ticks as number), c.perSecond), JSON.stringify(c)).toBe(c.floor);
    }
  });

  it("treats ranges as half-open, the same way", () => {
    for (const c of vectors.ranges) {
      const a = range(c.a);
      const b = range(c.b);
      expect(rangesOverlap(a, b), JSON.stringify(c)).toBe(c.overlaps);
      expect(rangeContains(a, b.start), JSON.stringify(c)).toBe(c.containsBStart);
      expect(rangeEnd(a)).toBe(c.end);
      expect(rangeIntersect(a, b)).toEqual(c.intersect);
    }
  });
});

describe("sums", () => {
  it("adds decimal seconds exactly", () => {
    const sum = addTicks(secondsToTicksExact(0.1), secondsToTicksExact(0.2));
    expect(sum).toBe(secondsToTicksExact(0.3));
    expect(subTicks(secondsToTicksExact(0.4), sum)).toBe(secondsToTicksExact(0.1));
  });

  it("puts every cut of a long sequence on its frame start, at every rate", () => {
    // Durations written to the ms, as a file says them, summed into a sequence of about two hours.
    const durations: Ticks[] = [];
    let seed = 7;
    for (let i = 0; i < 2000; i++) {
      seed = (seed * 48271) % 2147483647;
      durations.push(secondsToTicksExact((1000 + (seed % 5000)) / 1000));
    }
    let start = secondsToTicksExact(0);
    let seconds = 0;
    for (const d of durations) {
      start = addTicks(start, d);
      seconds += ticksAsSeconds(d);
    }
    // The float sum has drifted; the tick sum is the exact total of the ms values.
    const msTotal = durations.reduce((a, d) => a + Math.round(ticksAsSeconds(d) * 1000), 0);
    expect(start).toBe(msTotal * (TICKS_PER_SECOND / 1000));
    expect(seconds * TICKS_PER_SECOND).not.toBe(start);
  });

  it("works up to the 9.85 hour limit", () => {
    const end = secondsToTicksExact(MAX_SECONDS);
    expect(Number.isSafeInteger(end)).toBe(true);
    const ntsc: Rate = { num: 30000, den: 1001 };
    const frame = frameOfTicks(end, ntsc);
    expect(frameStartTicks(frame, ntsc)).toBeLessThanOrEqual(end);
    expect(frameStartTicks(frame + 1, ntsc)).toBeGreaterThan(end);
  });
});

describe("the brand's guard", () => {
  it("refuses a number that isn't a whole count of ticks", () => {
    expect(() => ticks(2.5)).toThrow(RangeError);
    expect(() => ticks(Number.NaN)).toThrow(RangeError);
    expect(() => ticks(2 ** 53)).toThrow(RangeError);
    expect(() => addTicks(ticks(Number.MAX_SAFE_INTEGER), ticks(1))).toThrow(RangeError);
  });

  it("keeps zero positive", () => {
    expect(Object.is(ticks(-0), 0)).toBe(true);
  });
});

describe("helpers", () => {
  it("orders and clamps", () => {
    const [a, b, c] = [ticks(1), ticks(5), ticks(9)];
    expect(minTicks(a, b)).toBe(a);
    expect(maxTicks(a, b)).toBe(b);
    expect(clampTicks(c, a, b)).toBe(b);
    expect(clampTicks(ticks(0), a, b)).toBe(a);
  });

  it("scales by a speed to the nearest tick", () => {
    expect(scaleTicks(secondsToTicksExact(2), 1.5)).toBe(secondsToTicksExact(3));
    expect(scaleTicks(ticks(3), 0.5)).toBe(2);
  });

  it("builds a range from its bounds", () => {
    const r = rangeFromBounds(secondsToTicksExact(1.1), secondsToTicksExact(1.3));
    expect(r.duration).toBe(secondsToTicksExact(0.2));
    expect(rangeContains(r, secondsToTicksExact(1.3))).toBe(false);
    expect(rangeContains(r, secondsToTicksExact(1.1))).toBe(true);
  });
});

describe("ticksToFileSeconds", () => {
  it("writes a time on the ms grid as its ms decimal", () => {
    expect(ticksToFileSeconds(addTicks(secondsToTicksExact(0.1), secondsToTicksExact(0.2)))).toBe(0.3);
    expect(ticksToFileSeconds(secondsToTicksExact(2.2))).toBe(2.2);
    expect(ticksToFileSeconds(ticks(0))).toBe(0);
    expect(ticksToFileSeconds(secondsToTicksExact(-1.25))).toBe(-1.25);
  });

  it("keeps a frame-exact time on its frame, not rounded to the ms", () => {
    const end = frameStartTicks(121, { num: 24, den: 1 });
    const written = ticksToFileSeconds(end);
    expect(written).not.toBe(5.042);
    expect(secondsToTicksExact(written)).toBe(end);
  });

  it("reads back to the same tick for every frame start of an NTSC hour", () => {
    const ntsc: Rate = { num: 30000, den: 1001 };
    for (let f = 0; f < 107_892; f += 37) {
      const t = frameStartTicks(f, ntsc);
      expect(secondsToTicksExact(ticksToFileSeconds(t))).toBe(t);
    }
  });
});
