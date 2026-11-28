import { z } from "zod";

import { colorSchema, idSchema } from "../../jsx/schemas/common";

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
