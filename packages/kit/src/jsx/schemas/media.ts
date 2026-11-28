// What the elements that play a source share: a clip's and a sound's schemas are in their folders.
import { z } from "zod";

import { refPattern } from "../ref";
import { assetRefSchema, ramped, timeRefSchema } from "./common";

/** A hold: the source frame at `source` seconds stays on screen from `start` seconds into the element for `duration`. */
const freezeSpecSchema = z.strictObject({
  /** Seconds into the element where the hold starts. */
  start: z.number().nonnegative(),
  /** Seconds the frame is held before it plays on. */
  duration: z.number().positive(),
  /** The source time of the frame held. */
  source: z.number().nonnegative(),
});

/** What every element that plays a source writes: the source, its trim, its speed and its holds. */
export const sourceProps = {
  /** The media, as `asset:<id>` from the manifest. */
  src: assetRefSchema,
  /** Where in the source it starts: seconds, or a word, shot, silence or beat of the source (`word:12`, `beat:16`). */
  in: timeRefSchema.optional(),
  /** Where in the source it ends, as `in`; `word:40.end` ends after the word is said. */
  out: timeRefSchema.optional(),
  /** Playback rate: 2 plays twice as fast and half as long; keys ramp it. */
  speed: ramped(z.number().min(0.1).max(20)).default(1),
  /** Frames held on screen while the clip's time stands still. */
  freezes: z.array(freezeSpecSchema).optional(),
  /** Plays the trimmed source backwards. */
  reverse: z.boolean().default(false),
};

/** A moment of the edit handed into a scene: seconds of the video, or `"marker:ID"`. */
export const editTimeSchema = z.union([
  z.number().nonnegative(),
  z.string().regex(refPattern(["marker"]), 'times look like 4.2 or "marker:reveal"'),
]);
