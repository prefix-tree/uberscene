import type { TextRun } from "@uberscene/kit/schema";

import { titleContent } from "../../overlays/content";
import { dataAttrs, type ElementProps, overlayStyle } from "../../overlays/layout";
import { overlaySize } from "../../overlays/size";

/** Text title: the file's text content with font props; entrance/exit presets as CSS transforms. */
export function Title(p: ElementProps & { readonly text: string; readonly runs?: readonly TextRun[] | undefined }) {
  const { size } = overlaySize(p.state, p.placement, p.children, p.time - p.placement.start);
  return (
    <div {...dataAttrs(p.placement)} style={overlayStyle(p, size)}>
      {titleContent(p)}
    </div>
  );
}
