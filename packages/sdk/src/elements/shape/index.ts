// The SDK's part of a `<Shape>`: its size at rest, and its old spellings.
import { shapeSize } from "@uberscene/kit/schema";

import { renames } from "../../source/lint/deprecation";
import type { SdkElement } from "../element";

/** Keys renamed in 0.6, by the object they are in (`""` for the shape's own props): old to new. */
const renamed = { "": { shape: "type" }, stroke: { width: "thickness" } } as const;

export const shape: SdkElement<"shape"> = {
  kind: "shape",
  restSize: (placement) => shapeSize(placement.props),
  renamed,
  deprecations: renames("Shape", renamed),
};
