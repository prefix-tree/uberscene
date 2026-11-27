// Timeline time as a value: a whole number of ticks (decision 0044). `time.ts` turns seconds into frames and samples
// through ticks; this module is the type that lets the engine keep ticks as its time, and the arithmetic on them.
//
// A `Ticks` is a JavaScript number that is a safe integer. The brand stops a plain number (seconds) from being
// assigned where ticks are meant: make one with `ticks(n)` or `secondsToTicksExact(s)`, never with `as`. Ticks add,
// subtract and compare exactly; anything that multiplies goes through `mulRatio` or `scale`, which keep the
// intermediate product exact, so no result passes 2^53 on the way. The semantics follow craft-time's `Tick` (the
// same 254,016,000,000 per second, floor division, half-open ranges), and `test/vectors/ticks.json` holds cases taken
// from craft-time that both implementations must agree on.

import { type Rate, TICKS_PER_SECOND, ticksPerFrame } from "./time";

declare const TICKS: unique symbol;

/** A time or a length in ticks: a safe integer count of 1/254,016,000,000 s. */
export type Ticks = number & { readonly [TICKS]: true };

/**
 * A half-open stretch of time in raw ticks, `[start, start + duration)`, as craft-time's `TimeRange`. Its end is
 * computed. Prefer the `TimeRange` class (decision 0045), which a placement's range moves to next.
 */
export interface TickRange {
  readonly start: Ticks;
  readonly duration: Ticks;
}

/** A count as ticks. Throws for a number that isn't a safe integer, which is always a unit mix-up. */
export function ticks(n: number): Ticks {
  if (!Number.isSafeInteger(n)) throw new RangeError(`ticks must be a safe integer, got ${n}`);
  return (n === 0 ? 0 : n) as Ticks;
}

/** No time: the start of a composition, or an empty length. */
export const ZERO_TICKS: Ticks = 0 as Ticks;

/** Seconds as the nearest tick. Every time written to the millisecond (0.1, 2.35) is an exact count. */
export const secondsToTicksExact = (seconds: number): Ticks => ticks(Math.round(seconds * TICKS_PER_SECOND));

/** Ticks as seconds, for display and for animation code, which is continuous. */
export const ticksAsSeconds = (t: Ticks): number => t / TICKS_PER_SECOND;

/**
 * Ticks as the number a file should say: the shortest decimal that reads back to the same tick. 2.2 s is `2.2`, and
 * the end of 121 frames at 24 fps is `5.041666666666667`, not `5.042`, which would be a frame later.
 */
export function ticksToFileSeconds(t: Ticks): number {
  const seconds = t / TICKS_PER_SECOND;
  for (let digits = 1; digits <= 17; digits++) {
    const candidate = Number(seconds.toPrecision(digits));
    if (Math.round(candidate * TICKS_PER_SECOND) === t) return candidate + 0;
  }
  return seconds;
}

/** `a + b`, exact. */
export const addTicks = (a: Ticks, b: Ticks): Ticks => ticks(a + b);
/** `a - b`, exact. */
export const subTicks = (a: Ticks, b: Ticks): Ticks => ticks(a - b);
/** The earlier of two times, or the shorter of two lengths. */
export const minTicks = (a: Ticks, b: Ticks): Ticks => (a < b ? a : b);
/** The later of two times, or the longer of two lengths. */
export const maxTicks = (a: Ticks, b: Ticks): Ticks => (a > b ? a : b);
/** `t` held to `[lo, hi]`. */
export const clampTicks = (t: Ticks, lo: Ticks, hi: Ticks): Ticks => minTicks(maxTicks(t, lo), hi);

/** Floor of `a / b` for integers, exact where `a / b` as a double would round across an integer. `b` is positive. */
function floorDiv(a: number, b: number): number {
  let q = Math.floor(a / b);
  const r = a - q * b;
  if (r < 0) q -= 1;
  else if (r >= b) q += 1;
  return q;
}

const toBig = (n: number): bigint => BigInt(n);

/** Euclidean `a / b` (the remainder is never negative), as Rust's `div_euclid`, which craft-time uses. */
function divEuclidBig(a: bigint, b: bigint): bigint {
  const q = a / b;
  if (a % b >= 0n) return q;
  return b > 0n ? q - 1n : q + 1n;
}

/** Euclidean `a * num / den` in exact integer math, through BigInt only when the product isn't a safe integer. */
function mulDivEuclid(a: number, num: number, den: number): number {
  if (den === 0) throw new RangeError("a ticks ratio with a zero denominator");
  const product = a * num;
  if (Number.isSafeInteger(product)) return den > 0 ? floorDiv(product, den) : -floorDiv(product, -den);
  return Number(divEuclidBig(toBig(a) * toBig(num), toBig(den)));
}

