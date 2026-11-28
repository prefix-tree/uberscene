// The player's part of `<Captions>` and `<Caption>` that the engine asks: nothing. Captions are drawn as DOM
// (`dom.tsx`), their cues inside them.
import type { PlayerElement } from "../element";

export const captions: PlayerElement<"captions"> = { kind: "captions" };
export const caption: PlayerElement<"caption"> = { kind: "caption" };
