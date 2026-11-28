// <Audio align="onset">: the sound's attack, measured by `uberscene add`, lands where the sound is placed.
import { describe, expect, it } from "vitest";

import { collectModule, loadModule, resolve } from "@uberscene/sdk";

const file = (audio: string) => `import { Audio, Clip, Composition, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="shots">
        <Clip id="a" src="asset:shot" in={0} out={4} />
        <Clip id="b" src="asset:shot" in={4} out={8} />
      </Track>
      <Track id="sfx" layout="free" role="effects">
        ${audio}
      </Track>
    </Composition>
  );
}
`;
const sound = { sampleRate: 48000, channels: 2, streams: 1 };
const manifest = {
  assets: {
    shot: { id: "shot", kind: "video" as const, duration: 10, fps: 30, width: 640, height: 360 },
    hit: { id: "hit", kind: "audio" as const, duration: 2, audio: sound, onset: 0.3 },
    raw: { id: "raw", kind: "audio" as const, duration: 2, audio: sound },
  },
};
const placed = (audio: string) => resolve(collectModule(loadModule(file(audio)) as never), manifest as never);

describe('align="onset"', () => {
  it("moves a sound earlier by its onset, so the attack lands on the cut", () => {
    const state = placed('<Audio id="boom" src="asset:hit" anchor="b" align="onset" />');
    expect(state.errors).toEqual([]);
    const boom = state.items.get("boom");
    expect(boom?.start).toBeCloseTo(4 - 0.3, 6);
    expect(boom?.source?.in).toBe(0);
  });

  it("counts from where the sound is trimmed in, and does nothing once the onset is cut away", () => {
    const later = placed('<Audio id="boom" src="asset:hit" start={4} in={0.1} align="onset" />');
    expect(later.items.get("boom")?.start).toBeCloseTo(3.8, 6);
    const past = placed('<Audio id="boom" src="asset:hit" start={4} in={0.5} align="onset" />');
    expect(past.items.get("boom")?.start).toBe(4);
  });

  it("trims the front of a sound that would start before the video", () => {
    const state = placed('<Audio id="boom" src="asset:hit" start={0.1} align="onset" />');
    const boom = state.items.get("boom");
    expect(boom?.start).toBe(0);
    expect(boom?.source?.in).toBeCloseTo(0.2, 6);
  });

  it("is an error on a sound whose onset is not measured, naming the command that measures it", () => {
    const state = placed('<Audio id="boom" src="asset:raw" start={4} align="onset" />');
    expect(state.errors.map((e) => e.code)).toEqual(["NO_ONSET"]);
    expect(state.errors[0]?.message).toContain("uberscene add");
  });
});

describe("sounds in the sync report", () => {
  it("reports each effect's attack against its nearest cut, and one just off it as an issue", async () => {
    const { syncReport } = await import("@uberscene/sdk");
    const state = placed(
      '<Audio id="on-cut" src="asset:hit" anchor="b" align="onset" />\n        <Audio id="late" src="asset:hit" start={4.05} align="onset" />',
    );
    const report = syncReport(state);
    expect(report.sounds.map((s) => [s.id, s.status])).toEqual([
      ["on-cut", "on"],
      ["late", "near"],
    ]);
    expect(report.sounds[1]?.cut).toMatchObject({ label: "a→b", offsetMs: 50 });
    const issue = report.issues.find((i) => i.rule === "sound-off-cut");
    expect(issue?.fix).toBe('land it on the cut: anchor="b" align="onset"');
  });
});
