import { dataAttrs, layoutStyle, overlayStyle } from "../../overlays/layout";
import { useMediaText } from "../../react/media";
import { devWarn } from "../../warn";
import type { ElementPropsOf } from "../dom-drawing";
import { svgDrawing } from "./drawing";

/** Inline SVG markup, or an SVG asset read as text, prepared the way the export prepares it. */
export function Svg(p: ElementPropsOf<"svg">) {
  const props = p.placement.props;
  const content = props.content ?? null;
  const text = useMediaText(content === null ? (props.src ?? null) : null);
  const markup = content ?? text;
  // Marked pending while its file loads, so an export waits for the drawing instead of capturing nothing.
  if (markup === null)
    return (
      <div
        {...dataAttrs(p.placement)}
        {...(content === null && props.src !== undefined ? { "data-pending": "" } : {})}
        style={overlayStyle(p, { width: 0, height: 0 })}
      />
    );
  const drawing = svgDrawing(p, markup);
  for (const w of drawing.prepared.warnings) devWarn(`svg:${p.placement.id}:${w}`, `svg "${p.placement.id}": ${w}`);
  return (
    <div
      {...dataAttrs(p.placement)}
      style={{ ...layoutStyle(drawing.layout), lineHeight: 0 }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: prepareSvg (overlays/svg.ts) parses the markup and drops scripts, foreignObject, frames and event handlers.
      dangerouslySetInnerHTML={{ __html: drawing.prepared.markup }}
    />
  );
}
