// How a `<Shape>` is drawn as DOM.
import type { DomDrawingOf } from "../dom-drawing";
import { Shape } from "./Shape";

export const shapeDom: DomDrawingOf<"shape"> = {
  render: (props) => <Shape {...props} />,
  where: "track",
  effects: "pipeline",
};
