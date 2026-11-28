// The player's part of an `<Svg>` that the engine asks: the size its markup says, once there is markup to read.
import { svgIntrinsicSize } from "../../overlays/svg";
import type { PlayerElement } from "../element";

export const svg: PlayerElement<"svg"> = {
  kind: "svg",
  size: (state, placement, _children, _rel, loaded) => {
    const { content, viewBox, box } = placement.props;
    const fit = placement.props.fit ?? "none";
    // Its markup: written inline, or its file once that has loaded.
    const markup = loaded ?? content;
    if (markup !== undefined) return { size: svgIntrinsicSize(markup, viewBox), fit };
    // A file that is not loaded here has no size yet: its box's, or the frame's.
    const comp = state.composition;
    return { size: { width: box?.width ?? comp.width, height: box?.height ?? comp.height }, fit };
  },
};
