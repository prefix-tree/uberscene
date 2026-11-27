// The player's part of a `<Title>` that the engine asks: its text box.
import type { PlayerElement } from "../element";
import { titleBox } from "./size";

export const title: PlayerElement<"title"> = {
  kind: "title",
  size: (state, placement) => ({ size: titleBox(placement, state.composition), fit: "none" }),
};
