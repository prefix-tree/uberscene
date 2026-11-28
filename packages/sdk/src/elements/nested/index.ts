// The SDK's part of a `<Nested>`: its one action of its own, writing its scene's tracks into the file, is in
// `actions.ts`.
import type { SdkElement } from "../element";

export const nested: SdkElement<"nested"> = { kind: "nested" };
