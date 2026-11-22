// The player's audio sources, one per asset: one that cannot be decoded is closed, a failed open is tried again on
// the next request instead of silencing the asset until a remount, and only so many stay open at once.
import type { AudioSourceInfo } from "../src/types";
import { FakeAudioOutput, FakeAudioSource, fakeResolver } from "./helpers/fakes";
import { makeState } from "./helpers/state";
import { ManualClock, PlayerCore } from "./internal";

type Media = ConstructorParameters<typeof PlayerCore>[0]["media"];
const state = makeState({ tracks: [{ id: "main", items: [] }] });

/** A source whose open can be told to report an undecodable file. */
class Source extends FakeAudioSource {
  static decodable = true;
  override open(): Promise<AudioSourceInfo> {
    return super.open().then((info) => ({ ...info, decodable: Source.decodable }));
  }
}

function make(media: Media) {
  const made: Source[] = [];
  const factory = (id: string) => {
    const s = new Source(id);
    made.push(s);
    return s;
  };
  const core = new PlayerCore({
    state,
    media,
    clock: new ManualClock(),
    audioOutput: new FakeAudioOutput(),
    toContextTime: (t) => t,
    audioSourceFactory: factory,
    raf: () => 0,
    cancelRaf: () => {},
  });
  const ask = (id: string) =>
    (core as unknown as { audioSource(id: string, f: typeof factory): Promise<Source> }).audioSource(id, factory);
  return { made, ask };
}

afterEach(() => {
  Source.decodable = true;
});

describe("the player's audio sources", () => {
  it("closes a source that opens but cannot be decoded, and tries again on the next request", async () => {
    const { made, ask } = make(fakeResolver(["a"]));
    Source.decodable = false;
    await expect(ask("a")).rejects.toThrow(/cannot be decoded/);
    expect(made).toHaveLength(1);
    expect(made[0]?.closed).toBe(true);
    Source.decodable = true;
    const second = await ask("a");
    expect(made).toHaveLength(2);
    expect(second).toBe(made[1]);
    expect(second.closed).toBe(false);
  });

  it("asks the media again after a failed resolve, instead of staying silent", async () => {
    const inner = fakeResolver(["a"]);
    let fail = true;
    const { ask } = make({
      resolve: (id: string) => (fail ? Promise.reject(new Error("network hiccup")) : inner.resolve(id)),
    });
    await expect(ask("a")).rejects.toThrow("network hiccup");
    fail = false;
    await expect(ask("a")).resolves.toBeInstanceOf(Source);
  });

  it("keeps at most eight open, closing the ones asked for longest ago", async () => {
    const ids = Array.from({ length: 10 }, (_, i) => `s${i}`);
    const { made, ask } = make(fakeResolver(ids));
    for (const id of ids.slice(0, 8)) await ask(id);
    // s0 asked for again: now the newest, so s1 and s2 are the ones closed when s8 and s9 open.
    await ask("s0");
    await ask("s8");
    await ask("s9");
    await new Promise((r) => setTimeout(r, 0));
    expect(made).toHaveLength(10);
    expect(made.filter((s) => s.closed).map((s) => s.id)).toEqual(["s1", "s2"]);
  });
});
