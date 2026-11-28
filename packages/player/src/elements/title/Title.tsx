import { secondsSinceStart } from "@uberscene/sdk/resolver";

import { dataAttrs, overlayStyle } from "../../overlays/layout";
import { overlaySize } from "../../overlays/size";
import type { ElementPropsOf } from "../dom-drawing";
import { titleContent } from "./content";

/** Text title: the file's text content in its `style`; entrance/exit presets as CSS transforms. */
export function Title(p: ElementPropsOf<"title">) {
  const { size } = overlaySize(p.state, p.placement, p.children, secondsSinceStart(p.placement, p.time));
  return (
    <div {...dataAttrs(p.placement)} style={overlayStyle(p, size)}>
      {titleContent(p)}
    </div>
  );
}
