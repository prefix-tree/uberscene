import { capabilitiesOf, isKind, KIT_ELEMENTS, type Kind, kindsWhere } from "@uberscene/kit/schema";

import { PLAYER_ELEMENTS } from "../src/elements";
import { PLAYER_DOM } from "../src/elements/dom";
import { CANVAS_OPS } from "../src/model/canvas-ops";
import { INTRINSIC_SIZE, overlaySize } from "../src/overlays/size";
import { DOM_DRAWING } from "../src/react/elements";
import { makeState } from "./helpers/state";

// Each kind's drawing is an entry in a table, keyed by the kind: what it paints on the canvas (`CANVAS_OPS`), its own
// size (`INTRINSIC_SIZE`) and its DOM (`DOM_DRAWING`). The kind table says which plane a kind is drawn on
// (`ElementCapabilities.plane`), so the tables and it must agree: a kind added to one and not the other draws nothing.

const sorted = (kinds: Iterable<string>) => [...kinds].sort();

describe("the drawing tables", () => {
  it("have canvas ops for exactly the kinds drawn on the canvas", () => {
    expect(sorted(Object.keys(CANVAS_OPS))).toEqual(
      sorted(kindsWhere((kind) => kind.plane === "canvas" || kind.plane === "both")),
    );
  });

  it("have nothing for a kind the kind table does not know", () => {
    for (const kind of Object.keys(CANVAS_OPS)) expect(isKind(kind), kind).toBe(true);
    for (const kind of Object.keys(INTRINSIC_SIZE)) expect(isKind(kind), kind).toBe(true);
  });

  it("have a DOM drawing for exactly the kinds drawn as DOM", () => {
    expect(sorted(Object.keys(DOM_DRAWING))).toEqual(
      sorted(kindsWhere((kind) => kind.plane === "dom" || kind.plane === "both")),
    );
  });

  it("stand over every track what lasts the whole video, and run effects over what is DOM alone", () => {
    for (const [kind, drawing] of Object.entries(DOM_DRAWING)) {
      const traits = capabilitiesOf(kind as Kind);
      expect(drawing.where === "top", kind).toBe(traits.spansVideo);
      expect(drawing.effects === "pipeline", kind).toBe(traits.timed && traits.plane === "dom");
    }
  });

  it("hold the kinds with a folder of their own in their folders alone", () => {
    const migrated = Object.keys(KIT_ELEMENTS);
    expect(sorted(Object.keys(PLAYER_ELEMENTS))).toEqual(sorted(migrated));
    // On the DOM plane: a DOM drawing in the folder, which the table the DOM layer asks then holds.
    const dom = Object.values(KIT_ELEMENTS)
      .filter((element) => element.capabilities.plane === "dom")
      .map((element) => element.kind);
    expect(sorted(Object.keys(PLAYER_DOM))).toEqual(sorted(dom));
    for (const kind of dom) expect(DOM_DRAWING[kind], kind).toBeDefined();
    for (const kind of migrated) expect(INTRINSIC_SIZE[kind], kind).toBeUndefined();
  });

  it("size only what is drawn as DOM, and a kind with no size of its own is the frame's", () => {
    const dom = kindsWhere((kind) => kind.plane === "dom");
    for (const kind of Object.keys(INTRINSIC_SIZE)) expect(dom).toContain(kind);
    const state = makeState({
      tracks: [
        {
          id: "over",
          layout: "free",
          items: [
            { id: "l", kind: "layer", start: 0, duration: 2 },
            { id: "s", kind: "shape", start: 0, duration: 2, props: { type: "rectangle", width: 120, height: 80 } },
          ],
        },
      ],
    });
    const { width, height } = state.composition;
    expect(overlaySize(state, state.items.get("l")!, [], 0)).toEqual({ size: { width, height }, fit: "none" });
    expect(overlaySize(state, state.items.get("s")!, [], 0)).toEqual({ size: { width: 120, height: 80 }, fit: "none" });
  });
});
