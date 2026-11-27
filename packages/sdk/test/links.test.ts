import { describe, expect, it } from "vitest";

import {
  type CurveKey,
  curveAt,
  easingCurve,
  frameAt,
  type Generator,
  generatedValue,
  parseRate,
  secondsToTicks,
} from "@uberscene/kit/schema";
import {
  buildSourceIndex,
  collectModule,
  dependentsOf,
  Executor,
  foldToSource,
  loadModule,
  type ResolvedState,
  resolve,
} from "@uberscene/sdk";

import { manifest } from "./helpers";

const executor = (text: string): Executor =>
  new Executor({
    tree: collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }),
    manifest,
    now: () => 0,
  });

const file = (body: string, fps = "30") => `import { Camera, Composition, Shape, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={${fps}} width={1000} height={600}>
${body}
    </Composition>
  );
}
`;

const track = (...shapes: string[]) => `      <Track id="cards" layout="free">
${shapes.join("\n")}
      </Track>`;

const shape = (id: string, props: string, start: string | number = 1) =>
  `        <Shape id="${id}" start={${start}} duration={4} type="rectangle" width={100} height={100} ${props} />`;

const load = (text: string): ResolvedState =>
  resolve(collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }), manifest);

/** The keys and the generator the resolver left under `parent` for `property` (or an effect's param). */
function under(state: ResolvedState, parent: string, name: string) {
  const mine = [...state.items.values()].filter(
    (i) => i.parent === parent && (i.props.property === name || i.props.param === name),
  );
  const keys: CurveKey[] = mine
    .filter((i) => i.kind === "keyframe")
    .map((i) => ({ at: Number(i.props.at), value: i.props.value, easing: i.props.easing as string | undefined }))
    .sort((a, b) => a.at - b.at);
  const generator = mine.find((i) => i.kind === "generator")?.props as unknown as Generator | undefined;
  return { keys, generator, ids: mine.map((i) => i.id) };
}

/** The value a player reads for `property` of `id` at `rel` seconds into it: keys, then the generator. */
function valueAt(state: ResolvedState, id: string, property: string, rel: number): number {
  const { keys, generator } = under(state, id, property);
  // What is written when it has no keys: the constant, or a generator's base the resolver left there.
  const written = property.split(".").reduce<unknown>((at, seg) => (at as Record<string, unknown>)?.[seg], {
    ...state.items.get(id)?.props,
  });
  const fallback = typeof written === "number" ? written : 0;
  const ease = (name: string | undefined, x: number) => (easingCurve(name) ?? ((v: number) => v))(x);
  const base = (t: number): number => (keys.length === 0 ? fallback : Number(curveAt(keys, t, ease, "number")));
  return generator ? generatedValue(generator, rel, base) : base(rel);
}

const errorsOf = (state: ResolvedState) => state.errors.map((e) => `${e.code} ${e.id} ${e.prop ?? ""}: ${e.message}`);
const TIMES = [0, 0.1, 0.5, 1, 1.7, 2.4, 3.9];

