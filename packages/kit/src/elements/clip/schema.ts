import { z } from "zod";

import { ref } from "../../jsx/ref-sites";
import { isScene, type Scene } from "../../jsx/scene3d";
import { assetRefSchema, audioProps, timedProps, visualProps } from "../../jsx/schemas/common";
import { editTimeSchema, sourceProps } from "../../jsx/schemas/media";

export const clipSchema = z.strictObject({
  ...timedProps,
  ...sourceProps,
  /**
   * The media, as `asset:<id>` from the manifest, or a 3D scene module (`import * as crossing from
   * "./crossing.scene.js"`), which plays like footage: `in`, `out`, `speed` and trims are in the scene's own seconds.
   */
  src: z.union([assetRefSchema, z.custom<Scene>(isScene, "a scene exports length, stage and build")]),
  /**
   * With a scene: moments of the edit handed into it by name, which its keys may use for `at`. `{ reveal:
   * "marker:reveal" }` puts the scene's `reveal` where the marker is, wherever the clip or the marker moves.
   */
  times: z.record(z.string(), ref("sceneTime", editTimeSchema)).optional(),
  ...visualProps,
  ...audioProps,
  /** Reframe to the composition's aspect: the resolver writes `transform.crop` from the source size and this focus, unless a crop is written. */
  frame: z
    .strictObject({
      focus: z
        .union([
          z.enum(["left", "center", "right"]),
          z.strictObject({ x: z.number().min(0).max(1), y: z.number().min(0).max(1).optional() }),
        ])
        .default("center"),
    })
    .optional(),
  /**
   * Cut the subject out of its background with the asset's matte: a greyscale video of the same frames, white where
   * the subject is, named by `"matte": "<asset id>"` on the asset's manifest entry. Where the matte is black the clip
   * is transparent, so what is under it shows. It applies before `effects`, so they act on the subject alone. `true`,
   * or `{ shrink, feather }` in pixels of the composition: `shrink` pulls the edge in, `feather` softens it.
   */
  cutout: z
    .union([
      z.boolean(),
      z.strictObject({
        shrink: z.number().nonnegative().max(64).optional(),
        feather: z.number().nonnegative().max(64).optional(),
      }),
    ])
    .optional(),
});
