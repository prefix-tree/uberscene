// The SDK's part of `<Captions>` and `<Caption>`: captions time their cues once every track is placed (`place.ts`),
// and say where their old flat props went. A cue is timed by its captions. Their actions are in `actions.ts`.
import type { Kind } from "@uberscene/kit/schema";

import type { SdkElement } from "../element";
import { makesCues } from "./place";

export const captions: SdkElement<"captions"> = {
  kind: "captions",
  makes: makesCues,
  moved: (at, keys) => {
    if (at === "" && keys.includes("align")) return ["`align` is now `style.align`"];
    if (at === "style" && keys.includes("position"))
      return [
        `style.position moved to box: the captions sit in the lower safe area unless their box says otherwise, as box={{ y, origin: "top" | "center" }}`,
      ];
    const flat = keys.filter((k) => k === "x" || k === "y" || k === "width");
    return at === "" && flat.length > 0 ? [`${flat.join(", ")} moved to box, in pixels from the frame's top left`] : [];
  },
};

export const caption: SdkElement<"caption"> = { kind: "caption", made: true };

/** Whether a kind is the video's captions: what the export and the tools treat as its subtitles. */
export function isCaptions(kind: Kind): boolean {
  return kind === "captions";
}

/** Whether a kind is one cue of captions, written or made from a transcript. */
export function isCue(kind: Kind): boolean {
  return kind === "caption";
}
