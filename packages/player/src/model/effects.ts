import { cssOf, effectEntry, isNeutral } from "@uberscene/kit/schema";
import type { Placement } from "@uberscene/sdk/resolver";

import { devWarn } from "../warn";
import { keyframedParam } from "./keyframes";

type Params = Readonly<Record<string, unknown>>;

/** The placements of an element and its children, by id: where an effect's own keyframes are found. */
export type Items = ReadonlyMap<string, Placement>;

/** An effect's params, with the ones its keys animate evaluated at element-relative `rel`. */
export function paramsAt(items: Items, effect: Placement, rel: number): Params {
  const base = (effect.props.params ?? {}) as Params;
  const keys = effect.children
    .map((id) => items.get(id))
    .filter((k): k is Placement => k?.kind === "keyframe" && typeof k.props.param === "string");
  if (keys.length === 0) return base;
  const out: Record<string, unknown> = { ...base };
  for (const name of new Set(keys.map((k) => k.props.param as string)))
    out[name] = keyframedParam(keys, name, rel, base[name]);
  return out;
}

/**
 * One child's CSS filter (an effect drawn as CSS) at element-relative `rel`, or "" for a
 * child drawn otherwise: a post effect, a type in `skip` (drawn by its shader), a shader-only type, a disabled one, or a
 * built-in whose params change nothing at this moment.
 * An unknown type is reported once and draws nothing.
 */
export function childFilter(
  items: Items,
  c: Placement,
  elementId: string,
  rel: number,
  skip: ReadonlySet<string> = new Set(),
): string {
  if (c.kind !== "effect" || c.props.enabled === false) return "";
  const type = String(c.props.type);
  if (skip.has(type)) return "";
  // A built-in: its CSS, or nothing for a post effect or one only a shader draws (the painter says so without WebGL),
  // or for one whose params change nothing at this moment.
  if (effectEntry(type)) {
    const params = paramsAt(items, c, rel);
    return isNeutral(type, params) ? "" : (cssOf(type)?.(params) ?? "");
  }
  devWarn(`effect:${elementId}:${type}`, `effect "${type}" on "${elementId}" is not rendered by the browser player`);
  return "";
}

export type PostEffect =
  | { readonly type: "vignette"; readonly amount: number }
  | { readonly type: "grain"; readonly amount: number; readonly seed: number };

/** Vignette and grain, in order, with `amount` on 0..1; grain is seeded by the frame, so a frame always looks the same. */
export function postEffects(
  items: Items,
  children: readonly Placement[],
  frame: number,
  rel: number,
): PostEffect[] | undefined {
  const out: PostEffect[] = [];
  for (const c of children) {
    if (c.kind !== "effect" || c.props.enabled === false || effectEntry(c.props.type)?.draw.kind !== "post") continue;
    // The resolver fills `amount`; a plan built without it (tests) falls back on the schema's default.
    const given = paramsAt(items, c, rel).amount;
    const fallback = c.props.type === "grain" ? 0.2 : 0.5;
    const amount = Math.max(0, Math.min(1, typeof given === "number" ? given : fallback));
    if (amount <= 0) continue;
    if (c.props.type === "vignette") out.push({ type: "vignette", amount });
    else if (c.props.type === "grain") out.push({ type: "grain", amount, seed: frame });
  }
  return out.length ? out : undefined;
}
