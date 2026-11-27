import { z } from "zod";

import {
  assetRefSchema,
  colorSchema,
  entranceProps,
  fitProp,
  groundProp,
  idSchema,
  overlayProps,
  timedProps,
} from "../../jsx/schemas/common";
import { zSvgColorType } from "../../jsx/schemas/enums-local";

export const svgSchema = z
  .strictObject({
    ...timedProps,
    ...overlayProps,
    ...groundProp,
    ...fitProp,
    /** A theme preset for svg elements. */
    style: idSchema.optional(),
    /** An SVG file from the manifest, as `asset:<id>`. Give this or `content`. */
    src: assetRefSchema.optional(),
    /** Inline SVG markup. Give this or `src`. */
    content: z.string().optional(),
    /** The part of the drawing to show, in its own units, as the SVG `viewBox` attribute. */
    viewBox: z
      .strictObject({ minX: z.number(), minY: z.number(), width: z.number().positive(), height: z.number().positive() })
      .optional(),
    /** How the drawing fits its box, as the SVG attribute of that name (`xMidYMid meet`). */
    preserveAspectRatio: z.string().optional(),
    /** Recolours it: `tint` keeps the shading and colours it, `replace` paints every drawn pixel; `opacity` is how much. */
    color: z
      .strictObject({ type: zSvgColorType, tint: colorSchema.optional(), opacity: z.number().min(0).max(1).optional() })
      .optional(),
    ...entranceProps,
  })
  .refine((v) => Boolean(v.src) !== Boolean(v.content), { message: "Svg takes either src or content" });
