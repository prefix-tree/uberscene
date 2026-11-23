// A five-second 3D shot in an edit: a walker crosses behind a table while the camera slides sideways, coming out from
// behind the flat on the "reveal" beat. The module builds the set; this tag stages it. Move the beat and the
// walker comes out on it; drag the table in the viewport and its position below changes.
import { Composition, Marker, Three, Title, Track } from "@uberscene/kit";

import crossing from "./crossing.js";

// No media: everything on screen is built by the shot.
export const manifest = { assets: {} };

export default function Crossing() {
  return (
    <Composition id="crossing" width={1920} height={1080} fps={30}>
      <Marker id="reveal" start={4} label="reveal" />
      <Track id="titles" layout="free">
        <Title id="slate" start={0} duration={2} style="h1">
          Scene 4: the crossing
        </Title>
      </Track>
      <Track id="shots" layout="free">
        <Three
          id="crossing-shot"
          start={2}
          duration={5}
          shot={crossing}
          background="#1d1b18"
          camera={{
            fov: 35,
            position: [
              { at: 0, value: [-1.5, 1.4, 5.5], easing: "easeInOut" },
              { at: 5, value: [1.5, 1.4, 5.5] },
            ],
            lookAt: [0, 1.1, 0],
          }}
          objects={{
            table: { position: [0, 0, 0.6] },
            flat: { position: [-2.2, 0, -0.3] },
            walker: {
              position: [
                { at: 0.5, value: [-2.5, 0, -0.8] },
                { at: "marker:reveal", value: [-1, 0, -0.8] },
                { at: 3.2, value: [1.5, 0, -0.8] },
              ],
            },
          }}
          inputs={{ stride: 1.4 }}
        />
      </Track>
    </Composition>
  );
}
