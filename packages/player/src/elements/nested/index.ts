// The player's part of a `<Nested>` that the engine asks: how it is heard. It is drawn by its canvas ops.
import type { PlayerElement } from "../element";
import { nestedSound } from "./sound";

export const nested: PlayerElement<"nested"> = { kind: "nested", sound: nestedSound };
