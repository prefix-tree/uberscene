// The player's part of an `<Audio>`: nothing beyond what every sound has. It plays its asset, and is not drawn.
import type { PlayerElement } from "../element";

export const audio: PlayerElement<"audio"> = { kind: "audio" };
