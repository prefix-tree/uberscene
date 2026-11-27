import { z } from "zod";

import { zBlendMode } from "../../jsx/enums";
import { adjustmentEffectsProp, timedProps } from "../../jsx/schemas/common";

export const adjustmentSchema = z.strictObject({
  ...timedProps,
  ...adjustmentEffectsProp,
  /** How much of its effects to mix over the picture beneath. */
  opacity: z.number().min(0).max(1).default(1),
  /** How the filtered picture mixes with the one beneath, as CSS `mix-blend-mode` does. */
  blend: zBlendMode.default("normal"),
  /** Off, it filters nothing and stays in the file. */
  enabled: z.boolean().default(true),
});
