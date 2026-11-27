import { createElement } from "react";

import { Audio, Clip, Composition, Shape, Sticker, Title, Track } from "@uberscene/kit";
import { collectModule, resolve } from "@uberscene/sdk/resolver";

import { mountPlayer } from "./helpers/react";
import { DEFAULT_MANIFEST } from "./helpers/state";
import { buildAudioPlan, buildFramePlan, visiblePlacements } from "./internal";

// An element whose props did not parse (`placement.parsed` false: a prop it cannot do without is missing or wrong)
// has its errors and its row, and no picture or sound: what draws an element reads its props as their types. One
// with a refused value that can be left out still parses, takes the default, and is drawn.

/** A tag without a prop its schema requires, which the types would not let a file write. */
const broken = (tag: unknown, props: Record<string, unknown>) => createElement(tag as never, props as never);

const state = () =>
  resolve(
    collectModule({
      default: () => (
        <Composition fps={30} width={640} height={360}>
          {broken(Clip, { id: "noSrc", in: 0, out: 2 })}
          <Clip id="good" src="asset:a" in={0} out={2} />
          <Track id="sound" layout="free">
            {broken(Audio, { id: "silent", start: 0, duration: 2 })}
          </Track>
          <Track id="over" layout="free">
            {broken(Sticker, { id: "noImage", start: 0, duration: 4 })}
            <Shape id="box" start={0} duration={4} type="rectangle" width={100} height={50} />
            <Title id="small" start={0} duration={4} style={{ size: -1, color: "#ff0000" }}>
              Hi
            </Title>
          </Track>
        </Composition>
      ),
      defaults: {},
    }),
    DEFAULT_MANIFEST,
  );

describe("an element whose props did not parse", () => {
  it("is unparsed only when a prop it cannot do without is wrong", () => {
    const s = state();
    const unparsed = [...s.items.values()].filter((p) => !p.parsed).map((p) => p.id);
    expect(unparsed.sort()).toEqual(["noImage", "noSrc", "silent"]);
    // Each still has its place and says what is wrong with it.
    for (const id of unparsed) expect(s.items.get(id)?.errors.length, id).toBeGreaterThan(0);
    expect(s.items.get("small")).toMatchObject({ parsed: true });
  });

  it("is not among what shows, on the canvas or the overlay plane", () => {
    const s = state();
    // The broken clip stands first on its track: where it would show, nothing of it does, on either plane.
    expect(visiblePlacements(s, 1).map((v) => v.placement.id)).toEqual(["box", "small"]);
    expect(buildFramePlan(s, 1).ops).toEqual([]);
    // It keeps its place on the track (a clip with no source lasts five seconds), and the clip after it is drawn.
    expect(s.items.get("good")).toMatchObject({ start: 5, end: 7 });
    expect(visiblePlacements(s, 6).map((v) => v.placement.id)).toEqual(["good"]);
    expect(buildFramePlan(s, 6).ops.map((op) => op.id)).toEqual(["good"]);
  });

  it("draws nothing as DOM, while what stands beside it is drawn", async () => {
    const m = await mountPlayer(state());
    await m.seek(1);
    const q = (id: string) => m.container.querySelector(`[data-el="${id}"]`);
    expect(q("noImage")).toBeNull();
    expect(q("box")).not.toBeNull();
    // A refused value that can be left out: the title is drawn, at the default size, in the colour written.
    const small = q("small") as HTMLElement | null;
    expect(small?.textContent).toBe("Hi");
    expect(small?.innerHTML).toContain("rgb(255, 0, 0)");
    expect(small?.innerHTML).not.toContain("-1px");
    await m.unmount();
  });

  it("plays no sound", () => {
    const s = state();
    // Only the clip that parsed is heard.
    expect([...new Set(buildAudioPlan(s, 0, 8).map((o) => o.id))]).toEqual(["good"]);
  });
});
