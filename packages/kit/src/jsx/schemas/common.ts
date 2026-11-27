import { z } from "zod";

import { zBlendMode, zEasing, zEntranceAnimation, zFitMode, zVideoEffectType } from "../enums";

const ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const TIME_REF_PATTERN = /^(word|shot|silence|beat):\d+(\.end)?$|^marker:[A-Za-z_][A-Za-z0-9_-]*$/;
const ASSET_REF_PATTERN = /^asset:[A-Za-z0-9_.-]+$/;

export const idSchema = z.string().regex(ID_PATTERN, "ids are identifiers: letters, digits, _ and -");
export const assetRefSchema = z.string().regex(ASSET_REF_PATTERN, 'asset references look like "asset:ID"');
export const colorSchema = z.string().min(1);
/** How heavy letters are: 100 to 900, or `normal` and `bold`. */
export const fontWeightSchema = z.union([
  z.number().int().min(100).max(900).multipleOf(100),
  z.enum(["normal", "bold"]),
]);
/**
 * A length a theme can supply: pixels, or a token such as `$radius`. The
 * resolver replaces tokens before parsing; one it cannot resolve is reported
 * there and reads as 0.
 */
export const themedLengthSchema = z
  .union([z.number().nonnegative(), z.string().regex(/^\$[A-Za-z][A-Za-z0-9_-]*$/, 'theme tokens look like "$radius"')])
  .transform((v) => (typeof v === "number" ? v : 0));

export const timeRefSchema = z.union([
  z.number().nonnegative(),
  z
    .string()
    .regex(
      TIME_REF_PATTERN,
      'time references look like "word:12", "shot:4.end", "silence:2", "beat:16" or "marker:ID"',
    ),
]);

/** A word, shot, silence or beat of an element's source, as `at` names it on an anchor or a duration's `until`. */
const momentSchema = z
  .string()
  .regex(
    /^(word|shot|silence|beat):\d+(\.end)?$/,
    'at looks like "word:12", "word:12.end", "shot:3", "silence:1" or "beat:16"',
  );

const durationSchema = z.union([
  z.number().positive(),
  z.literal("fill"),
  z.literal("source"),
  z.strictObject({ match: idSchema }),
  /**
   * Lasts until the element named ends, wherever this one starts; with `at`, until that element plays a word, shot,
   * silence or beat of its source (`{ until: "talk", at: "word:54.end" }`), which follows it when the cut changes.
   */
  z.strictObject({ until: idSchema, at: momentSchema.optional() }),
]);

/** Props shared by everything that occupies time on a track. */
export const timedProps = {
  /** The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. */
  id: idSchema,
  /** Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. */
  start: z.number().nonnegative().optional(),
  /** Overlays: start relative to another element's start, or to its end with `id.end`. */
  anchor: z
    .union([
      z.literal("start"),
      z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*(\.end)?$/, 'anchors look like "hook", "hook.end" or "start"'),
    ])
    .optional(),
  /** With `anchor`: a word, shot, silence or beat of the anchor's source (`word:14655`, `beat:16`); the start is where the anchor plays it, plus `offset`. */
  at: momentSchema.optional(),
  /** Seconds added to the start that `anchor` and `at` give; negative starts earlier. */
  offset: z.number().optional(),
  /**
   * How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the
   * composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends,
   * or `{ until: id, at: "word:54.end" }` when it plays that word, shot, silence or beat of its source.
   */
  duration: durationSchema.optional(),
};

export const vec2Schema = z.strictObject({ x: z.number(), y: z.number() });

/**
 * One key of a value that changes over time: `value` at `at` seconds into the element. `easing` says how the value
 * moves from this key to the next one; the last key's is not used.
 */
const keySchema = <S extends z.ZodType>(value: S) =>
  z.strictObject({ at: z.number().nonnegative(), value, easing: zEasing.optional() });

/** Keys over time, in place of a constant. */
const keysSchema = <S extends z.ZodType>(value: S) => z.array(keySchema(value)).min(1);

/**
 * A value written as a constant, or as a list of keys when it changes over time. The resolver takes the keys out
 * before it parses the props (`expandKeys` in the SDK), so a parsed prop holds the constant, or nothing. For a value
 * that bends time and cannot be generated (`speed`).
 */