describe("a value linked to another element's", () => {
  it("reads a constant, times scale plus offset", () => {
    const state = load(
      file(
        track(
          shape("logo", `transform={{ rotation: 30 }}`),
          shape("hand", `transform={{ rotation: { link: "logo.transform.rotation", scale: 2, offset: 5 } }}`),
        ),
      ),
    );
    expect(state.errors).toEqual([]);
    expect(under(state, "hand", "transform.rotation")).toEqual({
      keys: [{ at: 0, value: 65, easing: "linear" }],
      generator: undefined,
      ids: ["hand.transform.rotation.link.0"],
    });
    expect(state.items.get("hand")?.children).toEqual(["hand.transform.rotation.link.0"]);
    expect(state.items.has("hand.transform.rotation.link")).toBe(false);
  });

  it("reads what a value is when nothing is written there", () => {
    const state = load(
      file(
        track(
          shape("logo", ""),
          shape("hand", `transform={{ opacity: { link: "logo.transform.opacity", scale: 0.5 } }}`),
        ),
      ),
    );
    expect(state.errors).toEqual([]);
    expect(under(state, "hand", "transform.opacity").keys).toEqual([{ at: 0, value: 0.5, easing: "linear" }]);
  });

  it("copies keys, with their easing, when both start together", () => {
    const state = load(
      file(
        track(
          shape("logo", `transform={{ rotation: [{ at: 0, value: 0, easing: "snappy" }, { at: 1, value: 90 }] }}`),
          shape("hand", `transform={{ rotation: { link: "logo.transform.rotation", scale: -1 } }}`),
        ),
      ),
    );
    expect(state.errors).toEqual([]);
    expect(under(state, "hand", "transform.rotation").keys).toEqual([
      { at: 0, value: 0, easing: "snappy" },
      { at: 1, value: -90, easing: "linear" },
    ]);
    for (const t of TIMES)
      expect(valueAt(state, "hand", "transform.rotation", t)).toBeCloseTo(
        -valueAt(state, "logo", "transform.rotation", t),
        10,
      );
  });

  it("is the same moment of the video for elements that start apart, a delay later", () => {
    const state = load(
      file(
        track(
          shape("logo", `transform={{ rotation: [{ at: 0, value: 0 }, { at: 1, value: 90 }] }}`, 1),
          shape("hand", `transform={{ rotation: { link: "logo.transform.rotation", delay: 0.5 } }}`, 2),
        ),
      ),
    );
    expect(state.errors).toEqual([]);
    // The logo's keys are at 1 s and 2 s of the video; half a second later is 1.5 s and 2.5 s, which the hand, starting
    // at 2 s, counts as -0.5 s and 0.5 s. A key before its element's start is kept: the move is under way as it starts.
    expect(under(state, "hand", "transform.rotation").keys).toEqual([
      { at: -0.5, value: 0, easing: "linear" },
      { at: 0.5, value: 90, easing: "linear" },
    ]);
    expect(valueAt(state, "hand", "transform.rotation", 0)).toBeCloseTo(45, 10);
    // Its place on the timeline is never before the video starts.
    expect(state.items.get("hand.transform.rotation.link.0")?.range.start.toSeconds()).toBe(1.5);
  });

  it.each([
    ["24", 24, 1],
    ['"29.97"', 30000, 1001],
  ])("lands a delayed key on its frame at %s fps", (fps, num, den) => {
    // Everything is a whole number of frames: the logo starts on frame 10, its key is 7 frames in, the hand starts
    // on frame 3 and runs 5 frames late. The hand's key must then be on frame 10 + 7 + 5 = 22 of the video.
    const frames = (n: number) => `{${n} * ${den} / ${num}}`.slice(1, -1);
    const state = load(
      file(
        track(
          shape("logo", `transform={{ rotation: [{ at: 0, value: 0 }, { at: ${frames(7)}, value: 90 }] }}`, frames(10)),
          shape(
            "hand",
            `transform={{ rotation: { link: "logo.transform.rotation", delay: ${frames(5)} } }}`,
            frames(3),
          ),
        ),
        fps,
      ),
    );
    expect(state.errors).toEqual([]);
    const rate = parseRate(fps.replace(/"/g, ""));
    const key = state.items.get("hand.transform.rotation.link.1");
    expect(key?.range.start.frame(rate)).toBe(22);
    expect(key?.range.start.isOnFrame(rate)).toBe(true);
    // And as the player counts it: the hand's start plus the key's time, in ticks.
    const hand = state.items.get("hand");
    const ticks = (hand?.range.start.ticks ?? 0) + secondsToTicks(Number(key?.props.at));
    expect(frameAt(ticks, rate)).toBe(22);
  });

  it("reads through a chain of links", () => {
    const state = load(
      file(
        track(
          shape("c", `transform={{ rotation: { link: "b.transform.rotation", offset: 1 } }}`),
          shape("b", `transform={{ rotation: { link: "a.transform.rotation", scale: 2 } }}`),
          shape("a", `transform={{ rotation: [{ at: 0, value: 10 }, { at: 2, value: 20 }] }}`),
        ),
      ),
    );
    expect(state.errors).toEqual([]);
    expect(under(state, "c", "transform.rotation").keys).toEqual([
      { at: 0, value: 21, easing: "linear" },
      { at: 2, value: 41, easing: "linear" },
    ]);
  });

  it.each([
    ["a wiggle", `{ type: "wiggle", amount: 6, frequency: 2, base: [{ at: 0, value: 0 }, { at: 2, value: 40 }] }`],
    ["a wiggle on a constant", `{ type: "wiggle", amount: 6, base: 12 }`],
    ["a drift", `{ type: "drift", speed: 9, base: 3 }`],
    ["a loop", `{ type: "loop", keys: [{ at: 0, value: 0 }, { at: 0.5, value: 30 }, { at: 1, value: 0 }] }`],
    [
      "a loop back and forth",
      `{ type: "loop", mode: "pingpong", keys: [{ at: 0.25, value: 0 }, { at: 1, value: 30 }] }`,
    ],
  ])("follows %s, scaled, at every moment", (_name, generator) => {
    const state = load(
      file(
        track(
          shape("logo", `transform={{ rotation: ${generator} }}`, 1),
          shape(
            "hand",
            `transform={{ rotation: { link: "logo.transform.rotation", scale: 0.5, offset: 4, delay: 0.25 } }}`,
            1.5,
          ),
        ),
      ),
    );
    expect(state.errors).toEqual([]);
    // The hand at `t` reads the logo 0.25 s ago: the hand starts 0.5 s after the logo, so that is `t + 0.25` there.
    for (const t of TIMES)
      expect(valueAt(state, "hand", "transform.rotation", t)).toBeCloseTo(
        0.5 * valueAt(state, "logo", "transform.rotation", t + 0.25) + 4,
        9,
      );
  });

  it("links one axis of a scale, and both when it names the pair", () => {
    const state = load(
      file(
        track(
          shape("logo", `transform={{ scale: [{ at: 0, value: { x: 1, y: 2 } }, { at: 1, value: { x: 3, y: 4 } }] }}`),
          shape("one", `transform={{ scale: { x: { link: "logo.transform.scale.y" }, y: 1 } }}`),
          shape("both", `transform={{ scale: { link: "logo.transform.scale" } }}`),
        ),
      ),
    );
    expect(state.errors).toEqual([]);
    expect(under(state, "one", "transform.scale.x").keys.map((k) => k.value)).toEqual([2, 4]);
    expect(under(state, "both", "transform.scale.x").keys.map((k) => k.value)).toEqual([1, 3]);
    expect(under(state, "both", "transform.scale.y").keys.map((k) => k.value)).toEqual([2, 4]);
  });

  it("links an effect's param, and to one", () => {
    const state = load(
      file(
        track(
          shape("logo", `effects={[{ type: "blur", radius: [{ at: 0, value: 0 }, { at: 1, value: 12 }] }]}`),
          shape("soft", `effects={[{ type: "blur", radius: { link: "logo.effects.0.radius", scale: 2 } }]}`),
          shape("turn", `transform={{ rotation: { link: "logo.effects.0.radius" } }}`),
        ),
      ),
    );
    expect(state.errors).toEqual([]);
    expect(under(state, "soft.effects.0", "radius").keys.map((k) => [k.at, k.value])).toEqual([
      [0, 0],
      [1, 24],
    ]);
    expect(under(state, "turn", "transform.rotation").keys.map((k) => k.value)).toEqual([0, 12]);
  });

  it("puts a camera's value on the video's clock", () => {
    const state = load(
      file(`      <Camera id="cam" zoom={{ link: "card.transform.scale.x" }}>
${track(shape("card", `transform={{ scale: [{ at: 0, value: 1 }, { at: 1, value: 1.5 }] }}`, 2))}
      </Camera>`),
    );
    expect(state.errors).toEqual([]);
    // The card starts at 2 s, so its key one second in is at 3 s of the video, where a camera's keys are counted.
    expect(under(state, "cam", "camera.zoom").keys.map((k) => [k.at, k.value])).toEqual([
      [2, 1],
      [3, 1.5],
    ]);
  });

  it("is listed as a dependent of the element it names", () => {
    const state = load(
      file(track(shape("logo", ""), shape("hand", `transform={{ rotation: { link: "logo.transform.rotation" } }}`))),
    );
    expect(dependentsOf(state, "logo")).toEqual([{ kind: "link", id: "hand", prop: "transform.rotation" }]);
    expect(state.refs.from.get("hand")).toMatchObject([{ type: "link", to: "logo", prop: "transform.rotation" }]);
  });
});

describe("a link that cannot be read", () => {
  const one = (link: string, logo = "") =>
    errorsOf(load(file(track(shape("logo", logo), shape("hand", `transform={{ rotation: { link: "${link}" } }}`)))));

  it("names an element that does not exist", () => {
    expect(one("nope.transform.rotation")).toEqual([
      'UNKNOWN_REF hand transform.rotation: transform.rotation links to "nope.transform.rotation", and there is no element "nope"',
    ]);
  });

  it("names a value that is not a number", () => {
    expect(one("logo.fill")).toEqual([
      'WRONG_KIND hand transform.rotation: transform.rotation links to "logo.fill", which is not a number: a link reads a number',
    ]);
  });

  it("names a path the element does not have", () => {
    expect(one("logo.volume")).toEqual([
      'WRONG_KIND hand transform.rotation: transform.rotation links to "logo.volume": a shape has no "volume" that changes over time',
    ]);
  });

  it("names an effect the element does not have", () => {
    expect(one("logo.effects.2.radius")).toEqual([
      'SCHEMA hand transform.rotation: transform.rotation links to "logo.effects.2.radius": "logo" has no effect 2',
    ]);
  });

  it("names a place nothing is written at", () => {
    expect(one("logo.box.x")).toEqual([
      'SCHEMA hand transform.rotation: transform.rotation links to a value with nothing to read: "logo" writes no box.x: write one to link to it',
    ]);
  });

  it("is written wrong: no value named, a field a link does not have, a delay backwards", () => {
    const written = (link: string) =>
      errorsOf(load(file(track(shape("logo", ""), shape("hand", `transform={{ rotation: ${link} }}`)))));
    expect(written(`{ link: "logo" }`)).toEqual([
      'SCHEMA hand transform.rotation.link: a link names an element and one of its values, as "logo.transform.rotation"',
    ]);
    expect(written(`{ link: "logo.transform.rotation", times: 2 }`)).toEqual([
      'SCHEMA hand transform.rotation: Unrecognized key: "times"',
    ]);
    expect(written(`{ link: "logo.transform.rotation", delay: -1 }`)).toEqual([
      "SCHEMA hand transform.rotation.delay: Too small: expected number to be >=0",
    ]);
  });

  it("goes round in a circle, said once with its path", () => {
    const state = load(
      file(
        track(
          shape("a", `transform={{ rotation: { link: "b.transform.rotation" } }}`),
          shape("b", `transform={{ rotation: { link: "c.transform.rotation" } }}`),
          shape("c", `transform={{ rotation: { link: "a.transform.rotation" } }}`),
        ),
      ),
    );
    expect(errorsOf(state)).toEqual([
      'CYCLE a transform.rotation: links go round in a circle: "a.transform.rotation" → "b.transform.rotation" → "c.transform.rotation" → "a.transform.rotation"; write a number or keys in place of one of these links',
    ]);
    // No item of a link is left for a player to read as a generator.
    expect([...state.items.values()].filter((i) => i.props.type === "link")).toEqual([]);
  });

  it("is not a circle when two elements read different values of each other", () => {
    const state = load(
      file(
        track(
          shape("a", `transform={{ rotation: { link: "b.transform.opacity", scale: 90 }, opacity: 0.5 }}`),
          shape("b", `transform={{ opacity: 0.25, borderRadius: { link: "a.transform.rotation" } }}`),
        ),
      ),
    );
    expect(state.errors).toEqual([]);
    expect(under(state, "b", "transform.borderRadius").keys.map((k) => k.value)).toEqual([22.5]);
  });

  it("is refused on a value the camera's push sets", () => {
    const state = load(
      file(`      <Camera id="cam" push={{ on: ["card"] }} zoom={{ link: "card.transform.scale.x" }}>
${track(shape("card", `box={{ x: 1400, y: 300, width: 100, height: 100 }}`, 2))}
      </Camera>`),
    );
    expect(errorsOf(state)).toEqual([
      "SCHEMA cam zoom: the camera's push sets its zoom, so it cannot be linked as well: take the push off, or link another value",
    ]);
  });
});

describe("editing around a link", () => {
  const text = file(
    track(
      shape(
        "logo",
        `transform={{ rotation: [{ at: 0, value: 0 }, { at: 1, value: 90, easing: "snappy" }, { at: 2, value: 0 }] }}`,
        1,
      ),
      shape(
        "hand",
        `transform={{ rotation: { link: "logo.transform.rotation", scale: 2, delay: 0.5 }, opacity: { link: "logo.transform.rotation", scale: 0.01 } }}`,
        2,
      ),
    ),
  );

  it("refuses keys and a generator on a linked value, saying where to change it", () => {
    const exec = executor(text);
    const message =
      '"transform.rotation" of "hand" is a link to logo.transform.rotation, so it has no keys of its own: change that value\'s keys, or write a number or keys here in place of the link';
    const add = exec.can({ type: "key/add", params: { id: "hand", path: "transform.rotation", at: 1, value: 3 } });
    expect(add).toMatchObject({ ok: false, errors: [{ message }] });
    const wiggle = exec.can({
      type: "generator/set",
      params: { id: "hand", path: "transform.rotation", generator: { type: "wiggle", amount: 2 } },
    });
    expect(wiggle).toMatchObject({ ok: false, errors: [{ message }] });
    // A value beside it takes keys as ever.
    expect(exec.can({ type: "key/add", params: { id: "hand", path: "box.x", at: 1, value: 3 } }).ok).toBe(true);
  });

  it("keeps the motion when the element it names is removed, and undoes it", () => {
    const exec = executor(text);
    const before = exec.state();
    expect(before.errors).toEqual([]);
    const was = TIMES.map((t) => valueAt(before, "hand", "transform.rotation", t));
    const result = exec.execute({ type: "element/remove", params: { id: "logo" } });
    expect(result.errors ?? []).toEqual([]);
    const after = exec.state();
    expect(after.errors).toEqual([]);
    expect(after.refs.from.get("hand") ?? []).toEqual([]);
    // The hand starts 1 s after the logo and reads it 0.5 s late: its keys were at -0.5, 0.5 and 1.5 of its own time.
    // The one before its start is cut where the hand begins, at the value it had there.
    const transform = after.tree.byId.get("hand")?.props.transform as Record<string, unknown>;
    expect(transform.rotation).toEqual([
      { at: 0, value: 90 },
      { at: 0.5, value: 180, easing: "snappy" },
      { at: 1.5, value: 0 },
    ]);
    // The other link has no delay: its keys were at -1, 0 and 1, so the one at the hand's start stays as it is.
    expect(transform.opacity).toEqual([
      { at: 0, value: 0.9, easing: "snappy" },
      { at: 1, value: 0 },
    ]);
    // From the first key the file can hold, it moves as it did.
    TIMES.filter((t) => t >= 0.5).forEach((t) => {
      expect(valueAt(after, "hand", "transform.rotation", t)).toBeCloseTo(was[TIMES.indexOf(t)] as number, 9);
    });
    // The file it folds to reads back with no link and no errors.
    const saved = foldToSource(text, exec.log(), exec.state());
    expect(saved.text).not.toContain("link:");
    expect(load(saved.text).errors).toEqual([]);
    exec.undo();
    expect(exec.state().tree.byId.get("hand")?.props).toEqual(before.tree.byId.get("hand")?.props);
    expect(exec.state().items.has("logo")).toBe(true);
  });

  it("keeps a wobble as a wobble of its own", () => {
    const exec = executor(
      file(
        track(
          shape("logo", `transform={{ rotation: { type: "wiggle", amount: 4, frequency: 2, seed: 7, base: 10 } }}`),
          shape("hand", `transform={{ rotation: { link: "logo.transform.rotation", scale: 2 } }}`),
        ),
      ),
    );
    const was = TIMES.map((t) => valueAt(exec.state(), "hand", "transform.rotation", t));
    exec.execute({ type: "element/remove", params: { id: "logo" } });
    expect(exec.state().errors).toEqual([]);
    const transform = exec.state().tree.byId.get("hand")?.props.transform as Record<string, unknown>;
    expect(transform.rotation).toEqual({
      type: "wiggle",
      base: 20,
      amount: 8,
      frequency: 2,
      seed: 7,
    });
    // Both started together, so the wobble is the same one.
    TIMES.forEach((t, i) => {
      expect(valueAt(exec.state(), "hand", "transform.rotation", t)).toBeCloseTo(was[i] as number, 9);
    });
  });
});
