// The SDK's part of a `<Track>`: its actions are in `actions.ts`. How tracks are walked and placed is the shape of the
// file, in the resolver.
import type { SdkElement } from "../element";

export const track: SdkElement<"track"> = { kind: "track" };
