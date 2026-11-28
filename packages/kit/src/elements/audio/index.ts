// An `<Audio>`: a stretch of a sound asset. It is heard, not drawn.
import type { KitElement } from "../element";
import { ITEM, planeTraits } from "../traits";
import { audioSchema } from "./schema";

/** The kit's part of a sound: its schema, its row in the kind table, and a sample. */
export interface AudioElement extends KitElement<"audio", "none"> {
  readonly schema: typeof audioSchema;
}

export const audio: AudioElement = {
  kind: "audio",
  summary: "A stretch of a sound asset: volume and pan (constant or keys), fades, ducking under another track.",
  group: "Sound",
  schema: audioSchema,
  traits: planeTraits("none", { ...ITEM, childKinds: ["keyframe", "speedKey", "freeze"], playsAsset: true }),
  sample: `<Audio id="sample" src="asset:sound" start={0} out={3} />`,
};
