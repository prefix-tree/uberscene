// Effects and keys are props of the element they belong to: `effects={[…]}`, and a list of keys in place of a value.
// Every action here writes that prop on the element, so its undo is the prop as it was (`source/setProps`), and the
// fold rewrites one prop.

import {
  CAMERA_FIELDS,
  effectParamProblem,
  GENERATOR_TYPES,
  isGenerator,
  isLink,
  KINDS,
  type Kind,
  keyPathOf,
  keyPathsOf,
  kindsWhere,
  kindTakes,
  shaderFor,
  VIDEO_EFFECT_TYPES,
} from "@uberscene/kit/schema";

import type { Json } from "../../patches/types";
import { isKeyList } from "../../resolve/expand";
import type { ResolvedState } from "../../resolve/resolve";
import { T } from "../../time";
import { define, makePropHandler, onElement, rawNode, rawProp, readPath, writePath } from "../handler-kit";
import { invalid, type KeyJson, ok, type ValidationResult } from "../types";

/**
 * The one kind whose own values `path` is among (a shape's size, colours, outline and points), or undefined for a path
 * no kind or several kinds have, and for a camera's, whose keys run on the video's clock.
 */
function onlyOn(path: string): Kind | undefined {
  const kinds = kindsWhere((kind) => kind.keyPaths.some((k) => k.path === path && k.clock === "element"));
  return kinds.length === 1 ? kinds[0] : undefined;
}

/**
 * The paths a key list may sit at on a `kind`, besides an effect's params (`effects.<n>.<param>`): the kind's entries
 * in the key-path table, with the one path a list for both axes is written at, and `speed` where there is one.
 */
function keyPathsFor(kind: Kind): readonly string[] {
  const own = keyPathsOf(kind).flatMap((k) => (k.both ? [k.both, k.path] : [k.path]));
  return [...new Set([...own, ...(kindTakes(kind, "speed") ? ["speed"] : [])])];
}

const EFFECT_PARAM = /^effects\.(\d+)\.([A-Za-z_]\w*)$/;

/**
 * Why `path` of element `id` cannot be given keys or a generator when a link is written there (or, for one axis, at
 * both): the value is another element's, so its keys are changed there, or the link is replaced first.
 */
function linkProblem(state: ResolvedState, id: string, path: string): string | null {
  const props = rawNode(state, id)?.props;
  const both = /\.[xy]$/.test(path) ? readPath(props, path.slice(0, -2)) : undefined;
  const written = isLink(both) ? both : readPath(props, path);
  if (!isLink(written)) return null;
  return `"${path}" of "${id}" is a link to ${written.link}, so it has no keys of its own: change that value's keys, or write a number or keys here in place of the link`;
}

/** Why `path` cannot hold keys on element `id`, or null. */
function pathProblem(state: ResolvedState, id: string, path: string): string | null {
  const linked = linkProblem(state, id, path);
  if (linked) return linked;
  const fx = EFFECT_PARAM.exec(path);
  if (fx) {
    const effects = effectsOf(state, id);
    return Number(fx[1]) < effects.length ? null : `element "${id}" has no effect ${fx[1]}`;
  }
  const target = state.items.get(id);
  if (!target) return `element "${id}" does not exist`;
  const kind = target.kind;
  // A pushed camera's place and zoom are the push's to set.
  if (kind === "camera" && target.props.push && path !== "rotation" && path in CAMERA_FIELDS)
    return `the camera's push sets its ${path}: turn the push into keys with camera/bakePush, then change them`;
  const paths = keyPathsFor(kind);
  if (paths.includes(path)) return null;
  // A kind's own values (a shape's size, colours, outline and points) take keys on that kind only.
  const only = onlyOn(path);
  if (only !== undefined) return `"${path}" holds keys only on a ${only}; "${id}" is a ${kind}`;
  const effects = kindTakes(kind, "effects") ? ["effects.<n>.<param>"] : [];
  if (paths.length + effects.length === 0) return `"${path}" cannot hold keys: a ${kind} has nothing that does`;
  const use = [paths.join(", "), ...effects].filter((part) => part !== "").join(", or ");
  return `"${path}" cannot hold keys on a ${kind}; use one of ${use}`;
}

/** The keys at `path`: the list written there, or none when it holds a constant or nothing. */
/**
 * Where the keys of `path` are written: at the path, or, when a generator is written there, in what it is over (its
 * `base`, or a loop's `keys`). So keys under a wobble are added, moved and removed as any others.
 */
function keyPath(state: ResolvedState, id: string, path: string): string {
  const v = readPath(rawNode(state, id)?.props, path);
  return isGenerator(v) ? `${path}.${v.type === "loop" ? "keys" : "base"}` : path;
}

