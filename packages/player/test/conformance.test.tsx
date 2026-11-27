import { type DrawPlane, KIT_ELEMENTS, type MigratedKind } from "@uberscene/kit/schema";
import { buildSourceIndex, collectModule, loadModule, placed, resolve } from "@uberscene/sdk";

import { SAMPLE, SAMPLE_KINDS, sampleFile } from "../../sdk/test/conformance/sample";
import { elementSize, PLAYER_ELEMENTS } from "../src/elements";
import { overlaySize } from "../src/overlays/size";
import { mountPlayer } from "./helpers/react";
import { DEFAULT_MANIFEST } from "./helpers/state";
import { buildFramePlan, visiblePlacements } from "./internal";

// The conformance suite's part in the player (the rest is `packages/sdk/test/conformance`): every kind that has a
// folder of its own is drawn from its sample, on the plane the kit says it stands on.

/** The plane the kit says a kind stands on, as any plane: today every kind with a folder is on the DOM's. */
const planeOf = (kind: MigratedKind): DrawPlane => KIT_ELEMENTS[kind].capabilities.plane;

describe.each(SAMPLE_KINDS)("a %s", (kind) => {
  const file = sampleFile(kind);
  const load = () =>
    resolve(
      collectModule(loadModule(file.text) as never, {}, { index: buildSourceIndex(file.text) }),
      DEFAULT_MANIFEST,
    );

  it("shows while it is on the timeline, at a size of its own", () => {
    const state = load();
    expect(state.errors).toEqual([]);
    expect(visiblePlacements(state, 1).map((v) => v.placement.id)).toContain(SAMPLE);
    const placement = placed(state.items.get(SAMPLE), kind);
    expect(placement).toBeDefined();
    if (!placement) return;
    const drawn = overlaySize(state, placement, [], 1);
    expect(drawn.size.width).toBeGreaterThan(0);
    expect(drawn.size.height).toBeGreaterThan(0);
    // A kind that says a size says it in its folder, and that is the size the player places it at.
    if (PLAYER_ELEMENTS[kind].size) expect(elementSize(state, placement, [], 1)).toEqual(drawn);
  });

  it("is drawn on its plane", async () => {
    const state = load();
    const plane = planeOf(kind);
    const m = await mountPlayer(state);
    await m.seek(1);
    const cell = m.container.querySelector(`[data-el="${SAMPLE}"]`) as HTMLElement | null;
    const onCanvas = buildFramePlan(state, 1).ops.some((op) => op.id === SAMPLE);
    // The DOM plane: an element in the page with something in it. The canvas: an op in the frame's plan.
    expect(cell !== null, "a cell on the overlay plane").toBe(plane === "dom" || plane === "both");
    if (cell && plane === "dom") expect(cell.innerHTML.length).toBeGreaterThan(0);
    expect(onCanvas, "an op on the canvas").toBe(plane === "canvas" || plane === "both");
    await m.unmount();
  });
});
