// How a `<Layer>` is drawn as DOM: its free code, which the host hands over as `interior`.
import type { DomDrawingOf } from "../dom-drawing";
import { Layer } from "./Layer";

export const layerDom: DomDrawingOf<"layer"> = {
  render: (props, { interior }) => <Layer {...props} interior={interior} />,
  where: "track",
  effects: "pipeline",
};
