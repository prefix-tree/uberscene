// The player's part of a `<Camera>`: nothing of its own. It is not drawn; what it holds is.
import type { PlayerElement } from "../element";

export const camera: PlayerElement<"camera"> = { kind: "camera" };
