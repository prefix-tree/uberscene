// The SDK's part of a `<Layer>`: nothing the resolver asks by kind. Its own actions are in `actions.ts`.
import type { SdkElement } from "../element";

export const layer: SdkElement<"layer"> = { kind: "layer" };
