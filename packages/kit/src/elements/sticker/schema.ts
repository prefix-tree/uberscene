import { z } from "zod";

import { entranceProps, groundProp, idSchema, overlayProps, timedProps } from "../../jsx/schemas/common";

export const stickerSchema = z.strictObject({
  ...timedProps,
  ...overlayProps,
  ...groundProp,
  ...entranceProps,
  /** A theme preset for stickers. */
  style: idSchema.optional(),
  /** An image the manifest lists (`asset:party`): PNG, SVG, WebP or GIF. */
  src: z.string().refine((v) => v.startsWith("asset:"), {
    message: "a sticker is an image asset (asset:…); icon stickers were removed, so draw an icon as an <Svg>",
  }),
});
