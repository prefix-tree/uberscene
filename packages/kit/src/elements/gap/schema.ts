import { z } from "zod";

import { idSchema } from "../../jsx/schemas/common";

export const gapSchema = z.strictObject({
  /** The gap's name. */
  id: idSchema,
  /** Seconds of empty time before the next element on the track. */
  duration: z.number().positive(),
});
