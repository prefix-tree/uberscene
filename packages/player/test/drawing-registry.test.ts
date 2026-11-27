import { KIND_CAPABILITIES, kindsWhere } from "@uberscene/kit/schema";

import { CANVAS_OPS } from "../src/model/canvas-ops";

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
  });
});
