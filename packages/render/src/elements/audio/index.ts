// The export's part of an `<Audio>`: it is heard, and draws nothing, so no frame's key holds it.
import type { RenderElement } from "../element";

export const audio: RenderElement<"audio"> = { kind: "audio", drawsNothing: true };