export const keyed = <S extends z.ZodType>(value: S) =>
  z.union([value, keysSchema(value)]).transform((v) => v as z.output<S>);

/** One key of a value, as a generator's `base` or a loop's `keys` hold it. */
export interface KeyOf<V> {
  at: number;
  value: V;
  easing?: z.infer<typeof zEasing> | undefined;
}

/**
 * A generator written in place of a value of type `V`: a `wiggle` or a `drift` added to a `base` (a value or keys),
 * or a `loop` of keys.
 */
export type GeneratorOf<V> =
  | {
      type: "wiggle";
      base?: V | KeyOf<V>[] | undefined;
      amount: number;
      frequency?: number | undefined;
      seed?: number | undefined;
    }
  | { type: "drift"; base?: V | KeyOf<V>[] | undefined; speed: number }
  | { type: "loop"; keys: KeyOf<V>[]; mode?: "repeat" | "pingpong" | undefined };

/**
 * Motion that is computed, in place of a value: a wobble or a steady drift added to the value (`base`: a number or
 * keys; left out, what the value is anyway), or a key list played again and again.
 */
const generatorSchema = <S extends z.ZodType>(value: S): z.ZodType<GeneratorOf<z.output<S>>, GeneratorOf<z.input<S>>> =>
  // Named, so a declaration file writes `GeneratorOf<number>` on each animatable prop and not the union in full:
  // spelled out on every one, the element table's type is longer than the compiler will write.
  z.discriminatedUnion("type", [
    z.strictObject({
      type: z.literal("wiggle"),
      /** What the wobble is added to: a number or keys. Left out, the value's default. */
      base: z.union([value, keysSchema(value)]).optional(),
      /** The most it adds or takes away, in the value's own units: degrees for a rotation, pixels for `box.x`. */
      amount: z.number(),
      /** Wobbles a second. */
      frequency: z.number().positive().max(60).default(1),
      /** Which wobble: the same seed gives the same one. Left out, each element and prop gets its own. */
      seed: z.number().int().optional(),
    }),
    z.strictObject({
      type: z.literal("drift"),
      /** What the drift is added to: a number or keys. Left out, the value's default. */
      base: z.union([value, keysSchema(value)]).optional(),
      /** How much it adds each second, from the element's start, in the value's own units. */
      speed: z.number(),
    }),
    z.strictObject({
      type: z.literal("loop"),
      /** The keys to play again and again: from the first key's time to the last's. */
      keys: z.array(keySchema(value)).min(2),
      /** `repeat` starts over at the end; `pingpong` plays back and forth. */
      mode: z.enum(["repeat", "pingpong"]).default("repeat"),
    }),
  ]) as unknown as z.ZodType<GeneratorOf<z.output<S>>, GeneratorOf<z.input<S>>>;

/**
 * A value written as a constant, as a list of keys when it changes over time, or as a generator when it is computed
 * (`{ type: "wiggle", amount: 2 }`). The resolver takes keys and generators out before it parses the props
 * (`expandKeys` in the SDK), so a parsed prop holds the constant, or nothing.
 */
export const animatable = <S extends z.ZodType>(value: S) =>
  z.union([value, keysSchema(value), generatorSchema(value)]).transform((v) => v as z.output<S>);

/** Which point of an element's box `box.x` and `box.y` place: a corner, the middle of an edge, or the centre. */
export const BOX_ORIGINS = [
  "topLeft",
  "top",
  "topRight",
  "left",
  "center",
  "right",
  "bottomLeft",
  "bottom",
  "bottomRight",
] as const;
export type BoxOrigin = (typeof BOX_ORIGINS)[number];

/** Each origin as fractions of the element's width and height from its top left. */
export const BOX_ORIGIN_POINT: Readonly<Record<BoxOrigin, { readonly x: number; readonly y: number }>> = {
  topLeft: { x: 0, y: 0 },
  top: { x: 0.5, y: 0 },
  topRight: { x: 1, y: 0 },
  left: { x: 0, y: 0.5 },
  center: { x: 0.5, y: 0.5 },
  right: { x: 1, y: 0.5 },
  bottomLeft: { x: 0, y: 1 },
  bottom: { x: 0.5, y: 1 },
  bottomRight: { x: 1, y: 1 },
};

