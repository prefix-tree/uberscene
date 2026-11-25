// A 3D scene is a media source whose frames are computed: a plain JavaScript module that a clip plays like footage,
// `<Clip src={crossing} />`. The module builds a three.js scene once and stages it with plain data, so the timeline
// needs no 3D vocabulary and the editor's viewport rewrites one literal in one file. The kit does not depend on
// three.js: it knows the module's shape and evaluates its staging, which is plain numbers.

import { type CurveKey, curveAt } from "../easing";

/** One staged value: a constant, or keys over scene time. A key's `at` may name a time the clip hands in (`times`). */
export type StageValue = unknown;

/** What a scene stages: objects by name, each a set of channels; `camera` is the camera. */
export type Stage = Readonly<Record<string, Readonly<Record<string, StageValue>>>>;

// biome-ignore-start lint/suspicious/noExplicitAny: the kit does not depend on three; its objects are any here.
/** What `build` gets, once. */
export interface SceneBuildArgs {
  readonly THREE: any;
  readonly scene: any;
  readonly camera: any;
  /** The frame's size in pixels. */
  readonly width: number;
  readonly height: number;
}

/** What `sample` gets on every frame. */
export interface SceneSampleArgs {
  readonly THREE: any;
  readonly camera: any;
  /** What `build` returned. */
  readonly objects: Readonly<Record<string, any>>;
  /** The stage at this time, evaluated: each object's channels as plain values. */
  readonly stage: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** The named times the clip handed in, in scene seconds. */
  readonly times: Readonly<Record<string, number>>;
}
// biome-ignore-end lint/suspicious/noExplicitAny: end of the three.js types.

/**
 * A scene module's exports. `length` is its own time in seconds; `stage` is where things stand and how they move;
 * `build` makes the three.js objects once and returns the ones `stage` names; `sample`, when there is one, sets what
 * the module computes at a time (a walk cycle, say) from its arguments only, never from the frame before.
 */
export interface Scene {
  readonly length: number;
  readonly stage: Stage;
  // biome-ignore lint/suspicious/noExplicitAny: three.js objects, by name.
  readonly build: (args: SceneBuildArgs) => Readonly<Record<string, any>>;
  readonly sample?: (seconds: number, args: SceneSampleArgs) => void;
}

/** Whether a value is a scene module: what `import * as crossing from "./crossing.scene.js"` gives. */
export function isScene(value: unknown): value is Scene {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<Scene>;
  return typeof v.length === "number" && typeof v.build === "function" && typeof v.stage === "object";
}

interface StageKey {
  readonly at: number | string;
  readonly value: unknown;
  readonly easing?: string;
}

/** Whether a staged value is a list of keys. */
function isStageKeys(v: unknown): v is readonly StageKey[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((k) => typeof k === "object" && k !== null && !Array.isArray(k) && "at" in k && "value" in k)
  );
}

/** A key's time in scene seconds: its number, or the named time the clip handed in (NaN when it handed in none). */
function keyTime(at: number | string, times: Readonly<Record<string, number>>): number {
  return typeof at === "number" ? at : (times[at] ?? Number.NaN);
}

/** The value of one staged channel at scene time `t`: a constant as it is, keys on their curve. */
export function stageValueAt(v: StageValue, t: number, times: Readonly<Record<string, number>> = {}): unknown {
  if (!isStageKeys(v)) return v;
  const keys: CurveKey[] = v
    .map((k) => ({ at: keyTime(k.at, times), value: k.value, easing: k.easing }))
    .filter((k) => Number.isFinite(k.at))
    .sort((a, b) => a.at - b.at);
  return curveAt(keys, t);
}

/** The whole stage at scene time `t`, every channel evaluated. */
export function stageAt(
  stage: Stage,
  t: number,
  times: Readonly<Record<string, number>> = {},
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [name, channels] of Object.entries(stage)) {
    const now: Record<string, unknown> = {};
    for (const [channel, value] of Object.entries(channels)) now[channel] = stageValueAt(value, t, times);
    out[name] = now;
  }
  return out;
}

/** The names a stage's keys use for their times, so a resolver can say which ones a clip does not hand in. */
export function stageTimeNames(stage: Stage): string[] {
  const names = new Set<string>();
  for (const channels of Object.values(stage))
    for (const value of Object.values(channels))
      if (isStageKeys(value)) for (const k of value) if (typeof k.at === "string") names.add(k.at);
  return [...names];
}

/**
 * The vertical field of view, in degrees, of a lens of `focal` millimetres on a full-frame sensor (24 mm tall): what
 * a camera's `lens` channel means.
 */
export function lensFov(focal: number): number {
  return (2 * Math.atan(24 / (2 * focal)) * 180) / Math.PI;
}
