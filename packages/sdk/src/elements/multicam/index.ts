// The SDK's part of `<Multicam>`, `<Angle>` and `<Cut>`: a multicam makes a clip of each cut as its track is placed
// (`place.ts`); its angles and cuts are read there. Its actions are in `actions.ts`.
import type { SdkElement } from "../element";
import { makesClips } from "./place";

export const multicam: SdkElement<"multicam"> = { kind: "multicam", makes: makesClips };
export const angle: SdkElement<"angle"> = { kind: "angle" };
export const cut: SdkElement<"cut"> = { kind: "cut" };
