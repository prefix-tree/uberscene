// Times worked out by adding and subtracting seconds land on the frame they mean: an edit writes no float noise into
// the file and no time a frame late, and a length that is a sum of seconds is not refused for a hair.
import { describe, expect, it } from "vitest";

import { Clip, Composition, Title, Track, Transition } from "@uberscene/kit";
import { frameStartSeconds, framesUntil, parseRate } from "@uberscene/kit/schema";
import { collectModule, Executor, resolve } from "@uberscene/sdk";

const asset = (duration: number) => ({ id: "a", kind: "video", duration, fps: 30, width: 640, height: 360 });
const manifest = (duration = 60) => ({ assets: { a: asset(duration) } }) as never;

describe("an edit at a frame", () => {
  it("splits on the frame it is given, from 10 s up", () => {
    const Video = () => (
      <Composition fps={30} width={640} height={360}>
        <Track id="main" layout="free">
          <Clip id="c" src="asset:a" start={0} in={0} out={20} />
        </Track>
      </Composition>
    );
    const exec = new Executor({ tree: collectModule({ default: Video }), manifest: manifest() });
    const at = frameStartSeconds(302, parseRate(30));
    expect(exec.execute({ type: "clip/split", params: { id: "c", at, newId: "c_b" } }).ok).toBe(true);
    const right = exec.state().items.get("c_b")!;
    expect(framesUntil(right.start, parseRate(30))).toBe(302);
  });

  it("keeps a key at 0.1 s into the second half when a clip at 0.5 s is split at 0.6 s", () => {
    const Video = () => (
      <Composition fps={30} width={640} height={360}>
        <Track id="main" layout="free">
          <Title
            id="t"
            start={0.5}
            duration={2}
            transform={{
              opacity: [
                { at: 0, value: 0 },
                { at: 0.1, value: 1, easing: "hold" },
              ],
            }}
          >
            T
          </Title>
        </Track>
      </Composition>
    );
    const exec = new Executor({ tree: collectModule({ default: Video }), manifest: manifest() });
    expect(exec.execute({ type: "clip/split", params: { id: "t", at: 0.6, newId: "t_b" } }).ok).toBe(true);
    const keys = [...exec.state().items.values()].filter((p) => p.parent === "t_b" && p.kind === "keyframe");
    // One key at 0, the one that was at 0.1 s; not a second one at 0 with the value before it.
    expect(keys.map((k) => k.props.at)).toEqual([0]);
  });
});

describe("a length that is a sum of seconds", () => {
  it("takes a 0.2 s transition next to a clip from 1.1 s to 1.3 s", () => {
    const Video = () => (
      <Composition fps={30} width={640} height={360}>
        <Track id="main">
          <Clip id="a" src="asset:a" in={1.1} out={1.3} />
          <Transition id="x" type="crossfade" duration={0.2} />
          <Clip id="b" src="asset:a" in={4} out={6} />
        </Track>
      </Composition>
    );
    const state = resolve(collectModule({ default: Video }), manifest());
    expect(state.errors.filter((e) => e.code === "INSUFFICIENT_HANDLES")).toEqual([]);
  });

  it("lasts until a clip that ends off the ms grid, and not a frame more", () => {
    // 121 frames at 24 fps: 5.041666… s, which round3 would make 5.042.
    const Video = () => (
      <Composition fps={24} width={640} height={360}>
        <Track id="main">
          <Clip id="clip" src="asset:a" />
        </Track>
        <Track id="text" layout="free">
          <Title id="t" start={0} duration={{ until: "clip" }}>
            T
          </Title>
        </Track>
      </Composition>
    );
    const state = resolve(collectModule({ default: Video }), manifest(121 / 24));
    expect(framesUntil(state.items.get("t")!.end, parseRate(24))).toBe(121);
    expect(framesUntil(state.composition.duration, parseRate(24))).toBe(121);
  });
});
