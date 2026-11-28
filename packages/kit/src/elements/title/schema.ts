import { z } from "zod";

import { zTextAnimationType } from "../../jsx/enums";
import {
  colorSchema,
  entranceProps,
  fontWeightSchema,
  idSchema,
  overlayProps,
  textShadowSchema,
  timedProps,
} from "../../jsx/schemas/common";
import { zTextAlign, zTextDecoration, zTextValign } from "../../jsx/schemas/enums-local";

const textAnimationSchema = z.strictObject({
  /** Which animation: `typewriter`, `fade`, a slide, `scale` or `wordByWord`. */
  type: zTextAnimationType,
  in: z.number().nonnegative().default(0.5),
  out: z.number().nonnegative().default(0.5),
  stagger: z.number().nonnegative().optional(),
});

/** How a title's letters look. Every field has a default, so `{}` is plain white Inter at 48 pixels. */
const titleLookSchema = z.strictObject({
  /** A theme title preset this look starts from; the fields written beside it win. */
  preset: idSchema.optional(),
  /** The font family: a bundled one, one the file declares, or one from the font catalogue. A theme preset may set it instead. */
  font: z.string().default("Inter"),
  /** The letters' size, in pixels. */
  size: z.number().min(1).max(1000).default(48),
  /** How heavy the letters are: 100 to 900, or `normal` and `bold`. */
  weight: fontWeightSchema.default("bold"),
  /** Slanted letters. */
  italic: z.boolean().default(false),
  /** The letters' colour, or a theme token such as `$text`. */
  color: colorSchema.default("#ffffff"),
  /** A colour filling the text box behind the letters. */
  background: colorSchema.optional(),
  /** An outline around the letters: its colour and thickness in pixels. */
  stroke: z.strictObject({ color: colorSchema, thickness: z.number().min(0).max(100) }).optional(),
  /** A drop shadow under the letters: colour, blur and offset in pixels. */
  shadow: textShadowSchema.optional(),
  /** Which side of the text box the lines sit against. */
  align: zTextAlign.default("center"),
  /** Where in the text box's height the text sits. */
  valign: zTextValign.default("middle"),
  /** The distance between lines, as a multiple of the letters' size. */
  lineHeight: z.number().min(0.1).max(10).default(1.2),
  /** Extra space between letters, in pixels. */
  letterSpacing: z.number().min(-100).max(100).default(0),
  /** A line under, over or through the letters. */
  decoration: zTextDecoration.optional(),
});

/** The fields a theme's title preset may hold: the look, without `preset` (a preset does not start from another). */
export const TITLE_LOOK_KEYS: readonly string[] = Object.keys(titleLookSchema.shape).filter((k) => k !== "preset");

export const titleSchema = z.strictObject({
  ...timedProps,
  ...overlayProps,
  ...entranceProps,
  /**
   * How the letters look: a theme title preset by name (`"h1"`), or an object of `font`, `size`, `weight`, `italic`,
   * `color`, `background`, `stroke`, `shadow`, `align`, `valign`, `lineHeight`, `letterSpacing` and `decoration`, with
   * `preset` naming the preset it starts from. Without a preset, the theme's `default` title preset applies. The text
   * box is the title's `box`: its `width` and `height`, the whole frame when left out, so background, align and valign
   * work inside it.
   */
  style: z
    .union([
      idSchema.transform((preset): { preset?: string | undefined } => ({ preset })).pipe(titleLookSchema),
      titleLookSchema,
    ])
    .prefault({}),
  /** An entrance and exit: its type, its seconds in and out, and for wordByWord the delay between words. */
  animation: textAnimationSchema.optional(),
});
