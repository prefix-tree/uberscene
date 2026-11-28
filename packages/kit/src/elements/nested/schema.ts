import { z } from "zod";

import { timedProps, timeRefSchema, visualProps, volumeSchema } from "../../jsx/schemas/common";

export const nestedSchema = z.strictObject({
  ...timedProps,
  ...visualProps,
  /** A pure helper component returning tracks, or a file reference. Validated at collect time. */
  of: z.union([
    z.custom<(props: Record<string, unknown>) => unknown>((v) => typeof v === "function"),
    z.string().startsWith("file:"),
  ]),
  /** Where in the nested sequence it starts, in its own seconds. */
  in: timeRefSchema.optional(),
  /** Where in the nested sequence it ends, as `in`. */
  out: timeRefSchema.optional(),
  /** A gain on all its sound: 1 as it is, 0 muted; keys change it over time. */
  volume: volumeSchema.default(1),
});
