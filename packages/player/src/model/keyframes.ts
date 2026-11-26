import {
  type CurveKey,
  clamp01,
  curveAt,
  EASING_FN,
  easingCurve,
  type Generator,
  generatedValue,
} from "@uberscene/kit/schema";
import type { Placement } from "@uberscene/sdk/resolver";

import { devWarn } from "../warn";

export { EASING_FN };

/** The kit's easing (`easingCurve`), warning once on a name it does not know and drawing it linear. */
export function ease(name: string | undefined, x: number): number {
  const fn = easingCurve(name);
  if (!fn) {
    if (name !== undefined) devWarn(`easing:${name}`, `unknown easing "${name}", using linear`);
    return clamp01(x);
  }
  return fn(clamp01(x));
}

function keysWhere(children: readonly Placement[], match: (k: Placement) => boolean): CurveKey[] {
  const keys: CurveKey[] = [];
  for (const c of children) {
    if (c.kind !== "keyframe" || !match(c)) continue;
    keys.push({ at: Number(c.props.at ?? 0), value: c.props.value, easing: c.props.easing as string | undefined });
  }
  return keys.sort((a, b) => a.at - b.at);
}

/** The generator among an element's (or an effect's) children that drives what `match` picks, if any. */
function generatorWhere(children: readonly Placement[], match: (k: Placement) => boolean): Generator | undefined {
  for (const c of children) if (c.kind === "generator" && match(c)) return c.props as unknown as Generator;
  return undefined;
}

/** The value from keys, then through its generator when it has one: a wobble or a drift on top, or a loop of it. */
function animated<T>(children: readonly Placement[], match: (k: Placement) => boolean, rel: number, fallback: T): T {
  const keys = keysWhere(children, match);
  const generator = generatorWhere(children, match);
  if (!generator) return valueAt(keys, rel, fallback);
  // A generator is over a number: its keys when it has them, else the constant, else nothing to add to.
  const base = (t: number): number => {
    const v = Number(valueAt<unknown>(keys, t, fallback));
    return Number.isFinite(v) ? v : 0;
  };
  return generatedValue(generator, rel, base) as T;
}

/**
 * The value of `property` at element-relative time `rel`: its keys, and its generator when it has one. Keys hold
 * before the first and after the last; the segment between two keys uses the easing of the key it leaves.
 * Non-numeric values step.
 */
export function keyframedValue<T>(children: readonly Placement[], property: string, rel: number, fallback: T): T {
  return animated(children, (k) => k.props.property === property, rel, fallback);
}

/** The value of an effect's `param` at element-relative `rel`, from the keys and the generator inside the effect. */
export function keyframedParam<T>(keys: readonly Placement[], param: string, rel: number, fallback: T): T {
  return animated(keys, (k) => k.props.param === param, rel, fallback);
}

/** The kit's curve (`curveAt`), with this player's easing, which warns once on a name it does not know. */
function valueAt<T>(keys: readonly CurveKey[], rel: number, fallback: T): T {
  return keys.length === 0 ? fallback : (curveAt(keys, rel, ease) as T);
}
