import { z } from "zod";

import { zEasing, zKeyframeProperty, zVideoEffectType } from "../enums";
import { GENERATOR_TYPES } from "../generators";
import { idSchema, paramValue, vec2Schema } from "./common";
import { zMaskType } from "./enums-local";

const paramsSchema = z.record(z.string(), paramValue);

// The resolver's own items: what `expandKeys` makes of the `effects`, key lists, `speed` keys and `freezes` a file
// writes as props. They are not elements a file writes, so they carry no id of their own.

export const effectSchema = z.strictObject({
  type: z.union([zVideoEffectType, z.string().min(1)]),
  params: paramsSchema.default({}),
  enabled: z.boolean().default(true),
});

/** One key: a property of its element (`transform.opacity`, `box.x`, `audio.volume`), or a param of its effect. */
export const keyframeSchema = z
  .strictObject({
    property: zKeyframeProperty.optional(),
    param: z.string().optional(),
    at: z.number().nonnegative(),
    value: z.unknown(),
    easing: zEasing.default("linear"),
  })
  .refine((k) => (k.property === undefined) !== (k.param === undefined));

/**
 * A generator on a property of its element or a param of its effect: what a value written as `{ type: "wiggle", … }`
 * becomes. Its `base` and a loop's `keys` are keys beside it.
 */
export const generatorItemSchema = z
  .strictObject({
    property: zKeyframeProperty.optional(),
    param: z.string().optional(),
    type: z.enum(GENERATOR_TYPES),
    amount: z.number().optional(),
    frequency: z.number().positive().max(60).default(1),
    seed: z.number().int().optional(),
    speed: z.number().optional(),
    mode: z.enum(["repeat", "pingpong"]).default("repeat"),
    span: z.tuple([z.number(), z.number()]).optional(),
  })
  .refine((g) => (g.property === undefined) !== (g.param === undefined))
  .refine((g) => g.type !== "wiggle" || g.amount !== undefined, {
    message: "a wiggle needs an `amount`",
    path: ["amount"],
  })
  .refine((g) => g.type !== "drift" || g.speed !== undefined, { message: "a drift needs a `speed`", path: ["speed"] })
  .refine((g) => g.type !== "loop" || g.span !== undefined, {
    message: "a loop needs two `keys` or more",
    path: ["keys"],
  });

/** One key of a speed ramp: the rate reached at `at`. */
export const speedKeySchema = z.strictObject({
  at: z.number().nonnegative(),
  speed: z.number().min(0.1).max(20),
  easing: zEasing.default("linear"),
});

/** A hold: the source frame at `at` held from `start` seconds into the element. */
export const freezeSchema = z.strictObject({
  at: z.number().nonnegative(),
  start: z.number().nonnegative(),
  duration: z.number().positive(),
});

const bezierPathSchema = z.strictObject({
  points: z
    .array(
      z.strictObject({
        x: z.number(),
        y: z.number(),
        handleIn: vec2Schema.optional(),
        handleOut: vec2Schema.optional(),
      }),
    )
    .min(2),
  closed: z.boolean().default(true),
});

export const maskSchema = z.strictObject({
  /** The mask's name. */
  id: idSchema,
  /** `shape` for a rectangle, ellipse or polygon; `drawn` for a bezier `path`. */
  type: zMaskType.default("shape"),
  /** The region it shows: `{ rect }`, `{ ellipse }` or `{ polygon }`, in the clip's pixels. */
  shape: z
    .union([
      z.strictObject({
        rect: z.strictObject({
          x: z.number(),
          y: z.number(),
          width: z.number().positive(),
          height: z.number().positive(),
          cornerRadius: z.number().nonnegative().optional(),
        }),
      }),
      z.strictObject({
        ellipse: z.strictObject({
          cx: z.number(),
          cy: z.number(),
          rx: z.number().positive(),
          ry: z.number().positive(),
        }),
      }),
      z.strictObject({ polygon: z.array(vec2Schema).min(3) }),
    ])
    .optional(),
  /** A drawn mask's outline: bezier points with handles, closed or open. */
  path: bezierPathSchema.optional(),
  /** Softens the mask's edge, in pixels. */
  feather: z.number().min(0).max(100).default(0),
  /** Shows everything outside the region instead of inside. */
  inverted: z.boolean().default(false),
  /** How much the mask hides: 1 hides fully outside the region, 0 not at all. */
  opacity: z.number().min(0).max(1).default(1),
});
