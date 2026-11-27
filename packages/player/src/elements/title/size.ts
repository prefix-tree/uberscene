import type { Box } from "@uberscene/kit/schema";
import type { PlacedTitle } from "@uberscene/sdk/resolver";

/**
 * A title's text box: its `box`'s width and height, each the frame's when left out. A title has no `fit`, so its
 * content is drawn at this size and `placeBox` never scales it.
 */
export function titleBox(placement: PlacedTitle, frame: Box): Box {
  const box = placement.props.box;
  return { width: box?.width ?? frame.width, height: box?.height ?? frame.height };
}
