// The sdk's time helpers on placements (decisions 0044, 0045). A placement's `range` is a `TimeRange` of exact `Time`s;
// the sdk does its time math with `Time` methods and turns a result back into seconds only to write it into a file, a
// param or a row.

import { MAX_SECONDS, type Ticks, Time, type TimeRange } from "@uberscene/kit/schema";

/**
 * Seconds from a file, a param, the manifest or the speed math as the nearest `Time`. A time past about ±9.85 hours is
 * held at `Time.MAX` or `Time.MIN` instead of throwing: a file can say a longer time, which the resolver reports (a
 * length at the limit is how it knows), and an edit or a row on such a file must still work. NaN is no time.
 */
export const T = (seconds: number): Time =>
  seconds > MAX_SECONDS
    ? Time.MAX
    : seconds < -MAX_SECONDS
      ? Time.MIN
      : Time.seconds(Number.isNaN(seconds) ? 0 : seconds);

/** A `Time` as seconds, for a file, a param, a message or a row. */
export const S = (t: Time): number => t.toSeconds();

interface Ranged {
  readonly range: TimeRange;
}

/** Where a placement starts, as a count of ticks. */
export const startTicks = (p: Ranged): Ticks => p.range.start.ticks as Ticks;
/** How long a placement is, as a count of ticks. */
export const lengthTicks = (p: Ranged): Ticks => p.range.duration.ticks as Ticks;
/** Where a placement ends, as a count of ticks: the first tick after it. */
export const endTicks = (p: Ranged): Ticks => p.range.end.ticks as Ticks;

/** Where a placement starts, in seconds. */
export const startSeconds = (p: Ranged): number => p.range.start.toSeconds();
/** How long a placement is, in seconds. */
export const lengthSeconds = (p: Ranged): number => p.range.duration.toSeconds();
/** Where a placement ends, in seconds. */
export const endSeconds = (p: Ranged): number => p.range.end.toSeconds();

/** Seconds from a placement's start to `t` (seconds), worked out exactly: what a key's or a freeze's `at` measures. */
export const secondsSinceStart = (p: Ranged, t: number): number => T(t).minus(p.range.start).toSeconds();
