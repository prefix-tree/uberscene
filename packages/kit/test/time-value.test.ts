// Time and TimeRange (decision 0045). The craft-time vectors pin every rounding to FilmCraft's Rust timeline; the
// properties check what vectors can't: that sums of decimal lengths stay exact, that text reads back to the same tick,
// that every frame of every rate is reachable, and that a Time can't be used as a number by mistake.
import { describe, expect, it } from "vitest";

import { MAX_SECONDS, parseRate, type Rate, TICKS_PER_SECOND, Time, TimeRange } from "@uberscene/kit/schema";

import vectors from "./vectors/ticks.json" with { type: "json" };

const T = Time.parse;
const RATES = ["23.976", "24", "25", "29.97", "30", "48", "50", "59.94", "60", "120", "12.5"].map((r) => parseRate(r));

/** A small seeded random, so a failing case can be run again. */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const next = random(44);
const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
/** A random decimal of seconds with up to `places` digits after the point, as text, within ±`max` s. */
const decimal = (places: number, max = 3600): string => {
  const scale = 10 ** places;
  const n = int(-max * scale, max * scale);
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  return places === 0 ? `${sign}${a}` : `${sign}${Math.floor(a / scale)}.${String(a % scale).padStart(places, "0")}`;
};
/** The reference: decimal text as the nearest tick, halves away from zero, in BigInt. */
const reference = (text: string): number => {
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  const num = BigInt(`${whole}${fraction}`) * BigInt(TICKS_PER_SECOND);
  const den = 10n ** BigInt(fraction.length);
  const q = (num * 2n + den) / (den * 2n);
  return Number(negative ? -q : q);
};

