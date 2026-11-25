// The crossing scene (crossing.js) played as media: the manifest lists the file as an asset of kind `scene`, and a
// <Clip> plays it like footage whose frames are computed. Everything a clip does to footage works on it: here the
// whole shot, then its crossing again at half speed, then backwards, with a title over the top.
import { Clip, Composition, Title, Track } from "@uberscene/kit";

// A scene asset says how its frames come out: their size, their rate and how long the scene runs.
export const manifest = {
  assets: {
    crossing: { id: "crossing", kind: "scene", duration: 5, fps: 30, width: 1920, height: 1080 },
  },
};

export default function CrossingClip() {
  return (
    <Composition id="crossing-clip" width={1920} height={1080} fps={30}>
      <Clip id="whole" src="asset:crossing" />
      <Clip id="slow" src="asset:crossing" in={1.5} out={3.2} speed={0.5} />
      <Clip id="back" src="asset:crossing" in={0.5} out={3.2} reverse />
      <Track id="titles" layout="free">
        <Title id="slate" start={0} duration={1.5} style="h1">
          Scene 4: the crossing
        </Title>
      </Track>
    </Composition>
  );
}
