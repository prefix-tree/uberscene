// The player's part of a `<Layer>` that the engine asks: nothing. It is as large as the frame until its box places it.
import type { PlayerElement } from "../element";

export const layer: PlayerElement<"layer"> = { kind: "layer" };