function keysAt(state: ResolvedState, id: string, path: string): KeyJson[] {
  const v = readPath(rawNode(state, id)?.props, keyPath(state, id, path));
  return isKeyList(v) ? (v as unknown as KeyJson[]).map((k) => ({ ...k })) : [];
}

/** Keys as a file writes them: sorted by time; none is nothing. A single key stays a key, so it keeps its time. */
export function canonicalKeys(keys: readonly KeyJson[]): Json | undefined {
  const sorted = [...keys].sort((a, b) => a.at - b.at);
  if (sorted.length === 0) return undefined;
  return sorted.map((k) => ({ at: k.at, value: k.value, ...(k.easing !== undefined ? { easing: k.easing } : {}) }));
}

function writeKeys(state: ResolvedState, id: string, path: string, keys: readonly KeyJson[]) {
  const { prop, value } = writePath(rawNode(state, id)?.props, keyPath(state, id, path), canonicalKeys(keys));
  return { [prop]: value };
}

/** The element's effects as written, each a `{ type, ...params }` object. */
function effectsOf(state: ResolvedState, id: string): Record<string, Json>[] {
  const v = rawProp(state, id, "effects");
  return Array.isArray(v) ? (v as Record<string, Json>[]).map((e) => ({ ...e })) : [];
}

const keyTargets = onElement({ when: (item) => !item.range.isEmpty() });

function insideElement(state: ResolvedState, id: string, at: number): ValidationResult {
  const item = state.items.get(id);
  return item && at >= 0 && T(at).isAtOrBefore(item.range.duration)
    ? ok
    : invalid({ code: "OUT_OF_BOUNDS", message: "a key's time must be inside the element", path: "at" });
}

function checkPath(state: ResolvedState, id: string, path: string): ValidationResult {
  const problem = pathProblem(state, id, path);
  return problem ? invalid({ code: "INVALID_PARAMS", message: problem, path: "path" }) : ok;
}

/** A value an effect's param or a shape's keyed value takes, when `path` is one. */
function checkValue(state: ResolvedState, id: string, path: string, value: Json | undefined): ValidationResult {
  const kind = state.items.get(id)?.kind;
  const check = kind === undefined ? undefined : keyPathOf(kind, path)?.check;
  if (check && value !== undefined) {
    const problem = check(value);
    return problem ? invalid({ code: "INVALID_PARAMS", message: problem, path: "value" }) : ok;
  }
  const fx = EFFECT_PARAM.exec(path);
  if (!fx || value === undefined) return ok;
  const effect = effectsOf(state, id)[Number(fx[1])];
  const problem = effectParamProblem(effect?.type, state.shaders, fx[2] as string, value);
  return problem ? invalid({ code: "INVALID_PARAMS", message: problem.message, path: "value" }) : ok;
}

const all = (...results: ValidationResult[]): ValidationResult => results.find((r) => !r.valid) ?? ok;

// ── keys ────────────────────────────────────────────────────────────────────

define(makePropHandler({
  type: "key/add",
  targets: keyTargets,
  write: (p, state) => {
    // A constant there becomes the first key, at 0, so the value before the new key is what it was.
    const written = readPath(rawNode(state, p.id)?.props, keyPath(state, p.id, p.path));
    const before: KeyJson[] =
      written !== undefined && !isKeyList(written) && p.at > 0 ? [{ at: 0, value: written as Json }] : [];
    const keys = [...before, ...keysAt(state, p.id, p.path)].filter((k) => Math.abs(k.at - p.at) > 1e-9);
    return writeKeys(state, p.id, p.path, [
      ...keys,
      { at: p.at, value: p.value, ...(p.easing !== undefined ? { easing: p.easing } : {}) },
    ]);
  },
  validate: (a, state) =>
    all(
      checkPath(state, a.params.id, a.params.path),
      insideElement(state, a.params.id, a.params.at),
      checkValue(state, a.params.id, a.params.path, a.params.value),
    ),
}));

/** The key of `path` at `at`, or an error naming the times there are. */
function requireKey(state: ResolvedState, id: string, path: string, at: number): ValidationResult {
  const keys = keysAt(state, id, path);
  return keys.some((k) => Math.abs(k.at - at) <= 1e-9)
    ? ok
    : invalid({
        code: "ELEMENT_NOT_FOUND",
        message: `"${id}" has no key at ${at} s on ${path}${keys.length ? ` (keys at ${keys.map((k) => k.at).join(", ")})` : ""}`,
        path: "at",
      });
}

