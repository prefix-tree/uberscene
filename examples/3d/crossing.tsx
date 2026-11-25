// A five-second 3D shot in an edit. The scene file builds and stages it; here it is a clip like any footage: placed,
// trimmed and cut, and handed the moment of the "reveal" beat. Move the marker and the walker comes out on it.
import { Clip, Composition, Marker, Title, Track } from "@uberscene/kit";

import * as crossing from "./crossing.scene.js";

// No media: everything on screen is drawn by the scene.
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
        <Clip id="crossing-shot" src={crossing} start={2} times={{ reveal: "marker:reveal" }} />
      </Track>
    </Composition>
  );
}