export const boxSchema = z.strictObject({
  /** Pixels from the frame's left edge to the box's `origin`, or keys to move it. Left out: centred across the frame. */
  x: animatable(z.number()).optional(),
  /** Pixels from the frame's top edge to the box's `origin`, or keys to move it. Left out: centred down the frame. */
  y: animatable(z.number()).optional(),
  /**
   * The box's width in pixels; its content fills it as `fit` says. Left out: the width its content takes in the frame
   * (from `height` and the content's shape when only that is given).
   */
  width: z.number().positive().optional(),
  /** The box's height in pixels, as `width`. */
  height: z.number().positive().optional(),
  /** Which point of the box sits at `x`, `y`. Left out: its top left. */
  origin: z.enum(BOX_ORIGINS).optional(),
});
export type ElementBox = z.output<typeof boxSchema>;

const boxProp = {
  /**
   * The rectangle it occupies, in pixels from the frame's top left as in CSS: `x` and `y` place the point `origin`
   * names (its top left by default), `width` and `height` size it, and its content fills it as `fit` says. Left out,
   * the whole frame. `transform` applies after.
   */
  box: boxSchema.optional(),
};

const scaleValue = z.number().min(0).max(10);
const fraction = z.number().min(0).max(1);

const transformSchema = z.strictObject({
  /**
   * A multiplier, the same on both axes or `{ x, y }`; keys on either animate it. One list of keys moves both axes,
   * each key's value a number for both or `{ x, y }` for each its own (squash and stretch).
   */
  scale: z
    .union([
      animatable(scaleValue),
      keysSchema(z.strictObject({ x: scaleValue, y: scaleValue })).transform((v) => v as unknown as number),
      z.strictObject({ x: animatable(scaleValue), y: animatable(scaleValue) }),
    ])
    .optional(),
  /** Degrees, clockwise. */
  rotation: animatable(z.number().min(-360).max(360)).optional(),
  /** The point it scales and rotates around, as fractions of its own box; left out, its centre `{ x: 0.5, y: 0.5 }`. */
  anchor: z.strictObject({ x: animatable(z.number()), y: animatable(z.number()) }).optional(),
  /** 0 is invisible, 1 opaque. */
  opacity: animatable(fraction).optional(),
  /** Rounded corners, in pixels or a theme token such as `$radius`. */
  borderRadius: animatable(themedLengthSchema).optional(),
  /** The part of the source to show, as fractions of its width and height from the top left; a field left out is the whole. */
  crop: z
    .strictObject({
      x: animatable(fraction).default(0),
      y: animatable(fraction).default(0),
      width: animatable(fraction).default(1),
      height: animatable(fraction).default(1),
    })
    .optional(),
});

/** What an effect's param may be: a number, text, a switch, a list of numbers or points, or named numbers. */
export const paramValue = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.array(z.number()),
  // A list of points, as `curves` takes.
  z.array(z.array(z.number())),
  z.record(z.string(), z.number()),
]);

/**
 * One effect: its `type`, a built-in or one the file declares with `effect()`, then its params by name, each a
 * constant or keys over time. Off (`enabled: false`), it draws nothing and stays in the file.
 */
const effectSpecSchema = z
  .object({
    type: z.union([zVideoEffectType, z.string().min(1), z.custom<object>((v) => typeof v === "object" && v !== null)]),
    enabled: z.boolean().optional(),
  })
  .catchall(z.union([paramValue, keysSchema(z.unknown())]));

const effectsProp = {
  /** Effects drawn on it, in order: each `{ type, ...params }`, a param written as keys to animate it. */
  effects: z.array(effectSpecSchema).optional(),
};

const transformProp = {
  ...boxProp,
  /** How it is turned and shown: scale, rotation, anchor, opacity, rounded corners and crop. */
  transform: transformSchema.optional(),
};

