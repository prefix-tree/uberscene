import { KIND_CAPABILITIES, kindsWhere } from "@uberscene/kit/schema";

import { CANVAS_OPS } from "../src/model/canvas-ops";
import { INTRINSIC_SIZE, overlaySize } from "../src/overlays/size";
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
    for (const kind of Object.keys(CANVAS_OPS)) expect(KIND_CAPABILITIES[kind]).toBeDefined();
    for (const kind of Object.keys(INTRINSIC_SIZE)) expect(KIND_CAPABILITIES[kind]).toBeDefined();
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
