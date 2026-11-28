// The SDK's part of a `<Gap>`: the empty time it holds, from its props.
import type { NodeSpec } from "../../actions/types";
import { lengthOr, T } from "../../time";
import type { SdkElement } from "../element";

export const gap: SdkElement<"gap"> = {
  kind: "gap",
  // A gap whose duration the schema refused holds no time.
  timing: (written) => T(lengthOr(written.duration, 0)),
};

/** A gap of `seconds`, as an edit writes one into a sequence to hold a place. */
export function gapNode(id: string, seconds: number): NodeSpec {
  return { id, kind: "gap", props: { id, duration: seconds } };
}
