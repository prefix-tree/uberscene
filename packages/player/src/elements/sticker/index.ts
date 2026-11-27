// The player's part of a `<Sticker>` that the engine asks: its size, a square a quarter of the frame's shorter side.
import type { PlayerElement } from "../element";

export const sticker: PlayerElement<"sticker"> = {
  kind: "sticker",
  size: (state) => {
    const side = Math.round(Math.min(state.composition.width, state.composition.height) / 4);
    return { size: { width: side, height: side }, fit: "none" };
  },
};
