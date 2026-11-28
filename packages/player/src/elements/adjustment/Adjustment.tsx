import { dataAttrs } from "../../overlays/layout";
import type { ElementPropsOf } from "../dom-drawing";

/**
 * The painter's adjustment op filters the footage; overlays stay unfiltered, as in the export.
 * A backdrop filter here would filter the canvas a second time.
 */
export function Adjustment(p: ElementPropsOf<"adjustment">) {
  return <div {...dataAttrs(p.placement)} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}
