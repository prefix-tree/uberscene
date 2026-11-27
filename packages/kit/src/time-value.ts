// Timeline time as a class (decision 0045, amending 0044): `Time` is a point or a length on the timeline, and
// `TimeRange` is a half-open stretch of it. A `Time` holds a whole number of ticks (1/254,016,000,000 s, the grid every
// frame rate and sample rate divides), and every operation on it is exact integer math. Code can't do arithmetic on a
// `Time` with `+`, `-` or `<`: TypeScript refuses `+`, `-` and `*` on a class, and the value refuses to turn into a
// number at run time, which also catches `<` (TypeScript allows it on any two objects). The float bugs a plain number
// allows (`0.1 + 0.2`, a cut a hair off its frame) have no way back in.
//
// Seconds come in through `Time.seconds(0.2)` or `Time.parse("0.4")`, which read the decimal exactly, and leave through
// `toSeconds()` (for animation code, which is continuous) or `toJSON()` (the shortest decimal that reads back to the
// same tick, for a file). Rounding follows craft-time, FilmCraft's Rust timeline, so the two agree on every tick.

import {
  frameOfTicks,
  frameStartTicks,
  mulRatio,
  snapToFrame,
  snapToNearestFrame,
  type Ticks,
  ticksFromRational,
  ticksFromUnits,
  ticksToUnitsFloor,
} from "./ticks";
import { type Rate, TICKS_PER_SECOND, ticksPerFrame } from "./time";

const TPS = BigInt(TICKS_PER_SECOND);

function checked(n: number, what: string): number {
  if (!Number.isSafeInteger(n))
    throw new RangeError(`${what} is past what a time can hold (about ±9.85 hours, 2^53 ticks), or not a whole count`);
  return n === 0 ? 0 : n;
}

/** `num / den` to the nearest integer, halves away from zero. `den` is positive. */
function roundDiv(num: bigint, den: bigint): bigint {
  const negative = num < 0n;
  const a = negative ? -num : num;
  const q = (a * 2n + den) / (den * 2n);
  return negative ? -q : q;
}

// A decimal number of seconds: an optional sign, digits with an optional point, an optional exponent, an optional "s".
const DECIMAL = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?\s*s?$/;
// A fraction of seconds, "1001/30000": a frame at 29.97 written exactly.
const FRACTION = /^([+-]?\d+)\s*\/\s*(\d+)\s*s?$/;

/** Decimal seconds as the nearest tick, read digit by digit so no float rounding comes in between. */
function decimalTicks(text: string): number | null {
  const m = DECIMAL.exec(text);
  if (!m) return null;
  const [, sign, whole = "", fraction = "", exponent = "0"] = m;
  if (whole === "" && fraction === "") return null;
  const digits = BigInt(`${whole}${fraction}` || "0");
  const scale = Number(exponent) - fraction.length;
  if (Math.abs(scale) > 400) return digits === 0n ? 0 : scale < 0 ? 0 : null;
  const ticks = scale >= 0 ? digits * TPS * 10n ** BigInt(scale) : roundDiv(digits * TPS, 10n ** BigInt(-scale));
  const n = Number(sign === "-" ? -ticks : ticks);
  return Number.isSafeInteger(n) ? n + 0 : null;
}

/** Finite seconds as the nearest tick, or null past 2^53 ticks. Reads the decimal the number prints as. */
function secondsTicks(seconds: number): number | null {
  const x = seconds * TICKS_PER_SECOND;
  const r = Math.round(x);
  // The float product is the decimal's tick to within |x|·5e-16 (the double's own rounding, then the multiply's).
  // Unless that could tip it across a half tick, it is the answer; otherwise read the decimal digit by digit.
  if (Number.isSafeInteger(r) && Math.abs(x - r) < 0.5 - Math.abs(x) * 5e-16) return r + 0;
  return decimalTicks(String(seconds));
}

