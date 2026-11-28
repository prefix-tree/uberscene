// The player's part of a `<Composition>`: nothing of its own. It is not drawn; what it holds is.
import type { PlayerElement } from "../element";

export const composition: PlayerElement<"composition"> = { kind: "composition" };
