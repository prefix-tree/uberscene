import { mountPlayer } from "./helpers/react";
import { makeState } from "./helpers/state";
import { bandPlan, buildFramePlan, trackBands } from "./internal";

const clip = (id: string) => ({ id, kind: "clip", source: { in: 0, out: 4, asset: "a" } });
const shape = (id: string) => ({
  id,
  kind: "shape",
  start: 0,
  duration: 4,
  props: { type: "rectangle", width: 200, height: 100, fill: "#2244ff" },
});
const main = { id: "main", items: [clip("talk")] };
const cards = { id: "cards", layout: "free" as const, items: [shape("card")] };
const cutout = { id: "cutout", layout: "free" as const, items: [{ ...clip("speaker"), start: 0 }] };
const titles = {
  id: "titles",
  layout: "free" as const,
  items: [{ id: "name", kind: "title", start: 0, duration: 4, props: { text: "Hi" } }],
};
const grade = {
  id: "grade",
  layout: "free" as const,
  items: [{ id: "adj", kind: "adjustment", start: 0, duration: 4, props: { effects: [{ type: "sepia" }] } }],
};

/** The interview layout: footage, a card over it, a cut-out speaker over the card, a title on top. */
const interview = () => makeState({ tracks: [main, cards, cutout, titles] });

describe("tracks stack in the order the file writes them", () => {
  it("gives each run of footage tracks a canvas, and the overlays between them a place between", () => {
    const bands = trackBands(interview());
    expect(bands.count).toBe(2);
    expect(Object.fromEntries(bands.bandOf)).toEqual({ main: 0, cards: 0, cutout: 1, titles: 1 });
    expect(Object.fromEntries(bands.slotOf)).toEqual({ cards: 0, titles: 1 });
  });

  it("keeps one canvas for a file whose footage is in one run, however many overlay tracks it has", () => {
    expect(trackBands(makeState({ tracks: [main, cards, titles] })).count).toBe(1);
    expect(trackBands(makeState({ tracks: [main, cutout, cards, titles] })).count).toBe(1);
    expect(trackBands(makeState({ tracks: [cards, main, titles] })).count).toBe(1);
    expect(trackBands(makeState({ tracks: [cards, titles] })).count).toBe(1);
    // An adjustment is painted on the canvas; it does not split the footage.
    expect(trackBands(makeState({ tracks: [main, grade, cutout] })).count).toBe(1);
    // A hidden overlay track draws nothing, so nothing sits between.
    expect(trackBands(makeState({ tracks: [main, { ...cards, hidden: true }, cutout] })).count).toBe(1);
  });

  it("puts overlays beneath all footage under the first canvas, and those of an overlay-only file above it", () => {
    expect(trackBands(makeState({ tracks: [cards, main, titles] })).slotOf.get("cards")).toBe(-1);
    expect(trackBands(makeState({ tracks: [cards, titles] })).slotOf.get("cards")).toBe(0);
  });

  it("plans the upper footage on its own band, and leaves a one-band plan as it always was", () => {
    const plan = buildFramePlan(interview(), 1);
    expect(plan.bands).toBe(2);
    expect(plan.ops.map((o) => [o.id, o.band])).toEqual([
      ["talk", undefined],
      ["speaker", 1],
    ]);
    const one = buildFramePlan(makeState({ tracks: [main, cards, titles] }), 1);
    expect(one.bands).toBeUndefined();
    expect(one.ops.every((o) => o.band === undefined)).toBe(true);
  });

  it("splits a plan by canvas: the first keeps the background, the upper ones are clear", () => {
    const plan = buildFramePlan(interview(), 1);
    const lower = bandPlan(plan, 0);
    const upper = bandPlan(plan, 1);
    expect(lower.ops.map((o) => o.id)).toEqual(["talk"]);
    expect(lower.clear).toBeUndefined();
    expect(upper.ops.map((o) => o.id)).toEqual(["speaker"]);
    expect(upper.clear).toBe(true);
    expect(upper.atop).toBe(true);
    const one = buildFramePlan(makeState({ tracks: [main, titles] }), 1);
    expect(bandPlan(one, 0)).toBe(one);
  });

  it("an adjustment above both runs covers the footage of each", () => {
    const plan = buildFramePlan(makeState({ tracks: [main, cards, cutout, grade] }), 1);
    expect(bandPlan(plan, 0).ops.map((o) => o.id)).toEqual(["talk", "adj"]);
    expect(bandPlan(plan, 1).ops.map((o) => o.id)).toEqual(["speaker", "adj"]);
    // One between the runs covers only what is beneath it.
    const between = buildFramePlan(makeState({ tracks: [main, grade, cards, cutout] }), 1);
    expect(bandPlan(between, 0).ops.map((o) => o.id)).toEqual(["talk", "adj"]);
    expect(bandPlan(between, 1).ops.map((o) => o.id)).toEqual(["speaker"]);
  });

  it("says when a blend cannot reach the footage beneath an overlay track", () => {
    const blended = { ...cutout, items: [{ ...clip("speaker"), start: 0, props: { blend: "multiply" } }] };
    const plan = buildFramePlan(makeState({ tracks: [main, cards, blended] }), 1);
    expect(plan.warnings.join()).toContain('"speaker" blends with the footage on its own run of tracks only');
    expect(buildFramePlan(makeState({ tracks: [main, blended, cards] }), 1).warnings).toEqual([]);
  });

  it("mounts canvas, card, canvas, title, bottom to top", async () => {
    const m = await mountPlayer(interview());
    await m.seek(1);
    const root = m.container.querySelector("[data-player]") as HTMLElement;
    const layers = [...root.children]
      .map((c) => c as HTMLElement)
      .filter((c) => c.tagName === "CANVAS" || c.dataset.domLayer !== undefined)
      .sort((a, b) => Number(a.style.zIndex) - Number(b.style.zIndex))
      .map((c) =>
        c.tagName === "CANVAS"
          ? `canvas ${c.dataset.band ?? 0}`
          : [...c.querySelectorAll("[data-el]")].map((e) => (e as HTMLElement).dataset.el).join(),
      );
    expect(layers).toEqual(["canvas 0", "card", "canvas 1", "name"]);
    await m.unmount();
  });

  it("mounts one canvas for a file with one run of footage", async () => {
    const m = await mountPlayer(makeState({ tracks: [main, cards, titles] }));
    await m.seek(1);
    expect(m.container.querySelectorAll("canvas[data-band]").length).toBe(0);
    expect(m.container.querySelector('[data-dom-layer=""] [data-el="card"]')).not.toBeNull();
    await m.unmount();
  });
});
