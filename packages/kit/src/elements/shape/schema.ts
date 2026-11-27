import { z } from "zod";

import { zShapeType } from "../../jsx/enums";
import {
  animatable,
  colorSchema,
  entranceProps,
  gradientSchema,
  groundProp,
  idSchema,
  keyed,
  overlayProps,
  shadowSchema,
  themedLengthSchema,
  timedProps,
  vec2Schema,
} from "../../jsx/schemas/common";

const fillSchema = z.union([
  keyed(colorSchema),
  z.strictObject({
    type: z.enum(["solid", "gradient", "none"]),
    color: colorSchema.optional(),
    gradient: gradientSchema.optional(),
    opacity: z.number().min(0).max(1).optional(),
  }),
]);

const strokeSchema = z.strictObject({
  /** The outline's colour, or keys to change it (moved in OKLab). */
  color: keyed(colorSchema),
  /** The outline's thickness in pixels, or keys or a generator. */
  thickness: animatable(z.number().nonnegative()),
  opacity: z.number().min(0).max(1).optional(),
  dashArray: z.array(z.number().nonnegative()).optional(),
  /** How far along the dashes start, in pixels, or keys: from the dash length to 0 draws a line on. */
  dashOffset: animatable(z.number()).optional(),
  lineCap: z.enum(["butt", "round", "square"]).optional(),
  lineJoin: z.enum(["miter", "round", "bevel"]).optional(),
  gradient: gradientSchema.optional(),
});

export const shapeSchema = z.strictObject({
  ...timedProps,
  ...overlayProps,
  ...groundProp,
  ...entranceProps,
  /** A theme preset for shapes. */
  style: idSchema.optional(),
  /** Which shape it draws. */
  type: zShapeType,
  /** The shape's box width, in pixels, or keys or a generator; left out, 200. */
  width: animatable(z.number().positive()).optional(),
  /** The shape's box height, in pixels, or keys or a generator; left out, 200. */
  height: animatable(z.number().positive()).optional(),
  /**
   * A polygon's or path's corners, as fractions of the box from its top left, or keys of such lists: two keys with
   * as many points move point by point (a morph); otherwise the shape changes at the key.
   */
  points: keyed(z.array(vec2Schema)).optional(),
  /** A colour, or keys of colours (moved in OKLab), or `{ type, color, gradient, opacity }` for a gradient or no fill. */
  fill: fillSchema.optional(),
  /** The outline: colour, thickness in pixels, opacity, dashes, caps and joins. */
  stroke: strokeSchema.optional(),
  /** A drop shadow: colour, blur and offset in pixels. */
  shadow: shadowSchema.optional(),
  /** Several shadows, drawn in order, for layered or inner shadows. */
  shadows: z.array(shadowSchema).optional(),
  /** A rectangle's rounded corners, in pixels or a theme token such as `$radius`. */
  cornerRadius: themedLengthSchema.optional(),
  /** A rectangle's corners rounded one by one, in pixels. */
  cornerRadii: z
    .strictObject({ topLeft: z.number(), topRight: z.number(), bottomRight: z.number(), bottomLeft: z.number() })
    .optional(),
  /** How many points a star has; left out, 5. */
  starPoints: z.number().int().min(3).optional(),
  /** A star's inner corners, as a fraction of its outer radius; left out, 0.5. */
  innerRadius: z.number().min(0).max(1).optional(),
});