const blendProp = {
  /** How it mixes with what is under it, as CSS `mix-blend-mode` does. */
  blend: zBlendMode.optional(),
};

/** How a picture with a size of its own fills the frame: footage, a nested sequence, an SVG. */
export const fitProp = {
  /** How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. */
  fit: zFitMode.optional(),
};

const followProp = {
  /**
   * Another overlay's id: this one moves with it. Its `box` is then read in that element's box (pixels from its top
   * left, centred in it when `x` or `y` is left out), and that element's transform, entrance and exit carry it, up
   * the chain. Its opacity, crop and corners stay its own.
   */
  follow: idSchema.optional(),
};

/** What everything drawn over the picture takes: where it sits, how it mixes with what is under it, its effects. */
export const overlayProps = { ...transformProp, ...followProp, ...blendProp, ...effectsProp };

/** For graphics other things sit on. */
export const groundProp = {
  /**
   * A ground that other things sit on: a card under a cut-out speaker, a wall behind a game, a scrim that darkens
   * footage under a title. The layout check treats it like a background: it is not held to the safe zone and is not
   * said to cover the captions.
   */
  ground: z.boolean().optional(),
};

/** Where an element sits and how it is turned, with its effects, without `fit` or blending: a layer's. */
export const placedProps = { ...transformProp, ...followProp, ...effectsProp };

/** An adjustment's effects: drawn over everything beneath it. */
export const adjustmentEffectsProp = effectsProp;

/** Footage and nested sequences: drawn on the canvas, fitted to the frame, with a strength for their blend. */
export const visualProps = {
  ...transformProp,
  ...fitProp,
  ...blendProp,
  ...effectsProp,
  /** How strongly it blends: multiplied into its opacity. */
  blendOpacity: z.number().min(0).max(1).optional(),
};

/** A gain: 1 plays the source as it is, 0 mutes it, 2 is twice as loud; keys change it over time. */
export const volumeSchema = keyed(z.number().min(0).max(4));

export const audioProps = {
  /** A gain: 1 plays the source as it is, 0 mutes it, 2 is twice as loud; keys change it over time. */
  volume: volumeSchema.optional(),
  /** Where it sits between the speakers, from -1 (left) to 1 (right); keys move it. */
  pan: keyed(z.number().min(-1).max(1)).optional(),
  /** Seconds the sound fades in at the start and out at the end. */
  fade: z
    .strictObject({ in: z.number().nonnegative().optional(), out: z.number().nonnegative().optional() })
    .optional(),
  /**
   * Turns this sound down while another plays: `under` is a track id or a track role (`dialogue`), `to` the volume
   * it falls to, `attack` and `release` the seconds it takes to fall and recover.
   */
  duck: z
    .strictObject({
      under: idSchema,
      to: z.number().min(0).max(1),
      attack: z.number().nonnegative().optional(),
      release: z.number().nonnegative().optional(),
    })
    .optional(),
};

export const shadowSchema = z.strictObject({
  color: colorSchema,
  blur: z.number().nonnegative().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  spread: z.number().optional(),
  inset: z.boolean().optional(),
});

/** A shadow under letters: text has no spread and no inner shadow. */
export const textShadowSchema = z.strictObject({
  color: colorSchema,
  blur: z.number().nonnegative().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export const gradientSchema = z.strictObject({
  type: z.enum(["linear", "radial", "conic"]),
  angle: z.number().optional(),
  center: vec2Schema.optional(),
  stops: z
    .array(
      z.strictObject({
        offset: z.number().min(0).max(1),
        color: colorSchema,
        opacity: z.number().min(0).max(1).optional(),
      }),
    )
    .min(2),
});

export type Transform = z.output<typeof transformSchema>;

/** An entrance or an exit: what plays over `duration` seconds at the start or the end of an element. */
export const graphicAnimationSchema = z.strictObject({
  type: zEntranceAnimation,
  duration: z.number().positive().default(0.5),
  easing: zEasing.default("easeOut"),
});

export const entranceProps = {
  /** How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. */
  enter: graphicAnimationSchema.optional(),
  /** How it goes out, over its last seconds, as `enter`. */
  exit: graphicAnimationSchema.optional(),
};
