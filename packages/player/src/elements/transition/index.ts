// The player's part of a `<Transition>`: nothing of its own. It is drawn by the clips it stands between, whose
// canvas ops read its look (`model/transition.ts`).
import type { PlayerElement } from "../element";

export const transition: PlayerElement<"transition"> = { kind: "transition" };
