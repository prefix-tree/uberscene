// The SDK's part of a `<Marker>`: its actions are in `actions.ts`. Markers are placed first, so times may name them.
import type { SdkElement } from "../element";

export const marker: SdkElement<"marker"> = { kind: "marker" };
