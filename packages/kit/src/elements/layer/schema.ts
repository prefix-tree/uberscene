import { z } from "zod";

import { zBlendMode } from "../../jsx/enums";
import { colorSchema, entranceProps, groundProp, placedProps, timedProps } from "../../jsx/schemas/common";

export const layerSchema = z.strictObject({
  ...timedProps,
  ...entranceProps,
  ...placedProps,
  /** How the layer mixes with what is under it, as CSS `mix-blend-mode` does. */
  blend: zBlendMode.optional(),
  ...groundProp,
});

const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

// biome-ignore-start lint/suspicious/noExplicitAny: the kit does not depend on three; its objects are any here so pasted three.js type-checks.
/** What `<Three setup>` gets once: the scene, its camera and renderer, and the three.js namespace. */
export interface ThreeSetupArgs {
  readonly scene: any;
  readonly camera: any;
  readonly renderer: any;
  readonly THREE: any;
  /** The canvas size in composition pixels. */
  readonly width: number;
  readonly height: number;
}
// biome-ignore-end lint/suspicious/noExplicitAny: end of the three.js setup types.

/** What the update `setup` returns gets on every frame: `time` is seconds since the layer started. */
export interface ThreeFrameArgs extends ThreeSetupArgs {
  readonly time: number;
  /** 0..1 through the layer. */
  readonly t: number;
  readonly duration: number;
  /** Seconds since the previous frame drawn; negative after a scrub back. Prefer `time`. */
  readonly delta: number;
}

type ThreeFrameUpdate = (frame: ThreeFrameArgs) => void;
// biome-ignore lint/suspicious/noConfusingVoidType: a setup may return nothing; `void` lets one without a return statement type-check.
type ThreeSetupResult = ThreeFrameUpdate | { update?: ThreeFrameUpdate; dispose?: () => void } | void;
export type ThreeSetupFunction = (setup: ThreeSetupArgs) => ThreeSetupResult;

/**
 * `<Three>`: a Layer that holds a three.js scene. `setup` takes `{ scene, camera, renderer, THREE, width, height }`
 * once and may return `update(frame)`, called on every frame with the layer's time; JSX children are React Three
 * Fiber. The camera and background are literal props, so the inspector edits them.
 */
export const threeSchema = layerSchema.extend({
  engine: z.literal("three"),
  /** The camera: `position` and `lookAt` as `[x, y, z]`, `fov` in degrees, clipping planes, zoom, or orthographic. */
  camera: z
    .strictObject({
      position: vec3Schema.optional(),
      lookAt: vec3Schema.optional(),
      fov: z.number().min(1).max(179).optional(),
      near: z.number().positive().optional(),
      far: z.number().positive().optional(),
      zoom: z.number().positive().optional(),
      orthographic: z.boolean().optional(),
    })
    .optional(),
  /** The scene's background colour; left out, transparent over what is beneath. */
  background: colorSchema.optional(),
  /** Builds the scene once from `{ scene, camera, renderer, THREE, width, height }`, and may return `update(frame)` for every frame. */
  setup: z.custom<ThreeSetupFunction>((v) => typeof v === "function", "setup must be a function").optional(),
});

/** One step of a Motion sequence: a selector inside the tag, its keyframes, and options (`duration`, `at`, `ease`…). */
const motionStepSchema = z.union([
  z.tuple([z.string(), z.record(z.string(), z.unknown())]),
  z.tuple([z.string(), z.record(z.string(), z.unknown()), z.record(z.string(), z.unknown())]),
]);

/** `<Motion>`: a Layer whose children are animated by a Motion sequence on the video's clock. */
export const motionSchema = layerSchema.extend({
  engine: z.literal("motion"),
  /** Motion steps: `[selector, keyframes, options]`, where `at` in the options is seconds into the layer. */
  sequence: z.array(motionStepSchema).default([]),
});
