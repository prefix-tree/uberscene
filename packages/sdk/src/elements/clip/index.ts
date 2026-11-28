// The SDK's part of a `<Clip>`. What a clip shows and how long it is are its asset's to say, read where the resolver
// places it; a 3D scene played as footage is read in `scene.ts`.
import type { SdkElement } from "../element";

export const clip: SdkElement<"clip"> = { kind: "clip" };
