// A `<Camera>`: one view over the tracks inside it, which move, zoom and turn together.
import type { KitElement } from "../element";
import { planeTraits } from "../traits";
import { cameraSchema } from "./schema";

/** The kit's part of a camera: its schema, its row in the kind table, and a sample. */
export interface CameraElement extends KitElement<"camera", "none"> {
  readonly schema: typeof cameraSchema;
}

export const camera: CameraElement = {
  kind: "camera",
  summary:
    "One view over the tracks written inside it: they move, zoom and turn together, by a constant or by keys on the video's clock. Tracks outside it stay fixed to the screen. A composition has one, or none.",
  group: "Timeline",
  schema: cameraSchema,
  traits: planeTraits("none", { childKinds: ["track"], placementScope: "composition" }),
  sample: `<Camera id="sample">
        <Track id="framed" layout="free">
          <Title id="framed-title" start={0} duration={3}>Under the camera</Title>
        </Track>
      </Camera>`,
  sampleTrack: "composition",
};
