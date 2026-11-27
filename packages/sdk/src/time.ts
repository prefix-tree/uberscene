// The sdk's time helpers on placements (decision 0044). A placement's `range` is whole ticks; the sdk reads it through
// these, does its arithmetic in ticks, and turns a result back into seconds only to write it into a file, a param or a
// row. Unlike the kit's checked helpers, these don't throw past 2^53 ticks (about 9.85 hours): a file can say a longer
// time, which the resolver reports, and an edit or a row on such a file must still work.

import { TICKS_PER_SECOND, type Ticks, type TimeRange, ticksAsSeconds } from "@uberscene/kit/schema";

/** Seconds as the nearest tick: a time from a file, a param, the manifest or the speed math. */
export const T = (seconds: number): Ticks => (Math.round(seconds * TICKS_PER_SECOND) + 0) as Ticks;

/** Ticks as seconds, for a file, a param, a message or a row. Exact ticks read back to themselves. */
export const S = (ticks: Ticks): number => ticksAsSeconds(ticks);

export const plus = (a: Ticks, b: Ticks): Ticks => (a + b) as Ticks;
export const minus = (a: Ticks, b: Ticks): Ticks => (a - b) as Ticks;

interface Ranged {
  readonly range: TimeRange;
}

/** Where a placement starts, in ticks. */
export const startT = (p: Ranged): Ticks => p.range.start.ticks as Ticks;
/** How long a placement is, in ticks. */
export const lengthT = (p: Ranged): Ticks => p.range.duration.ticks as Ticks;
/** Where a placement ends, in ticks: the first tick after it. */
export const endT = (p: Ranged): Ticks => p.range.end.ticks as Ticks;

/** Where a placement starts, in seconds. */
export const startS = (p: Ranged): number => p.range.start.toSeconds();
/** How long a placement is, in seconds. */
export const lengthS = (p: Ranged): number => p.range.duration.toSeconds();
/** Where a placement ends, in seconds. */
export const endS = (p: Ranged): number => S(endT(p));

/** Seconds from a placement's start to `t` (seconds), worked out in ticks: what a key's or a freeze's `at` measures. */
export const sinceStart = (p: Ranged, t: number): number => S(minus(T(t), startT(p)));
