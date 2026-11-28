// How an `<Svg>` is drawn as DOM.
import type { DomDrawingOf } from "../dom-drawing";
import { Svg } from "./Svg";

export const svgDom: DomDrawingOf<"svg"> = {
  render: (props) => <Svg {...props} />,
  where: "track",
  effects: "pipeline",
};
