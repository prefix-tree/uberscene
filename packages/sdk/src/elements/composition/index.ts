// The SDK's part of a `<Composition>`. What it holds, and in what order, is the shape of the file, which the
// resolver and the source index read (decision 0046, section 4); it has nothing of its own to say here.
import type { SdkElement } from "../element";

export const composition: SdkElement<"composition"> = { kind: "composition" };
