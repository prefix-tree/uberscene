import type { ReactNode } from "react";

import { secondsSinceStart } from "@uberscene/sdk/resolver";

import { dataAttrs, overlayStyle } from "../../overlays/layout";
import { overlaySize } from "../../overlays/size";
import { useMediaUrl } from "../../react/media";
import type { ElementPropsOf } from "../dom-drawing";

/**
 * An image asset (`asset:party`), fitted into its box; a labelled placeholder shows until it has loaded, marked
 * `data-pending` so an export waits for the image instead of capturing the placeholder.
 */
export function Sticker(p: ElementPropsOf<"sticker">) {
  const src = p.placement.props.src;
  const url = useMediaUrl(src.startsWith("asset:") ? src : null);
  const { size } = overlaySize(p.state, p.placement, p.children, secondsSinceStart(p.placement, p.time));
  const style = overlayStyle(p, size);
  return (
    <div
      {...dataAttrs(p.placement)}
      {...(url ? {} : { "data-pending": "" })}
      style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        stickerPlaceholder(src)
      )}
    </div>
  );
}

/** The labelled box shown for a sticker with no media. */
function stickerPlaceholder(label: string): ReactNode {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#333",
        color: "#ccc",
        font: "16px monospace",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
      }}
    >
      {label}
    </div>
  );
}
