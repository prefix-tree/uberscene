// The player's part of a `<Shape>` that the engine asks: its size, with keys on its width and height counted.
import { shapeSize } from "@uberscene/kit/schema";

import { keyframedValue } from "../../model/keyframes";
import type { PlayerElement } from "../element";

export const shape: PlayerElement<"shape"> = {
  kind: "shape",
  size: (_state, placement, children, rel) => ({
    size: shapeSize({
      width: keyframedValue(children, "shape.width", rel, placement.props.width),
      height: keyframedValue(children, "shape.height", rel, placement.props.height),
    }),
    fit: "none",
  }),
};
