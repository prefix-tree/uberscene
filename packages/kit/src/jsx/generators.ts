// Motion that is computed rather than keyed: a value written as `{ type: "wiggle", … }` in place of a number or a
// list of keys. Each generator is a pure function of time and its params, so a frame is the same in the preview,
// in the export, at every moment of a motion blur and from the frame cache.

import { secondsToTicks, ticksToSeconds } from "../time";
import { hash } from "./random";

/** The generators a value can be written as. */
export const GENERATOR_TYPES = ["wiggle", "drift", "loop"] as const;
export type GeneratorType = (typeof GENERATOR_TYPES)[number];

/** A generator as the resolver hands it to whatever draws: its type and its params, the seed filled in. */
export interface Generator {
  readonly type: GeneratorType;
  /** `wiggle`: the most it adds, in the value's own units. */
  readonly amount?: number;
  /** `wiggle`: wobbles a second. */
  readonly frequency?: number;
  /** `wiggle`: which wobble; the same seed gives the same one. */
  readonly seed?: number;
  /** `drift`: how much it adds each second. */
  readonly speed?: number;
  /** `loop`: `repeat` starts over, `pingpong` plays back and forth. */
  readonly mode?: "repeat" | "pingpong";
  /** `loop`: the first and last key's time, the stretch it plays again. */
  readonly span?: readonly [number, number];
  /**
   * `wiggle` and `drift`: seconds added to the time they are read at. A value linked to another element's runs that
   * element's wobble, which is on that element's clock: `shift` is where this element's start stands on it.
   */
  readonly shift?: number;
}

/** Whether a value written in a prop is a generator: an object whose `type` names one. */
export function isGenerator(value: unknown): value is { readonly type: GeneratorType } & Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (GENERATOR_TYPES as readonly string[]).includes((value as { type?: unknown }).type as string)
  );
}

/** The seed a wiggle has when the file gives none: from the element and the prop, so no two wobble alike. */
export function generatorSeed(element: string, path: string): number {
  return hash(`${element}.${path}`);
}

/** A number from -1 to 1 for a whole-number point of a seed's line: the same point always gives the same number. */
function lattice(seed: number, i: number): number {
  let h = (seed ^ Math.imul(i | 0, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

/**
 * Smooth noise from -1 to 1 along `x`: a seeded number at each whole `x`, eased between them (value noise). Two
 * octaves, so it does not swing like a pendulum.
 */
export function smoothNoise(seed: number, x: number): number {
  const octave = (s: number, at: number): number => {
    const i = Math.floor(at);
    const u = at - i;
    const eased = u * u * (3 - 2 * u);
    return lattice(s, i) + (lattice(s, i + 1) - lattice(s, i)) * eased;
  };
  return (octave(seed, x) * 2 + octave(seed ^ 0x5bd1e995, x * 2.13 + 7.7)) / 3;
}

/**
 * A generated value at `t` seconds into its element. `base` is what the value would be without the generator, at
 * any time: its constant, or its keys. `wiggle` and `drift` add to it; `loop` plays its stretch of it again.
 */
export function generatedValue(g: Generator, t: number, base: (t: number) => number): number {
  // A continuous value: a hair of float error in `t + shift` changes nothing seen, so no ticks here.
  const own = t + (g.shift ?? 0);
  if (g.type === "wiggle") return base(t) + (g.amount ?? 0) * smoothNoise(g.seed ?? 0, own * (g.frequency ?? 1));
  if (g.type === "drift") return base(t) + (g.speed ?? 0) * Math.max(0, own);
  const [from, to] = g.span ?? [0, 0];
  const length = to - from;
  if (!(length > 0) || t <= from) return base(t);
  // In ticks: 0.3 / 0.1 is 2.9999999999999996 as doubles, and a repeat would show its end on the frame it restarts.
  const along = secondsToTicks(t) - secondsToTicks(from);
  const span = secondsToTicks(length);
  const lap = Math.floor(along / span);
  const within = ticksToSeconds(along - lap * span);
  return base(from + (g.mode === "pingpong" && lap % 2 === 1 ? length - within : within));
}
