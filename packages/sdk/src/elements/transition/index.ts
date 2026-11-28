// The SDK's part of a `<Transition>`: how long it overlaps its clips, the shaders its type may name, and the params a
// built-in type fills in. Its actions are in `actions.ts`.
import { defaultTransitionParams, isBuiltInTransition } from "@uberscene/kit/schema";

import { lengthOr, T } from "../../time";
import type { SdkElement } from "../element";

export const transition: SdkElement<"transition"> = {
  kind: "transition",
  timing: (written) => T(lengthOr(written.duration, 0.5)),
  shader: "transition",
  // A built-in transition's params are validated per type but not filled by its schema.
  complete: (props) =>
    isBuiltInTransition(props.type)
      ? { ...props, params: { ...defaultTransitionParams(props.type), ...props.params } }
      : props,
};
