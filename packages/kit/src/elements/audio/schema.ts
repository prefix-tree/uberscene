import { z } from "zod";

import { audioProps, timedProps } from "../../jsx/schemas/common";
import { sourceProps } from "../../jsx/schemas/media";

/** `<Audio>` is `<Clip>` for audio-only assets: the same schema, no visual props accepted. */
export const audioSchema = z.strictObject({
  ...timedProps,
  ...sourceProps,
  ...audioProps,
});