describe("making a Time", () => {
  it("reads decimal text exactly", () => {
    expect(T("0.4").ticks).toBe(101_606_400_000);
    expect(T("0.1").plus(T("0.2")).equals(T("0.3"))).toBe(true);
    expect(T("-1.25").ticks).toBe(-1.25 * TICKS_PER_SECOND);
    expect(T("2.5s").equals(T("2.5"))).toBe(true);
    expect(T("1e-3").equals(T("0.001"))).toBe(true);
    expect(T(".5").equals(T("0.5"))).toBe(true);
    expect(T("5.").equals(T("5"))).toBe(true);
    expect(T("  3  ").equals(T("3"))).toBe(true);
    expect(T("1.5E2").equals(T("150"))).toBe(true);
  });

  it("reads an exact fraction: one frame at 29.97 is 1001/30000 s", () => {
    expect(T("1001/30000").equals(Time.frames(1, parseRate("29.97")))).toBe(true);
    expect(T("1/3").ticks).toBe(TICKS_PER_SECOND / 3);
    expect(T("-1/2").equals(T("-0.5"))).toBe(true);
  });

  it("reads a number of seconds as the decimal it prints as, so float noise is gone", () => {
    expect(Time.seconds(0.1 + 0.2).equals(Time.seconds(0.3))).toBe(true);
    expect(Time.seconds(0.4 - 0.30000000000000004).equals(T("0.1"))).toBe(true);
    expect(T(0.2).equals(T("0.2"))).toBe(true);
    for (let i = 0; i < 2000; i++) {
      const text = decimal(int(0, 9));
      expect(Time.seconds(Number(text)).ticks, text).toBe(reference(text));
    }
  });

  it("refuses what isn't a time, naming it", () => {
    for (const bad of ["", "abc", "1..2", "--1", "NaN", "Infinity", "1/0", "1/", "/2", "0x10", "1 2", "e5", "."])
      expect(() => T(bad), bad).toThrow(RangeError);
    expect(() => T("abc")).toThrow(/"abc"/);
    expect(() => Time.seconds(Number.NaN)).toThrow(RangeError);
    expect(() => Time.seconds(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => Time.ofTicks(0.5)).toThrow(RangeError);
  });

  it("refuses a time past 2^53 ticks (about 9.85 hours) instead of losing ticks", () => {
    expect(Time.seconds(MAX_SECONDS).toSeconds()).toBe(MAX_SECONDS);
    expect(() => Time.seconds(MAX_SECONDS + 1)).toThrow(RangeError);
    expect(() => T(`${MAX_SECONDS + 1}`)).toThrow(RangeError);
    const big = Time.seconds(MAX_SECONDS);
    expect(() => big.plus(big)).toThrow(RangeError);
    expect(() => big.times(2)).toThrow(RangeError);
  });

  it("has one zero, and -0 is zero", () => {
    expect(Time.ofTicks(-0)).toBe(Time.ZERO);
    expect(T("-0").equals(Time.ZERO)).toBe(true);
    expect(Object.is(T("-0").ticks, 0)).toBe(true);
    expect(T("1").minus(T("1"))).toBe(Time.ZERO);
  });

  it("can't be changed: every field is read-only, and every operation returns a new value", () => {
    const t = T("1");
    // @ts-expect-error: ticks is read-only. (Not frozen at run time: freezing doubles what a Time costs to make.)
    t.ticks = 5;
    const range = TimeRange.of(T("1"), T("2"));
    // @ts-expect-error: so is a range's start.
    range.start = T("0");
    const u = T("1");
    expect(u.plus(T("1")).equals(T("2"))).toBe(true);
    expect(u.equals(T("1"))).toBe(true);
  });
});

describe("a Time is not a number", () => {
  it("throws when used with + or <; TypeScript refuses + and * first, and < is caught when it runs", () => {
    const a = T("1");
    const b = T("2");
    // @ts-expect-error: a Time has no + operator.
    expect(() => a + b).toThrow(/not a number/);
    // TypeScript allows < on any two objects, so this one is caught at run time: compare with isBefore.
    expect(() => a < b).toThrow(/not a number/);
    // @ts-expect-error: nor arithmetic with a plain number.
    expect(() => a * 2).toThrow(/not a number/);
    expect(() => Number(a)).toThrow(/not a number/);
  });

  it("prints as text, and its text and JSON read back to the same tick", () => {
    expect(`${T("0.4")}`).toBe("0.4s");
    expect(String(T("-2.25"))).toBe("-2.25s");
    expect(JSON.stringify({ at: T("1.5") })).toBe('{"at":1.5}');
    const rate = parseRate("24");
    // The end of 121 frames at 24 fps: the shortest decimal that is still that tick, not 5.042, a frame later.
    const end = Time.frames(121, rate);
    expect(T(end.toJSON()).equals(end)).toBe(true);
    expect(T(end.toJSON()).frame(rate)).toBe(121);
    expect(T("5.042").frame(rate)).toBe(121);
    expect(T("5.042").isOnFrame(rate)).toBe(false);
    for (let i = 0; i < 2000; i++) {
      const t = Time.ofTicks(int(-1e15, 1e15));
      expect(T(t.toString()).equals(t), String(t.ticks)).toBe(true);
      expect(T(t.toJSON()).equals(t), String(t.ticks)).toBe(true);
    }
  });
});

describe("math on Time", () => {
  it("adds decimal lengths with no drift: ten 0.1 s make exactly 1 s, a thousand 0.001 s too", () => {
    let sum = Time.ZERO;
    for (let i = 0; i < 10; i++) sum = sum.plus(T("0.1"));
    expect(sum.equals(T("1"))).toBe(true);
    sum = Time.ZERO;
    for (let i = 0; i < 1000; i++) sum = sum.plus(T("0.001"));
    expect(sum.equals(T("1"))).toBe(true);
  });

  it("sums any row of millisecond lengths to the exact decimal total", () => {
    for (let run = 0; run < 200; run++) {
      const lengths = Array.from({ length: int(1, 50) }, () => decimal(3, 60));
      const total = lengths.reduce((s, l) => s.plus(T(l)), Time.ZERO);
      const thousandths = lengths.reduce((s, l) => s + Math.round(Number(l) * 1000), 0);
      expect(total.equals(T(`${thousandths}e-3`)), lengths.join(" + ")).toBe(true);
    }
  });

  it("keeps the laws of addition: order and grouping don't matter, and minus undoes plus", () => {
    for (let i = 0; i < 2000; i++) {
      const [a, b, c] = [0, 0, 0].map(() => Time.ofTicks(int(-1e14, 1e14))) as [Time, Time, Time];
      expect(a.plus(b).equals(b.plus(a))).toBe(true);
      expect(
        a
          .plus(b)
          .plus(c)
          .equals(a.plus(b.plus(c))),
      ).toBe(true);
      expect(a.plus(b).minus(b).equals(a)).toBe(true);
      expect(a.minus(a)).toBe(Time.ZERO);
      expect(a.plus(a.negate())).toBe(Time.ZERO);
      expect(a.abs().isNegative()).toBe(false);
    }
  });

  it("orders consistently: compare, isBefore, equals, min, max and sort agree", () => {
    for (let i = 0; i < 1000; i++) {
      const a = Time.ofTicks(int(-1e6, 1e6));
      const b = Time.ofTicks(int(-1e6, 1e6));
      expect(a.compare(b)).toBe(-b.compare(a) || 0);
      expect(a.isBefore(b)).toBe(a.compare(b) === -1);
      expect(a.isAfter(b)).toBe(a.compare(b) === 1);
      expect(a.isAtOrBefore(b)).toBe(a.compare(b) <= 0);
      expect(a.isAtOrAfter(b)).toBe(a.compare(b) >= 0);
      expect(a.equals(b)).toBe(a.compare(b) === 0);
      expect(Time.min(a, b).isAtOrBefore(Time.max(a, b))).toBe(true);
    }
    const sorted = ["2", "0.5", "-1", "1001/30000", "0"].map((x) => T(x)).sort(Time.compare);
    expect(sorted.map((t) => t.ticks)).toEqual(["-1", "0", "1001/30000", "0.5", "2"].map((x) => T(x).ticks));
  });

  it("throws past the limit on plus, and holds at MIN or MAX on plusClamped", () => {
    const six = T("21600");
    expect(() => six.plus(six)).toThrow(RangeError);
    expect(six.plusClamped(six)).toBe(Time.MAX);
    expect(six.negate().plusClamped(six.negate())).toBe(Time.MIN);
    expect(Time.MAX.plusClamped(Time.ofTicks(1))).toBe(Time.MAX);
    expect(Time.MAX.plusClamped(Time.ofTicks(-1)).ticks).toBe(Number.MAX_SAFE_INTEGER - 1);
    expect(six.plusClamped(T("0.5")).equals(six.plus(T("0.5")))).toBe(true);
    expect(Time.MIN.equals(Time.MAX.negate())).toBe(true);
  });

  it("multiplies by whole numbers and ratios exactly, rounding down as craft-time does", () => {
    expect(T("0.1").times(3).equals(T("0.3"))).toBe(true);
    expect(T("1").times(1001, 1000).equals(T("1.001"))).toBe(true);
    expect(T("1").times(1, 3).ticks).toBe(TICKS_PER_SECOND / 3);
    expect(() => T("1").times(1.5)).toThrow(/scaledBy/);
    expect(T("2").scaledBy(1.5).equals(T("3"))).toBe(true);
    expect(T("1").ratioTo(T("4"))).toBe(0.25);
    expect(() => T("1").ratioTo(Time.ZERO)).toThrow(RangeError);
    expect(T("5").clamp(T("0"), T("2")).equals(T("2"))).toBe(true);
    expect(T("-5").clamp(T("0"), T("2"))).toBe(Time.ZERO);
  });
});

describe("frames and samples", () => {
  it("reaches every frame of every rate exactly, and finds it again", () => {
    for (const rate of RATES) {
      for (let i = 0; i < 300; i++) {
        const n = int(0, Math.floor((MAX_SECONDS * rate.num) / rate.den) - 2);
        const start = Time.frames(n, rate);
        expect(start.frame(rate), `${rate.num}/${rate.den} frame ${n}`).toBe(n);
        expect(start.isOnFrame(rate)).toBe(true);
        expect(start.framesUntil(rate)).toBe(n);
        expect(start.snap(rate).equals(start)).toBe(true);
        const inside = start.plus(Time.ofTicks(1));
        expect(inside.frame(rate)).toBe(n);
        expect(inside.framesUntil(rate)).toBe(n + 1);
        expect(inside.snap(rate).equals(start)).toBe(true);
        expect(inside.isOnFrame(rate)).toBe(false);
        expect(
          Time.frames(n + 1, rate)
            .minus(Time.ofTicks(1))
            .frame(rate),
        ).toBe(n);
      }
    }
  });

  it("puts a cut written in milliseconds where a frame starts, when it is one: frame 9 at 30 fps is 0.3 s", () => {
    const rate = parseRate("30");
    expect(T("0.1").plus(T("0.2")).equals(Time.frames(9, rate))).toBe(true);
    expect(
      T("0.4")
        .minus(T("0.1").plus(T("0.2")))
        .equals(Time.frames(3, rate)),
    ).toBe(true);
  });

  it("snaps to the nearest frame, a halfway time going to the earlier", () => {
    const rate: Rate = { num: 24, den: 1 };
    const half = Time.frames(1, rate).times(1, 2);
    expect(half.snapNearest(rate)).toBe(Time.ZERO);
    expect(half.plus(Time.ofTicks(1)).snapNearest(rate).equals(Time.frames(1, rate))).toBe(true);
    expect(half.nearestFrame(rate)).toBe(0);
  });

  it("counts samples like craft-time's units", () => {
    for (const c of vectors.units) {
      const label = JSON.stringify(c);
      if ("units" in c && c.units !== undefined) {
        expect(Time.samples(c.units, c.perSecond).ticks, label).toBe(c.ticks);
        expect(Time.samples(c.units, c.perSecond).sample(c.perSecond), label).toBe(c.units);
      }
      if ("floor" in c && c.floor !== undefined) expect(Time.ofTicks(c.ticks).sample(c.perSecond), label).toBe(c.floor);
    }
  });
});

describe("craft-time vectors", () => {
  it("turns seconds into the same ticks", () => {
    for (const c of vectors.seconds) expect(Time.seconds(c.seconds).ticks, String(c.seconds)).toBe(c.ticks);
  });

  it("finds the same frames, frame starts and snaps", () => {
    for (const c of vectors.frames) {
      const rate = c.rate as Rate;
      const t = Time.ofTicks(c.ticks);
      const label = `${rate.num}/${rate.den} ${JSON.stringify(c)}`;
      if ("frameStart" in c && c.frameStart !== undefined)
        expect(Time.frames(c.frameStart as number, rate).ticks, label).toBe(c.ticks);
      if ("frame" in c && c.frame !== undefined) expect(t.frame(rate), label).toBe(c.frame);
      if ("snap" in c && c.snap !== undefined) expect(t.snap(rate).ticks, label).toBe(c.snap);
      if ("snapNearest" in c && c.snapNearest !== undefined)
        expect(t.snapNearest(rate).ticks, label).toBe(c.snapNearest);
    }
  });

  it("multiplies by a ratio the same way", () => {
    for (const c of vectors.mulRatio)
      expect(Time.ofTicks(c.ticks).times(c.num, c.den).ticks, JSON.stringify(c)).toBe(c.result);
  });

  it("reads container timestamps the same way", () => {
    for (const c of vectors.fromRational)
      expect(Time.timestamp(c.pts, c.num, c.den).ticks, JSON.stringify(c)).toBe(c.ticks);
  });

  it("finds the same ends, containment, overlaps and intersections of ranges", () => {
    const range = (r: { start: number; duration: number }) =>
      TimeRange.of(Time.ofTicks(r.start), Time.ofTicks(r.duration));
    for (const c of vectors.ranges) {
      const a = range(c.a);
      const b = range(c.b);
      const label = JSON.stringify(c);
      expect(a.end.ticks, label).toBe(c.end);
      expect(a.contains(b.start), label).toBe(c.containsBStart);
      expect(a.overlaps(b), label).toBe(c.overlaps);
      const i = a.intersect(b);
      expect(i && { start: i.start.ticks, duration: i.duration.ticks }, label).toEqual(c.intersect);
    }
  });
});

describe("TimeRange", () => {
  const r = TimeRange.between(T("1"), T("3"));

  it("is half-open: it holds its start, not its end", () => {
    expect(r.contains(T("1"))).toBe(true);
    expect(r.contains(T("2.999"))).toBe(true);
    expect(r.contains(T("3"))).toBe(false);
    expect(r.contains(T("0.999"))).toBe(false);
    expect(TimeRange.of(T("1"), Time.ZERO).contains(T("1"))).toBe(false);
  });

  it("never lasts less than nothing", () => {
    expect(() => TimeRange.of(T("1"), T("-1"))).toThrow(RangeError);
    expect(() => TimeRange.between(T("3"), T("1"))).toThrow(RangeError);
  });

  it("meets its neighbour at a cut without overlapping it, even when both were written in decimals", () => {
    const a = TimeRange.of(T("0"), T("0.1").plus(T("0.2")));
    const b = TimeRange.of(T("0.3"), T("0.4"));
    expect(a.end.equals(b.start)).toBe(true);
    expect(a.overlaps(b)).toBe(false);
    expect(a.intersect(b)).toBeNull();
  });

  it("covers, shifts, clamps, and measures elapsed time and progress", () => {
    expect(r.covers(TimeRange.between(T("1.5"), T("3")))).toBe(true);
    expect(r.covers(TimeRange.between(T("1.5"), T("3.1")))).toBe(false);
    expect(r.shift(T("-1")).equals(TimeRange.between(T("0"), T("2")))).toBe(true);
    expect(r.withDuration(T("5")).end.equals(T("6"))).toBe(true);
    expect(r.clamp(T("10")).equals(T("3"))).toBe(true);
    expect(r.elapsed(T("1.25")).equals(T("0.25"))).toBe(true);
    expect(r.progress(T("2"))).toBe(0.5);
    expect(r.progress(T("0"))).toBe(0);
    expect(r.progress(T("9"))).toBe(1);
    expect(TimeRange.EMPTY.progress(T("1"))).toBe(0);
  });

  it("shows on the frames its ends fall in, and snaps out onto them", () => {
    const rate = parseRate("29.97");
    const range = TimeRange.between(
      Time.frames(10, rate).plus(Time.ofTicks(5)),
      Time.frames(20, rate).minus(Time.ofTicks(5)),
    );
    expect(range.frames(rate)).toEqual({ first: 10, end: 20 });
    const snapped = range.snapOut(rate);
    expect(snapped.equals(TimeRange.between(Time.frames(10, rate), Time.frames(20, rate)))).toBe(true);
    expect(snapped.frames(rate)).toEqual(range.frames(rate));
  });

  it("writes JSON in the file's seconds, and prints as text", () => {
    expect(JSON.stringify(r)).toBe('{"start":1,"duration":2}');
    expect(String(r)).toBe("[1s, 3s)");
  });
});
