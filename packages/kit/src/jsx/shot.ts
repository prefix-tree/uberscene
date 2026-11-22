// A 3D shot: a three.js scene built once by code, sampled at a time the host gives, and placed by literal data the
// editor can write. The module that defines it says which objects exist and which inputs it reads, so the resolver
// can check a file's data without running three.js (the kit does not depend on it).

/** The transform channels a shot object has. Positions are metres, y up; rotations are degrees about x, y, z. */
export const SHOT_CHANNELS = ["position", "rotation", "scale"] as const;
export type ShotChannel = (typeof SHOT_CHANNELS)[number];

/** What a shot declares about one object. */
export interface ShotObjectSpec {
  /**
   * Channels the module's `sample` sets from the time and the inputs. The file may not write them and the editor does
   * not drag them, since the next frame would overwrite the value; expose an input instead.
   */
  readonly computes?: readonly ShotChannel[];
}

/** An input's default: a number, a flag or a word. A file may write a number input as keys, or as `"marker:ID"`. */
export type ShotInputDefault = number | boolean | string;

// biome-ignore-start lint/suspicious/noExplicitAny: the kit does not depend on three; its objects are any here.
/** What `build` gets, once. */
export interface ShotBuildArgs {
  readonly THREE: any;
  readonly scene: any;
  readonly camera: any;
}

/** What `sample` gets on every frame: the inputs at this time, and the objects `build` returned. */
export interface ShotSampleArgs {
  readonly THREE: any;
  readonly camera: any;
  readonly objects: Readonly<Record<string, any>>;
  /** Each input's value at this time: numbers written as keys are read on the curve, markers are seconds. */
  readonly inputs: Readonly<Record<string, ShotInputDefault>>;
}

/** What `build` returns: the declared objects by id, and how to set what the module computes at a time. */
export interface ShotBuilt {
  readonly objects: Readonly<Record<string, any>>;
  /** Sets what the module computes at `seconds` of shot time. It must read only its arguments, never the frame before. */
  readonly sample?: (seconds: number, args: ShotSampleArgs) => void;
  readonly dispose?: () => void;
}
// biome-ignore-end lint/suspicious/noExplicitAny: end of the three.js types.

export interface ShotDefinition {
  readonly kind: "shot";
  /** Every object the file may place, by id. */
  readonly objects: Readonly<Record<string, ShotObjectSpec>>;
  /** Every input the module reads, with its default. */
  readonly inputs: Readonly<Record<string, ShotInputDefault>>;
  /** How long the shot's own time runs, in seconds; past it the last pose holds. */
  readonly length?: number;
  readonly build: (args: ShotBuildArgs) => ShotBuilt;
}

/**
 * Defines a 3D shot for `<Three shot>`. `build` makes the scene once and returns its objects by id; `sample` sets what
 * the module computes at a time. Where the objects stand, their keys and the inputs' values are the file's, written
 * on the `<Three>` tag, so the editor can change them:
 *
 * ```js
 * export default defineShot({
 *   objects: { table: {}, walker: {} },
 *   inputs: { stride: 0.7 },
 *   build: ({ THREE, scene }) => { ...; return { objects: { table, walker }, sample: (t, { inputs }) => {} } },
 * });
 * ```
 */
export function defineShot(
  spec: Omit<ShotDefinition, "kind" | "inputs"> & { readonly inputs?: ShotDefinition["inputs"] },
): ShotDefinition {
  for (const id of Object.keys(spec.objects))
    if (id === "camera") throw new Error('defineShot: "camera" is the <Three camera> prop, not an object');
  return { kind: "shot", inputs: {}, ...spec };
}

/** Whether a value is a shot `defineShot` made. */
export function isShot(value: unknown): value is ShotDefinition {
  return typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === "shot";
}