/**
 * A point or a length on the timeline, as a whole number of ticks. Immutable: every operation returns a new `Time`.
 * Compare two with `equals` or `compare`, never with `===`, which compares objects.
 */
export class Time {
  /** No time: the start of a composition, or an empty length. */
  static readonly ZERO = new Time(0);
  /** The latest time there is, 2^53 - 1 ticks (about 9.85 hours). */
  static readonly MAX = new Time(Number.MAX_SAFE_INTEGER);
  /** The earliest time there is, the negative of `MAX`. */
  static readonly MIN = new Time(-Number.MAX_SAFE_INTEGER);

  /** The count of 1/254,016,000,000 s this time is. A safe integer. */
  readonly ticks: number;

  private constructor(ticks: number) {
    this.ticks = ticks;
  }

  /** A count of ticks. Throws for a number that isn't a safe integer. */
  static ofTicks(ticks: number): Time {
    // The message is built only when the count is refused: a resolve makes thousands of times, and none of them throw.
    if (!Number.isSafeInteger(ticks)) checked(ticks, `${ticks} ticks`);
    return ticks === 0 ? Time.ZERO : new Time(ticks);
  }

  /**
   * Seconds as the nearest tick. The number is read as the decimal it prints as, so `Time.seconds(0.1 + 0.2)` and
   * `Time.seconds(0.3)` are the same tick. Throws for NaN, an infinity, or a time past about ±9.85 hours.
   */
  static seconds(seconds: number): Time {
    if (!Number.isFinite(seconds)) throw new RangeError(`${seconds} is not a time in seconds`);
    const ticks = secondsTicks(seconds);
    if (ticks === null) throw new RangeError(`${seconds} s is past what a time can hold (about ±9.85 hours)`);
    return Time.ofTicks(ticks);
  }

  /**
   * A time as text or a number of seconds: `"0.4"`, `"-1.25"`, `"2.5s"`, `"1e-3"`, or an exact fraction, `"1001/30000"`.
   * Text is read digit by digit, so `"0.4"` is exactly 0.4 s, and the result is the nearest tick. Throws for text
   * that isn't a time, with the text in the message.
   */
  static parse(value: string | number): Time {
    if (typeof value === "number") return Time.seconds(value);
    const text = value.trim();
    const fraction = FRACTION.exec(text);
    if (fraction) {
      const den = BigInt(fraction[2] as string);
      if (den === 0n) throw new RangeError(`"${value}" divides by zero`);
      const n = Number(roundDiv(BigInt(fraction[1] as string) * TPS, den));
      return Time.ofTicks(checked(n, `"${value}"`));
    }
    const ticks = decimalTicks(text);
    if (ticks === null) throw new RangeError(`"${value}" is not a time in seconds, or is past about ±9.85 hours`);
    return Time.ofTicks(ticks);
  }

  /** Where frame `n` starts at `rate`: exact at every rate, 29.97 and 23.976 among them. */
  static frames(n: number, rate: Rate): Time {
    return Time.ofTicks(frameStartTicks(n, rate));
  }

  /** `n` samples at `sampleRate` (48 000), rounded toward zero, as craft-time's `from_units`. */
  static samples(n: number, sampleRate: number): Time {
    return Time.ofTicks(ticksFromUnits(n, sampleRate));
  }

  /** A container timestamp, `pts · num / den` seconds (a 1/90 000 timebase), rounded down, as craft-time's `from_rational`. */
  static timestamp(pts: number, num: number, den: number): Time {
    return Time.ofTicks(ticksFromRational(pts, num, den));
  }

  /** The earliest of some times. */
  static min(first: Time, ...rest: readonly Time[]): Time {
    return rest.reduce((a, b) => (b.ticks < a.ticks ? b : a), first);
  }

  /** The latest of some times. */
  static max(first: Time, ...rest: readonly Time[]): Time {
    return rest.reduce((a, b) => (b.ticks > a.ticks ? b : a), first);
  }

