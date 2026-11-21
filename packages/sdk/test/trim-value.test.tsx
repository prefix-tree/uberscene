// An edge moved on the timeline, as the value clip/trim takes: the source time for footage, the timeline time for the
// rest. A duration typed into an editor must give a clip that long, footage or not.
import { describe, expect, it } from "vitest";

import { Clip, Composition, Title, Track } from "@uberscene/kit";
import { collectModule, Executor, trimValue } from "@uberscene/sdk";

const manifest = { assets: { talk: { id: "talk", kind: "video", duration: 60, fps: 30, width: 640, height: 360 } } };
const Video = () => (
  <Composition fps={30} width={640} height={360}>
    <Track id="main" layout="free">
      <Clip id="c" src="asset:talk" start={10} in={2} out={7} />
      <Clip id="fast" src="asset:talk" start={20} in={2} out={8} speed={2} />
      <Title id="t" start={10} duration={5}>
        T
      </Title>
    </Track>
  </Composition>
);
const open = () => new Executor({ tree: collectModule({ default: Video }), manifest: manifest as never });

describe("trimValue", () => {
  it("is the timeline time for an element without a source", () => {
    expect(trimValue({ start: 10 }, 13)).toBe(13);
  });

  it("is the source time for footage, at its speed", () => {
    expect(trimValue({ start: 10, source: { in: 2, speed: 1 } }, 13)).toBe(5);
    expect(trimValue({ start: 20, source: { in: 2, speed: 2 } }, 21.5)).toBe(5);
  });

  it.each([
    ["c", 3],
    ["fast", 1.5],
    ["t", 3],
  ])("a duration typed for %s gives a clip that long", (id, duration) => {
    const exec = open();
    const item = exec.state().items.get(id)!;
    const result = exec.execute({
      type: "clip/trim",
      params: { id, edge: "out", value: trimValue(item, item.start + duration) },
    });
    expect(result.ok).toBe(true);
    expect(exec.state().items.get(id)?.duration).toBeCloseTo(duration, 6);
  });
});
