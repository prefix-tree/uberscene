import { z } from "zod";

import { zEasing } from "../../jsx/enums";
import { ref } from "../../jsx/ref-sites";
import { animatable, idSchema } from "../../jsx/schemas/common";

const view = <S extends z.ZodType>(value: S) =>
  animatable(value, { group: "camera", constant: "first", clock: "video" });

export const cameraSchema = z.strictObject({
  /** The camera's name in the file; actions refer to it by this. */
  id: idSchema,
  /** How far the view has moved right, in pixels: at 180 everything under the camera sits 180 px to the left. */
  x: view(z.number()).default(0),
  /** How far the view has moved down, in pixels: at 100 everything under the camera sits 100 px higher. */
  y: view(z.number()).default(0),
  /** How close the view is, about the frame's centre: 1 is as written, 2 shows everything twice the size. */
  zoom: view(z.number().min(0.01).max(100)).default(1),
  /** How far the view is turned clockwise, in degrees, about the frame's centre: what it shows turns the other way. */
  rotation: view(z.number()).default(0),
  /**
   * Lets the camera make room: as each element in `on` starts, the view moves as little as it can so that element is
   * in view with everything else on the camera's tracks that is on screen then. It pans the shortest way, and pulls back only when all of it
   * cannot fit. With `push`, `x`, `y` and `zoom` are where the view starts, as numbers; `camera/bakePush` turns the
   * moves into keys to change by hand.
   */
  push: z
    .strictObject({
      /** The elements to make room for, on the camera's tracks, each as it starts. */
      on: z.array(ref("push", idSchema)).min(1),
      /**
       * The only elements that must stay in view, a speaker for one, with those in `on`. Left out, everything on the
       * camera's tracks that is on screen at the moment stays in view.
       */
      keep: z.array(ref("push", idSchema)).optional(),
      /** How far inside the frame's edge everything sits, in pixels. Left out, a twentieth of the frame's shorter side. */
      margin: z.number().min(0).optional(),
      /** How long each move takes, in seconds, from the moment its element starts. */
      duration: z.number().positive().default(0.3),
      /** How each move goes. */
      easing: zEasing.default("snappy"),
    })
    .optional(),
});
