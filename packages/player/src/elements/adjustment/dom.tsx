// An `<Adjustment>`'s cell on the overlay plane: an empty box. Its effects are the canvas's (`canvas.ts`).
import type { DomDrawingOf } from "../dom-drawing";
import { Adjustment } from "./Adjustment";

export const adjustmentDom: DomDrawingOf<"adjustment"> = {
  render: (props) => <Adjustment {...props} />,
  where: "track",
  effects: "none",
};