  /** `this + other`, exact. */
  plus(other: Time): Time {
    return Time.ofTicks(this.ticks + other.ticks);
  }

  /**
   * `this + other`, held at `MIN` or `MAX` instead of throwing past them. For a reader that must place the rest of a
   * file that says a time too long, and reports it: a sum at the limit is how it knows.
   */
  plusClamped(other: Time): Time {
    const sum = this.ticks + other.ticks;
    return sum >= Number.MAX_SAFE_INTEGER ? Time.MAX : sum <= -Number.MAX_SAFE_INTEGER ? Time.MIN : Time.ofTicks(sum);
  }

  /** `this - other`, exact. */
  minus(other: Time): Time {
    return Time.ofTicks(this.ticks - other.ticks);
  }

  /** `-this`. */
  negate(): Time {
    return Time.ofTicks(-this.ticks);
  }

  /** The distance from zero. */
  abs(): Time {
    return this.ticks < 0 ? this.negate() : this;
  }

  /**
   * `this · num / den`, exact, rounded down (Euclidean for a negative `den`), as craft-time's `mul_ratio`: a whole
   * number of times (`times(3)`), or a ratio of whole numbers (`times(1001, 1000)`).
   */
  times(num: number, den = 1): Time {
    if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den))
      throw new RangeError(`times takes whole numbers; scale by ${num}/${den} with scaledBy`);
    return Time.ofTicks(mulRatio(this.ticks as Ticks, num, den));
  }

  /** `this` scaled by a factor that need not be a fraction (a clip speed of 1.5), to the nearest tick. */
  scaledBy(factor: number): Time {
    if (!Number.isFinite(factor)) throw new RangeError(`${factor} is not a factor`);
    return Time.ofTicks(Math.round(this.ticks * factor));
  }

  /** How many of `other` fit in this, as a fraction: progress through a length, or a ratio of two lengths. */
  ratioTo(other: Time): number {
    if (other.ticks === 0) throw new RangeError("a ratio to no time");
    return this.ticks / other.ticks;
  }

  /** -1 when this is earlier, 0 when they are the same tick, 1 when this is later. Sorts: `times.sort(Time.compare)`. */
  compare(other: Time): -1 | 0 | 1 {
    return this.ticks < other.ticks ? -1 : this.ticks > other.ticks ? 1 : 0;
  }

  /** `a.compare(b)`, as a function to sort with. */
  static compare(a: Time, b: Time): -1 | 0 | 1 {
    return a.compare(b);
  }

  /** Whether the two are the same tick. */
  equals(other: Time): boolean {
    return this.ticks === other.ticks;
  }

  /** Whether this is earlier than `other`. */
  isBefore(other: Time): boolean {
    return this.ticks < other.ticks;
  }

  /** Whether this is later than `other`. */
  isAfter(other: Time): boolean {
    return this.ticks > other.ticks;
  }

  /** Whether this is earlier than `other` or the same tick. */
  isAtOrBefore(other: Time): boolean {
    return this.ticks <= other.ticks;
  }

  /** Whether this is later than `other` or the same tick. */
  isAtOrAfter(other: Time): boolean {
    return this.ticks >= other.ticks;
  }

  /** Whether this is no time. */
  isZero(): boolean {
    return this.ticks === 0;
  }

  /** Whether this is before zero. */
  isNegative(): boolean {
    return this.ticks < 0;
  }

  /** This held to `[lo, hi]`. */
  clamp(lo: Time, hi: Time): Time {
    return this.ticks < lo.ticks ? lo : this.ticks > hi.ticks ? hi : this;
  }

  /** The frame this falls in at `rate`, rounded down. */
  frame(rate: Rate): number {
    return frameOfTicks(this.ticks as Ticks, rate);
  }

  /** How many frames a stretch ending here holds at `rate`: the first frame at or after this. */
  framesUntil(rate: Rate): number {
    const per = ticksPerFrame(rate);
    const f = this.frame(rate);
    return f * per === this.ticks ? f : f + 1;
  }

  /** The frame nearest this at `rate`; halfway between two goes to the earlier, as craft-time's `snap_nearest`. */
  nearestFrame(rate: Rate): number {
    return Time.ofTicks(snapToNearestFrame(this.ticks as Ticks, rate)).frame(rate);
  }

  /** This moved down to the start of the frame it falls in. */
  snap(rate: Rate): Time {
    return Time.ofTicks(snapToFrame(this.ticks as Ticks, rate));
  }

  /** This moved to the nearest frame start; halfway between two goes to the earlier. */
  snapNearest(rate: Rate): Time {
    return Time.ofTicks(snapToNearestFrame(this.ticks as Ticks, rate));
  }

  /** Whether this is exactly on a frame start at `rate`. */
  isOnFrame(rate: Rate): boolean {
    return this.ticks % ticksPerFrame(rate) === 0;
  }

  /** The audio sample this falls in at `sampleRate`, rounded down. */
  sample(sampleRate: number): number {
    return ticksToUnitsFloor(this.ticks as Ticks, sampleRate);
  }

  /** Seconds as a float, for animation code and display: continuous values, where a tick's error changes nothing. */
  toSeconds(): number {
    return this.ticks / TICKS_PER_SECOND;
  }

  /** The shortest decimal of seconds that reads back to this tick: `2.2`, or `5.041666666666667` for 121 frames at 24. */
  toFileSeconds(): number {
    const seconds = this.toSeconds();
    for (let digits = 1; digits <= 17; digits++) {
      const candidate = Number(seconds.toPrecision(digits));
      if (secondsTicks(candidate) === this.ticks) return candidate + 0;
    }
    // Only past about 4.5 hours can no double read back to the tick; the nearest one is a tick or two away.
    return seconds;
  }

  /** Whether `toFileSeconds()` reads back to this exact tick (always, below about 4.5 hours). */
  private fileSecondsExact(): boolean {
    return secondsTicks(this.toFileSeconds()) === this.ticks;
  }

  /** As JSON: the file's seconds, so a `Time` in a param, a row or a file reads back with `Time.parse`. */
  toJSON(): number {
    return this.toFileSeconds();
  }

  /** As text: the file's seconds and an "s", `"0.4s"`, which `Time.parse` reads back. */
  toString(): string {
    // A tick no double reads back to is written as its exact fraction of a second, which parse reads exactly.
    return this.fileSecondsExact() ? `${this.toFileSeconds()}s` : `${this.ticks}/${TICKS_PER_SECOND}s`;
  }

  /** Text in a template string; a number nowhere, so `a + b` or `a < b` on two times throws instead of guessing. */
  [Symbol.toPrimitive](hint: string): string {
    if (hint === "string") return this.toString();
    throw new TypeError(
      "a Time is not a number: use plus, minus, compare or isBefore, or toSeconds() for animation code",
    );
  }
}

