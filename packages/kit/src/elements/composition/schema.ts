import { z } from "zod";

import { colorSchema, gradientSchema, idSchema } from "../../jsx/schemas/common";
import { themeSchema } from "../../theme/schema";

export const compositionSchema = z.strictObject({
  /** The video's name. */
  id: idSchema.default("composition"),
  /**
   * Frames per second: a number (`30`, `25`, `60`), an NTSC rate by name (`"29.97"`, `"23.976"`, `"59.94"`, which are
   * 30000/1001, 24000/1001 and 60000/1001), or an exact fraction `{ num, den }`. A rate must divide into whole ticks.
   */
  fps: z.union([
    z.number().positive().max(240),
    z.enum(["23.976", "29.97", "47.952", "59.94", "119.88"]),
    z.strictObject({ num: z.number().int().positive(), den: z.number().int().positive() }),
  ]),
  /** The frame's width in pixels. */
  width: z.number().int().min(16).max(8192),
  /** The frame's height in pixels. */
  height: z.number().int().min(16).max(8192),
  /** The soundtrack's samples per second. It must divide into whole ticks; 44100, 48000 and 96000 do. */
  sampleRate: z.number().int().min(8000).max(192000).default(48000),
  /** The soundtrack's channels: 1 is mono, 2 stereo. */
  channels: z.number().int().min(1).max(8).default(2),
  /** What shows where nothing covers the frame: a colour, a gradient, or (`blur`) the picture itself, blurred to fill. */
  background: z
    .strictObject({
      type: z.enum(["color", "blur", "gradient"]),
      color: colorSchema.optional(),
      gradient: gradientSchema.optional(),
    })
    .optional(),
  /** The video's look: palette, fonts, radius, motion style and element presets. Elements use it through `$tokens` and `style`. */
  theme: themeSchema.optional(),
  /**
   * A film camera's blur on everything that moves, in the export: each frame averages `samples` moments across the
   * time its shutter is open, `shutterAngle` degrees of the frame (180 is half the frame, the film default). Drawn by
   * the browser export, which a file with it uses on its own; the preview stays sharp.
   */
  motionBlur: z
    .strictObject({
      shutterAngle: z.number().min(1).max(360).default(180),
      samples: z.number().int().min(2).max(64).default(8),
    })
    .optional(),
});