define(makePropHandler({
  type: "key/update",
  targets: onElement({ when: (item, state) => hasKeys(state, item.id) }),
  write: (p, state) =>
    writeKeys(
      state,
      p.id,
      p.path,
      keysAt(state, p.id, p.path).map((k) =>
        Math.abs(k.at - p.at) <= 1e-9
          ? {
              ...k,
              ...("value" in p ? { value: p.value as Json } : {}),
              ...(p.easing !== undefined ? { easing: p.easing } : {}),
            }
          : k,
      ),
    ),
  validate: (a, state) =>
    all(
      requireKey(state, a.params.id, a.params.path, a.params.at),
      checkValue(state, a.params.id, a.params.path, a.params.value),
    ),
}));

define(makePropHandler({
  type: "key/move",
  targets: onElement({ onLocked: true, onOpaque: true, when: (item, state) => hasKeys(state, item.id) }),
  write: (p, state) =>
    writeKeys(
      state,
      p.id,
      p.path,
      keysAt(state, p.id, p.path)
        .filter((k) => Math.abs(k.at - p.to) > 1e-9 || Math.abs(k.at - p.at) <= 1e-9)
        .map((k) => (Math.abs(k.at - p.at) <= 1e-9 ? { ...k, at: p.to } : k)),
    ),
  validate: (a, state) =>
    all(requireKey(state, a.params.id, a.params.path, a.params.at), insideElement(state, a.params.id, a.params.to)),
}));

define(makePropHandler({
  type: "key/remove",
  targets: onElement({ when: (item, state) => hasKeys(state, item.id) }),
  write: (p, state) =>
    writeKeys(
      state,
      p.id,
      p.path,
      keysAt(state, p.id, p.path).filter((k) => Math.abs(k.at - p.at) > 1e-9),
    ),
  validate: (a, state) => requireKey(state, a.params.id, a.params.path, a.params.at),
}));

define(makePropHandler({
  type: "key/setAll",
  targets: keyTargets,
  write: (p, state) => writeKeys(state, p.id, p.path, p.keys),
  validate: (a, state) =>
    all(
      checkPath(state, a.params.id, a.params.path),
      ...a.params.keys.map((k) => insideElement(state, a.params.id, k.at)),
      ...a.params.keys.map((k) => checkValue(state, a.params.id, a.params.path, k.value)),
    ),
}));

/** Whether the element has any key: an item the resolver made from a key list. */
function hasKeys(state: ResolvedState, id: string): boolean {
  for (const item of state.items.values()) if (item.kind === "keyframe" && item.id.startsWith(`${id}.`)) return true;
  return false;
}

// ── effects ─────────────────────────────────────────────────────────────────

const hasEffects = (state: ResolvedState, id: string): boolean => effectsOf(state, id).length > 0;

function requireIndex(state: ResolvedState, id: string, index: number): ValidationResult {
  const n = effectsOf(state, id).length;
  return Number.isInteger(index) && index >= 0 && index < n
    ? ok
    : invalid({
        code: "ELEMENT_NOT_FOUND",
        message: `"${id}" has ${n} effect${n === 1 ? "" : "s"}; no index ${index}`,
        path: "index",
      });
}

define(makePropHandler({
  type: "effect/add",
  targets: onElement(),
  write: (p, state) => {
    const effects = effectsOf(state, p.id);
    effects.splice(Math.min(p.index ?? effects.length, effects.length), 0, { ...p.effect });
    return { effects };
  },
  validate: (a, state) => {
    const type = a.params.effect?.type;
    return typeof type === "string" &&
      ((VIDEO_EFFECT_TYPES as readonly string[]).includes(type) || shaderFor(state.shaders, "effect", type))
      ? ok
      : invalid({ code: "INVALID_PARAMS", message: `unknown effect type "${String(type)}"`, path: "effect.type" });
  },
}));

define(makePropHandler({
  type: "effect/remove",
  targets: onElement({ when: (item, state) => hasEffects(state, item.id) }),
  write: (p, state) => {
    const effects = effectsOf(state, p.id);
    effects.splice(p.index, 1);
    return { effects: effects.length > 0 ? effects : undefined };
  },
  validate: (a, state) => requireIndex(state, a.params.id, a.params.index),
}));

define(makePropHandler({
  type: "effect/update",
  targets: onElement({ when: (item, state) => hasEffects(state, item.id) }),
  write: (p, state) => {
    const effects = effectsOf(state, p.id);
    const merged: Record<string, Json> = { ...effects[p.index] };
    for (const [k, v] of Object.entries(p.params)) {
      if (v === null) delete merged[k];
      else merged[k] = v;
    }
    effects[p.index] = merged;
    return { effects };
  },
  validate: (a, state) =>
    all(
      requireIndex(state, a.params.id, a.params.index),
      ...Object.entries(a.params.params).map(([k, v]) =>
        v === null || isKeyList(v) ? ok : checkValue(state, a.params.id, `effects.${a.params.index}.${k}`, v),
      ),
    ),
}));

