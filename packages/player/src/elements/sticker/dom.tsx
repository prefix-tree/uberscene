// How a `<Sticker>` is drawn as DOM.
import type { DomDrawingOf } from "../dom-drawing";
import { Sticker } from "./Sticker";

export const stickerDom: DomDrawingOf<"sticker"> = {
  render: (props) => <Sticker {...props} />,
  where: "track",
  effects: "pipeline",
};
