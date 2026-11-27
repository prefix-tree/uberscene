// The resolver places in ticks (decisions 0044, 0045): a placement's `range` is a `TimeRange` of exact `Time`s, a
// sequence's cuts are sums of whole ticks, and the seconds beside it are derived from them.
import { describe, expect, it } from "vitest";

import { Clip, Composition, Gap, Title, Track, Transition } from "@uberscene/kit";
import { parseRate, Time, TimeRange } from "@uberscene/kit/schema";
import { collectModule, resolve } from "@uberscene/sdk";

const asset = (duration: number) => ({ id: "a", kind: "video", duration, fps: 30, width: 640, height: 360 });
const manifest = { assets: { a: asset(600) } } as never;
const T = Time.seconds;

describe("placement ranges", () => {
  it("starts each clip of a sequence on the exact sum of the lengths before it", () => {
    const lengths = [0.1, 0.2, 0.3, 0.7, 1.1, 0.4];
    const Video = () => (
      <Composition fps={30} width={640} height={360}>
        <Track id="main">
          {lengths.map((d, i) => (
            <Title key={i} id={`t${i}`} duration={d}>
              T
            </Title>
          ))}
        </Track>
      </Composition>
    );
    const state = resolve(collectModule({ default: Video }), manifest);
    let at = Time.ZERO;
    for (const [i, d] of lengths.entries()) {
      const p = state.items.get(`t${i}`)!;
      expect(p.range.start.equals(at)).toBe(true);
      expect(p.range.duration.equals(T(d))).toBe(true);
      // The seconds are derived from the ticks, so the float sum's noise is gone: t2 starts at 0.3, not 0.30000000000000004.
      expect(p.start).toBe(at.toSeconds());
      at = p.range.end;
    }
    expect(state.items.get("t2")!.start).toBe(0.3);
    expect(state.composition.length.equals(at)).toBe(true);
    expect(state.composition.duration).toBe(at.toSeconds());
  });

  it("puts every cut of a long 29.97 sequence on a frame start", () => {
    const rate = parseRate("29.97");
    // Clips that are a whole number of frames long, written in seconds as an editor writes them back.
    const frames = Array.from({ length: 400 }, (_, i) => 30 + ((i * 37) % 200));
    const Video = () => (
      <Composition fps="29.97" width={640} height={360}>
        <Track id="main">
          {frames.map((n, i) => (
            <Title key={i} id={`t${i}`} duration={Time.frames(n, rate).toSeconds()}>
              T
            </Title>
          ))}
        </Track>
      </Composition>
    );
    const state = resolve(collectModule({ default: Video }), manifest);
    let frame = 0;
    for (const [i, n] of frames.entries()) {
      expect(state.items.get(`t${i}`)!.range.start.equals(Time.frames(frame, rate))).toBe(true);
      frame += n;
    }
  });

  it("gives a clip's source its range in ticks", () => {
    const Video = () => (
      <Composition fps={30} width={640} height={360}>
        <Track id="main">
          <Clip id="c" src="asset:a" in={1.1} out={1.3} />
        </Track>
      </Composition>
    );
    const c = resolve(collectModule({ default: Video }), manifest).items.get("c")!;
    expect(c.source?.range.equals(TimeRange.of(T(1.1), T(0.2)))).toBe(true);
    expect(c.range.duration.equals(T(0.2))).toBe(true);
  });

  it("starts a transition exactly its length before the cut", () => {
    const Video = () => (
      <Composition fps={30} width={640} height={360}>
        <Track id="main">
          <Clip id="a1" src="asset:a" in={0} out={1.1} />
          <Transition id="x" type="crossfade" duration={0.2} />
          <Clip id="a2" src="asset:a" in={2} out={3.3} />
          <Gap id="g" duration={0.3} />
          <Title id="t" duration={1}>
            T
          </Title>
        </Track>
      </Composition>
    );
    const items = resolve(collectModule({ default: Video }), manifest).items;
    expect(items.get("x")!.range.equals(TimeRange.of(T(0.9), T(0.2)))).toBe(true);
    expect(items.get("a2")!.range.start.equals(T(0.9))).toBe(true);
    expect(items.get("t")!.range.start.equals(T(0.9 + 1.3 + 0.3))).toBe(true);
  });

  it("places keys at their element's start plus their at, in ticks", () => {
    const Video = () => (
      <Composition fps={30} width={640} height={360}>
        <Track id="main" layout="free">
          <Title
            id="t"
            start={0.3}
            duration={2}
            transform={{
              opacity: [
                { at: 0, value: 0 },
                { at: 0.1, value: 1 },
              ],
            }}
          >
            T
          </Title>
        </Track>
      </Composition>
    );
    const items = resolve(collectModule({ default: Video }), manifest).items;
    const keys = [...items.values()].filter((p) => p.parent === "t" && p.kind === "keyframe");
    expect(keys.map((k) => String(k.range.start))).toEqual(["0.3s", "0.4s"]);
  });
});
