import { z } from "zod";

import { themeSchema } from "../../theme/schema";
import { zEasing, zTrackLayout, zTrackRole } from "../enums";
import { ref } from "../ref-sites";
import { animatable, colorSchema, gradientSchema, idSchema } from "./common";

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

export const trackSchema = z.strictObject({
  /** The track's name in the file; ducking and actions refer to it by this. */
  id: idSchema,
  /** `sequence` plays its children back to back; `free` places each at its own `start` or anchor. */
  layout: zTrackLayout.default("sequence"),
  /** A label for the editor's track header. */
  name: z.string().optional(),
  /** What the track holds; a `duck` with `under: "dialogue"` turns sound down under every track of that role. */
  role: zTrackRole.default("general"),
  /** The editor will not change it. */
  locked: z.boolean().default(false),
  /** Not drawn and not heard. */
  hidden: z.boolean().default(false),
  /** Drawn but not heard. */
  muted: z.boolean().default(false),
  /** When any track is solo, only solo tracks are heard. */
  solo: z.boolean().default(false),
  /** Tracks with the same group move together in the editor. */
  group: idSchema.optional(),
});

/**
 * `<Camera>`: one view over the tracks written inside it. Every element on those tracks moves, scales and turns
 * together; tracks outside it stay fixed to the screen, and file order still says what draws over what. A key's
 * `at` is seconds from the start of the video.
 */
// A camera's values are named `camera.<field>`, stay written as a number when keyed, and run on the video's clock.
const view = <S extends z.ZodType>(value: S) =>
  animatable(value, { group: "camera", constant: "first", clock: "video" });

export const cameraSchema = z.strictObject({
  /** The camera's name in the file; actions refer to it by this. */
  id: idSchema,
  /** How far the view has moved right, in pixels: at 180 everything under the camera sits 180 px to the left. */
  x: view(z.number()).default(0),
  /** How far the view has moved down, in pixels: at 100 everything under the camera sits 100 px higher. */
  y: view(z.number()).default(0),
  /** How close the view is, about the frame's centre: 1 is as written, 2 shows everything twice the size. */
  zoom: view(z.number().min(0.01).max(100)).default(1),
  /** How far the view is turned clockwise, in degrees, about the frame's centre: what it shows turns the other way. */
  rotation: view(z.number()).default(0),
  /**
   * Lets the camera make room: as each element in `on` starts, the view moves as little as it can so that element is
   * in view with everything else on the camera's tracks that is on screen then. It pans the shortest way, and pulls back only when all of it
   * cannot fit. With `push`, `x`, `y` and `zoom` are where the view starts, as numbers; `camera/bakePush` turns the
   * moves into keys to change by hand.
   */
  push: z
    .strictObject({
      /** The elements to make room for, on the camera's tracks, each as it starts. */
      on: z.array(ref("push", idSchema)).min(1),
      /**
       * The only elements that must stay in view, a speaker for one, with those in `on`. Left out, everything on the
       * camera's tracks that is on screen at the moment stays in view.
       */
      keep: z.array(ref("push", idSchema)).optional(),
      /** How far inside the frame's edge everything sits, in pixels. Left out, a twentieth of the frame's shorter side. */
      margin: z.number().min(0).optional(),
      /** How long each move takes, in seconds, from the moment its element starts. */
      duration: z.number().positive().default(0.3),
      /** How each move goes. */
      easing: zEasing.default("snappy"),
    })
    .optional(),
});

export const markerSchema = z.strictObject({
  /** The marker's name: `marker:<id>` refers to it as a time. */
  id: idSchema,
  /** Seconds from the start of the video. */
  start: z.number().nonnegative(),
  /** Text shown on the editor's ruler. */
  label: z.string().default(""),
  /** Its colour on the ruler. */
  color: colorSchema.optional(),
});