/** `t · num / den` to the tick, rounded down (Euclidean for a negative `den`), as craft-time's `mul_ratio`. */
export const mulRatio = (t: Ticks, num: number, den: number): Ticks => ticks(mulDivEuclid(t, num, den));

/** `t` scaled by a factor that need not be a fraction (a clip speed of 1.5), to the nearest tick. */
export const scaleTicks = (t: Ticks, factor: number): Ticks => ticks(Math.round(t * factor));

/** A count of `units` at `perSecond` (samples at 48 000) as ticks, rounded toward zero, as craft-time's `from_units`. */
export function ticksFromUnits(units: number, perSecond: number): Ticks {
  if (perSecond === 0) return ZERO_TICKS;
  return ticks(Number((toBig(units) * toBig(TICKS_PER_SECOND)) / toBig(perSecond)));
}

/** Ticks as a count of units at `perSecond`, floored, as craft-time's `to_units_floor`. */
export const ticksToUnitsFloor = (t: Ticks, perSecond: number): number => mulDivEuclid(t, perSecond, TICKS_PER_SECOND);

/** A container timestamp, `pts · num / den` seconds, as ticks, rounded down, as craft-time's `from_rational`. */
export function ticksFromRational(pts: number, num: number, den: number): Ticks {
  if (den === 0) return ZERO_TICKS;
  return ticks(Number(divEuclidBig(toBig(pts) * toBig(num) * toBig(TICKS_PER_SECOND), toBig(den))));
}

/** Ticks as a timestamp in a `num / den` timebase, rounded down, as craft-time's `to_rational_floor`. */
export function ticksToRationalFloor(t: Ticks, num: number, den: number): number {
  const unit = toBig(num) * toBig(TICKS_PER_SECOND);
  return unit === 0n ? 0 : Number(divEuclidBig(toBig(t) * toBig(den), unit));
}

/** Ticks as a timestamp in a `num / den` timebase, to the nearest unit with halves up, as craft-time's `to_rational_round`. */
export function ticksToRationalRound(t: Ticks, num: number, den: number): number {
  let a = toBig(t) * toBig(den);
  let u = toBig(num) * toBig(TICKS_PER_SECOND);
  if (u === 0n) return 0;
  if (u < 0n) [a, u] = [-a, -u];
  let q = a / u;
  let r = a % u;
  if (r < 0n) {
    q -= 1n;
    r += u;
  }
  return Number(r * 2n >= u ? q + 1n : q);
}

/** The frame a tick falls in, floored. */
export const frameOfTicks = (t: Ticks, rate: Rate): number => floorDiv(t, ticksPerFrame(rate));

/** The first tick of a frame. */
export const frameStartTicks = (frame: number, rate: Rate): Ticks => ticks(frame * ticksPerFrame(rate));

/** `t` moved down to the start of the frame it falls in. */
export const snapToFrame = (t: Ticks, rate: Rate): Ticks => frameStartTicks(frameOfTicks(t, rate), rate);

/** `t` moved to the nearest frame start; a time halfway between two goes to the earlier, as craft-time's `snap_nearest`. */
export function snapToNearestFrame(t: Ticks, rate: Rate): Ticks {
  const a = snapToFrame(t, rate);
  const b = ticks(a + ticksPerFrame(rate));
  return t - a <= b - t ? a : b;
}

/** The range that starts at `start` and lasts `duration`. */
export const timeRange = (start: Ticks, duration: Ticks): TickRange => ({ start, duration });

/** The range from `start` up to, but not including, `end`. */
export const rangeFromBounds = (start: Ticks, end: Ticks): TickRange => ({ start, duration: subTicks(end, start) });

/** The first tick after a range: `start + duration`. */
export const rangeEnd = (r: TickRange): Ticks => addTicks(r.start, r.duration);

/** Whether `t` is in `[start, end)`. */
export const rangeContains = (r: TickRange, t: Ticks): boolean => t >= r.start && t < r.start + r.duration;

/** Whether a range holds no time. */
export const rangeIsEmpty = (r: TickRange): boolean => r.duration <= 0;

/** Whether two ranges share any time. An empty range overlaps nothing. */
export const rangesOverlap = (a: TickRange, b: TickRange): boolean =>
  !rangeIsEmpty(a) && !rangeIsEmpty(b) && a.start < b.start + b.duration && b.start < a.start + a.duration;

/** The stretch two ranges share, or null when they share none. */
export function rangeIntersect(a: TickRange, b: TickRange): TickRange | null {
  const start = maxTicks(a.start, b.start);
  const end = minTicks(rangeEnd(a), rangeEnd(b));
  return end > start ? rangeFromBounds(start, end) : null;
}
