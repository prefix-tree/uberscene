import { z } from "zod";

import { zTrackLayout, zTrackRole } from "../../jsx/enums";
import { idSchema } from "../../jsx/schemas/common";

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
