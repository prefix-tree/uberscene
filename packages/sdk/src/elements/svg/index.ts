// The SDK's part of an `<Svg>`: when it cannot be followed, and its old spellings.
import { renames } from "../../source/lint/deprecation";
import type { SdkElement } from "../element";

/** Keys renamed in 0.6, by the object they are in: old to new. */
const renamed = { color: { mode: "type" } } as const;

export const svg: SdkElement<"svg"> = {
  kind: "svg",
  // What follows an element stands in its box, and a drawing read from a file has no size until it has loaded.
  cannotBeFollowed: (written) =>
    typeof written.content === "string"
      ? undefined
      : "an SVG read from a file: its size is only known once it is drawn, so it can't be followed yet; write its markup in `content`, or follow a shape",
  renamed,
  deprecations: renames("Svg", renamed),
};
