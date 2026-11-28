// timelineLanes: a film's timeline as lanes to draw, picture above sound, each sound with its level.
import { describe, expect, it } from "vitest";

import { collectModule, loadModule, resolve, timelineLanes } from "@uberscene/sdk";

const FILE = `import { Audio, Clip, Composition, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="sfx" layout="free" role="effects">
        <Audio id="hit" src="asset:hit" start={1} volume={0.5} />
        <Audio id="hit-2" src="asset:hit" start={1.5} />
        <Audio id="hit-3" src="asset:hit" start={2.5} />
      </Track>
      <Track id="shots">
        <Clip id="a" src="asset:shot" in={0} out={2} />
        <Clip id="b" src="asset:shot" in={2} out={4} />
      </Track>
      <Track id="words" layout="free">
        <Title id="name" start={0.5} duration={1}>Hi</Title>
      </Track>
    </Composition>
  );
}
`;
const manifest = {
  assets: {
    shot: { id: "shot", kind: "video" as const, duration: 10, fps: 30, width: 640, height: 360 },
    hit: {
      id: "hit",
      kind: "audio" as const,
      duration: 1,
      audio: { sampleRate: 48000, channels: 1, streams: 1 },
      // Silent for half a second, then loud.
      waveform: {
        binSeconds: 0.1,
        peaks: [0, 0, 0, 0, 0, 0.8, 0.8, 0.8, 0.8, 0.8],
        rms: [0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5],
      },
    },
  },
};

describe("timelineLanes", () => {
  const lanes = timelineLanes(resolve(collectModule(loadModule(FILE) as never), manifest as never), { steps: 10 });

  it("puts picture lanes above sound lanes, each clip with its seconds and name", () => {
    expect(lanes.length).toBe(4);
    expect(lanes.lanes.map((l) => [l.id, l.kind])).toEqual([
      ["shots", "picture"],
      ["words", "picture"],
      ["sfx", "sound"],
      ["sfx-2", "sound"],
    ]);
    expect(lanes.lanes[0]?.clips.map((c) => [c.label, c.from, c.to])).toEqual([
      ["a", 0, 2],
      ["b", 2, 4],
    ]);
    expect(lanes.lanes[2]?.role).toBe("effects");
  });

  it("stacks a track's overlapping clips in more lanes, each clip in the first lane free at its start", () => {
    expect(lanes.lanes[2]?.clips.map((c) => c.id)).toEqual(["hit", "hit-3"]);
    expect(lanes.lanes[3]).toMatchObject({ id: "sfx-2", track: "sfx" });
    expect(lanes.lanes[3]?.clips.map((c) => c.id)).toEqual(["hit-2"]);
  });

  it("gives a sound its level at even steps, scaled by its volume", () => {
    const hit = lanes.lanes[2]?.clips[0];
    expect(hit?.level).toEqual([0, 0, 0, 0, 0, 0.4, 0.4, 0.4, 0.4, 0.4]);
  });
});