/**
 * A half-open stretch of the timeline, `[start, start + duration)`, as craft-time's `TimeRange`. A range with no
 * duration is empty: it contains nothing and overlaps nothing. Immutable, and compared with `equals`.
 */
export class TimeRange {
  /** The empty range at zero. */
  static readonly EMPTY = new TimeRange(Time.ZERO, Time.ZERO);

  readonly start: Time;
  readonly duration: Time;
  /** The first tick after the range: `start + duration`. */
  readonly end: Time;

  private constructor(start: Time, duration: Time, end?: Time) {
    this.start = start;
    this.duration = duration;
    this.end = end ?? start.plus(duration);
  }

  /** The range that starts at `start` and lasts `duration`. Throws for a negative duration. */
  static of(start: Time, duration: Time): TimeRange {
    if (duration.isNegative()) throw new RangeError(`a range can't last ${duration}`);
    return new TimeRange(start, duration);
  }

  /**
   * The range that starts at `start` and lasts `duration`, never throwing: a negative duration is held at zero and an
   * end past `Time.MAX` at `MAX`. For a reader that places a broken or too-long file and reports it.
   */
  static clamped(start: Time, duration: Time): TimeRange {
    const length = duration.isNegative() ? Time.ZERO : duration;
    const end = start.plusClamped(length);
    return end.ticks - start.ticks === length.ticks
      ? new TimeRange(start, length, end)
      : new TimeRange(start, end.minus(start), end);
  }