define(makePropHandler({
  type: "effect/toggle",
  targets: onElement({ when: (item, state) => hasEffects(state, item.id) }),
  write: (p, state) => {
    const effects = effectsOf(state, p.id);
    const { enabled: _, ...rest } = effects[p.index] ?? {};
    effects[p.index] = p.enabled ? rest : { ...rest, enabled: false };
    return { effects };
  },
  validate: (a, state) => requireIndex(state, a.params.id, a.params.index),
}));

define(makePropHandler({
  type: "effect/setOrder",
  targets: onElement({ when: (item, state) => effectsOf(state, item.id).length > 1 }),
  write: (p, state) => {
    const effects = effectsOf(state, p.id);
    return { effects: p.order.map((i) => effects[i] as Record<string, Json>) };
  },
  validate: (a, state) => {
    const n = effectsOf(state, a.params.id).length;
    const sorted = [...a.params.order].sort((x, y) => x - y);
    return sorted.length === n && sorted.every((v, i) => v === i)
      ? ok
      : invalid({
          code: "INVALID_PARAMS",
          message: `order must name each of the ${n} effects once, by index`,
          path: "order",
        });
  },
}));

define(makePropHandler({
  type: "effect/setStack",
  targets: onElement(),
  write: (p) => ({ effects: p.effects.length > 0 ? p.effects.map((e) => ({ ...e })) : undefined }),
}));

// ── holds ───────────────────────────────────────────────────────────────────

define(makePropHandler({
  type: "freeze/setAll",
  props: ["freezes"],
  write: (p) => ({
    freezes:
      p.freezes.length > 0
        ? p.freezes.map((f) => ({ start: f.start, duration: f.duration, source: f.source }))
        : undefined,
  }),
  validate: (a) =>
    a.params.freezes.every((f) => f.start >= 0 && f.duration > 0 && f.source >= 0)
      ? ok
      : invalid({
          code: "INVALID_PARAMS",
          message: "a hold has start ≥ 0, duration > 0 and source ≥ 0",
          path: "freezes",
        }),
}));

// ── generators ──────────────────────────────────────────────────────────────

/**
 * Paths a generator cannot be written at: `speed`, which the clock reads from keys alone, and each number a kind's
 * schema marks as taking keys or a link and no generator (a sound's level and its pan, which the mixer reads so).
 */
const NOT_GENERATED = new Set([
  "speed",
  ...KINDS.flatMap((kind) => keyPathsOf(kind))
    .filter((k) => k.numeric && !k.generated)
    .map((k) => k.path),
]);

define(makePropHandler({
  type: "generator/set",
  targets: keyTargets,
  write: (p, state) => {
    const props = rawNode(state, p.id)?.props;
    const written = readPath(props, p.path);
    // What the value is without a generator: what is written there, or what the generator there is over.
    const under = isGenerator(written) ? (written.type === "loop" ? written.keys : written.base) : written;
    if (p.generator === null) return one(writePath(props, p.path, under));
    const next =
      p.generator.type === "loop" || p.generator.base !== undefined || under === undefined
        ? p.generator
        : { ...p.generator, base: under };
    return one(writePath(props, p.path, next));
  },
  validate: (a, state) => {
    const g = a.params.generator;
    if (g !== null && !(GENERATOR_TYPES as readonly string[]).includes(g.type))
      return invalid({
        code: "INVALID_PARAMS",
        message: `"${String(g.type)}" is not a generator; use one of ${GENERATOR_TYPES.join(", ")}`,
        path: "generator",
      });
    if (NOT_GENERATED.has(a.params.path))
      return invalid({
        code: "INVALID_PARAMS",
        message: `${a.params.path} cannot be generated: it takes a number or keys`,
        path: "path",
      });
    const linked = linkProblem(state, a.params.id, a.params.path);
    if (linked) return invalid({ code: "INVALID_PARAMS", message: linked, path: "path" });
    // A camera's push sets keys on these paths; a generator goes on top of them, so the push does not refuse it.
    const camera = state.items.get(a.params.id);
    if (camera?.kind === "camera" && a.params.path in CAMERA_FIELDS) return ok;
    return checkPath(state, a.params.id, a.params.path);
  },
}));

const one = (w: { readonly prop: string; readonly value: Json | undefined }) => ({ [w.prop]: w.value });
