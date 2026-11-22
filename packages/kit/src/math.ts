// Small number helpers the packages share, kept once so a fix lands everywhere.

/** `x` held to 0..1. */
export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** `x` rounded to three decimals (milliseconds, for seconds), with -0 written as 0. */
export const round3 = (x: number): number => Math.round(x * 1000) / 1000 + 0;
