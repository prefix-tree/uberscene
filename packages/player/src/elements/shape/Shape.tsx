import { dataAttrs, layoutStyle } from "../../overlays/layout";
import { devWarn } from "../../warn";
import type { ElementPropsOf } from "../dom-drawing";
import { shapeDrawing } from "./drawing";

/** A vector shape, drawn from the same markup as the export, with room around it for its stroke and shadows. */
export function Shape(p: ElementPropsOf<"shape">) {
  const d = shapeDrawing(p);
  for (const w of d.prepared.warnings) devWarn(`shape:${p.placement.id}:${w}`, `shape "${p.placement.id}": ${w}`);
  return (
    <div {...dataAttrs(p.placement)} style={layoutStyle(d.layout)}>
      <div
        style={{ position: "absolute", left: -d.bleed, top: -d.bleed, lineHeight: 0 }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: prepareSvg (overlays/svg.ts) parses the markup and drops scripts, foreignObject, frames and event handlers.
        dangerouslySetInnerHTML={{ __html: d.prepared.markup }}
      />
    </div>
  );
}
