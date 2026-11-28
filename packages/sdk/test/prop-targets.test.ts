// An action that writes a prop applies to the kinds whose schema has the prop (`props` on its handler), so what an
// element is offered and what its schema takes cannot disagree. Lists of kinds had drifted: a nested composition was
// offered a speed, a direction, a fade and a duck, none of which its schema has, and each failed when run.
import { describe, expect, it } from "vitest";

import { type ActionInput, affordances, collectModule, Executor, loadModule } from "@uberscene/sdk";

const manifest = {
  assets: {
    shot: {
      id: "shot",
      kind: "video" as const,
      duration: 20,
      fps: 30,
      width: 1920,
      height: 1080,
      audio: { sampleRate: 48000, channels: 2, streams: 1 },
    },
  },
};

const TEXT = `import { Adjustment, Audio, Captions, Clip, Composition, Nested, Shape, Track } from "@uberscene/kit";
function Inner() {
  return (
    <Track id="inner-main">
      <Clip id="inner-clip" src="asset:shot" in={0} out={2} />
    </Track>
  );
}
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="t" layout="free">
        <Clip id="clip" src="asset:shot" in={0} out={2} start={0} />
        <Nested id="nested" of={Inner} start={2} duration={2} />
        <Shape id="shape" start={0} duration={2} type="rectangle" />
        <Adjustment id="grade" start={0} duration={2} effects={[{ type: "sepia" }]} />
      </Track>
      <Track id="sound" layout="free">
        <Audio id="audio" src="asset:shot" in={0} out={2} start={0} />
      </Track>
      <Captions id="caps" src="asset:shot" />
    </Composition>
  );
}
`;

const editor = () => new Executor({ tree: collectModule(loadModule(TEXT) as never), manifest, now: () => 0 });
const ELEMENTS = ["clip", "nested", "shape", "grade", "audio", "caps"] as const;

/** The elements an action is offered on. */
const offeredOn = (type: string): string[] => {
  const state = editor().state();
  return ELEMENTS.filter((id) => affordances(state, id)?.actions.includes(type as never));
};

describe("an action that writes a prop is offered where the schema has the prop", () => {
  it.each([
    ["clip/setSpeed", ["clip", "audio"]],
    ["clip/setReverse", ["clip", "audio"]],
    ["clip/setBlend", ["clip", "nested", "shape", "grade"]],
    ["clip/setFit", ["clip", "nested"]],
    ["clip/setSource", ["clip", "audio"]],
    ["transform/update", ["clip", "nested", "shape"]],
    ["box/update", ["clip", "nested", "shape", "caps"]],
    ["audio/setVolume", ["clip", "nested", "audio"]],
    ["audio/setFade", ["clip", "audio"]],
    ["audio/setDuck", ["clip", "audio"]],
    ["freeze/setAll", ["clip", "audio"]],
  ])("%s", (type, on) => {
    expect(offeredOn(type)).toEqual(on);
  });

  it("refuses the action on a kind without the prop, by name, where it used to break the file", () => {
    const exec = editor();
    const run = (input: ActionInput) => {
      const r = exec.execute(input);
      return r.ok ? "ok" : `${r.errors?.[0]?.code}: ${r.errors?.[0]?.message}`;
    };
    expect(run({ type: "clip/setSpeed", params: { id: "nested", speed: 2 } })).toBe(
      "INVALID_PARAMS: clip/setSpeed does not apply to <nested>",
    );
    expect(run({ type: "audio/setFade", params: { id: "nested", in: 0.5 } })).toBe(
      "INVALID_PARAMS: audio/setFade does not apply to <nested>",
    );
    expect(run({ type: "audio/setVolume", params: { id: "nested", volume: 0.5 } })).toBe("ok");
    expect(run({ type: "clip/setSource", params: { id: "caps", src: "asset:shot" } })).toBe(
      "INVALID_PARAMS: clip/setSource does not apply to <captions>",
    );
    expect(run({ type: "box/update", params: { id: "caps", box: { y: 900 } } })).toBe("ok");
  });
});
