import { z } from "zod";

import { isScene, type Scene } from "../scene3d";
import { animatable, assetRefSchema, audioProps, timedProps, timeRefSchema, visualProps } from "./common";

/** A hold: the source frame at `source` seconds stays on screen from `start` seconds into the element for `duration`. */
const freezeSpecSchema = z.strictObject({
  /** Seconds into the element where the hold starts. */
  start: z.number().nonnegative(),
  /** Seconds the frame is held before it plays on. */
  duration: z.number().positive(),
  /** The source time of the frame held. */
  source: z.number().nonnegative(),
});

const sourceProps = {
  /** The media, as `asset:<id>` from the manifest. */
  src: assetRefSchema,
  /** Where in the source it starts: seconds, or a word, shot, silence or beat of the source (`word:12`, `beat:16`). */
  in: timeRefSchema.optional(),
  /** Where in the source it ends, as `in`; `word:40.end` ends after the word is said. */
  out: timeRefSchema.optional(),
  /** Playback rate: 2 plays twice as fast and half as long; keys ramp it. */
  speed: animatable(z.number().min(0.1).max(20)).default(1),
  /** Frames held on screen while the clip's time stands still. */
  freezes: z.array(freezeSpecSchema).optional(),
  /** Plays the trimmed source backwards. */
  reverse: z.boolean().default(false),
};

/** A moment of the edit handed into a scene: seconds of the video, or `"marker:ID"`. */
const editTimeSchema = z.union([
  z.number().nonnegative(),
  z.string().regex(/^marker:[A-Za-z_][A-Za-z0-9_-]*$/, 'times look like 4.2 or "marker:reveal"'),
]);

export const clipSchema = z.strictObject({
  ...timedProps,
  ...sourceProps,
  /**
   * The media, as `asset:<id>` from the manifest, or a 3D scene module (`import * as crossing from
   * "./crossing.scene.js"`), which plays like footage: `in`, `out`, `speed` and trims are in the scene's own seconds.
   */
  src: z.union([assetRefSchema, z.custom<Scene>(isScene, "a scene exports length, stage and build")]),
  /**
   * With a scene: moments of the edit handed into it by name, which its keys may use for `at`. `{ reveal:
   * "marker:reveal" }` puts the scene's `reveal` where the marker is, wherever the clip or the marker moves.
   */
  times: z.record(z.string(), editTimeSchema).optional(),
  ...visualProps,
  ...audioProps,
  /** Reframe to the composition's aspect: the resolver writes `transform.crop` from the source size and this focus, unless a crop is written. */
  frame: z
    .strictObject({
      focus: z
        .union([
          z.enum(["left", "center", "right"]),
          z.strictObject({ x: z.number().min(0).max(1), y: z.number().min(0).max(1).optional() }),
        ])
        .default("center"),
    })
    .optional(),
});

/** `<Audio>` is `<Clip>` for audio-only assets: the same schema, no visual props accepted. */
export const audioSchema = z.strictObject({
  ...timedProps,
  ...sourceProps,
  ...audioProps,
});