  /** The range from `start` up to, not including, `end`. Throws when `end` is before `start`. */
  static between(start: Time, end: Time): TimeRange {
    return TimeRange.of(start, end.minus(start));
  }

  /** Whether the range holds no time. */
  isEmpty(): boolean {
    return this.duration.isZero();
  }

  /** Whether `t` is in `[start, end)`. */
  contains(t: Time): boolean {
    return t.ticks >= this.start.ticks && t.ticks < this.end.ticks;
  }

  /** Whether `other` lies wholly inside this range. An empty range is inside a range that holds its start. */
  covers(other: TimeRange): boolean {
    return other.start.isAtOrAfter(this.start) && other.end.isAtOrBefore(this.end);
  }

  /** Whether the two share any time. */
  overlaps(other: TimeRange): boolean {
    return !this.isEmpty() && !other.isEmpty() && this.start.isBefore(other.end) && other.start.isBefore(this.end);
  }

  /** The time the two share, or null when they share none. */
  intersect(other: TimeRange): TimeRange | null {
    const start = Time.max(this.start, other.start);
    const end = Time.min(this.end, other.end);
    return end.isAfter(start) ? TimeRange.between(start, end) : null;
  }

  /** The range moved later by `by` (earlier for a negative `by`), the same length. */
  shift(by: Time): TimeRange {
    return new TimeRange(this.start.plus(by), this.duration);
  }

  /** The same start with another length. */
  withDuration(duration: Time): TimeRange {
    return TimeRange.of(this.start, duration);
  }

  /** `t` held inside the range's bounds, `[start, end]`. */
  clamp(t: Time): Time {
    return t.clamp(this.start, this.end);
  }

  /** Time from the range's start to `t`: what a key's, a freeze's or a word's `at` measures. */
  elapsed(t: Time): Time {
    return t.minus(this.start);
  }

  /** Progress through the range at `t`, 0 at its start and 1 at its end, held to `[0, 1]`. An empty range is 0. */
  progress(t: Time): number {
    if (this.isEmpty()) return 0;
    const u = (t.ticks - this.start.ticks) / this.duration.ticks;
    return u < 0 ? 0 : u > 1 ? 1 : u;
  }

  /** The frames the range shows on at `rate`: from the frame its start falls in, up to the first frame at its end. */
  frames(rate: Rate): { readonly first: number; readonly end: number } {
    return { first: this.start.frame(rate), end: this.end.framesUntil(rate) };
  }

  /** The range with both ends on frame starts at `rate`: the start down, the end up, so it shows on the same frames. */
  snapOut(rate: Rate): TimeRange {
    return TimeRange.between(this.start.snap(rate), Time.frames(this.end.framesUntil(rate), rate));
  }

  /** Whether both ranges start on the same tick and last the same. */
  equals(other: TimeRange): boolean {
    return this.start.equals(other.start) && this.duration.equals(other.duration);
  }

  /** As JSON: start and duration in the file's seconds. */
  toJSON(): { readonly start: number; readonly duration: number } {
    return { start: this.start.toFileSeconds(), duration: this.duration.toFileSeconds() };
  }

  /** As text, `"[0.4s, 1.2s)"`. */
  toString(): string {
    return `[${this.start}, ${this.end})`;
  }
}
