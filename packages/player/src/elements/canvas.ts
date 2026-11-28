// What each kind with a folder of its own paints on the canvas, by kind. No React here: `engine.ts` loads it. A kind
// on the canvas plane must have an entry here, and a kind that is not must have none: the type says both, from the
// plane the kit gives the kind.
import { placed } from "@uberscene/sdk/resolver";

import type { CanvasOps } from "../model/canvas-ops";
import { adjustmentOps } from "./adjustment/canvas";
import { clipOps } from "./clip/canvas";
import type { CanvasKind, CanvasOpsOf } from "./element";
import { nestedOps } from "./nested/canvas";

export const PLAYER_CANVAS: { readonly [K in CanvasKind]: CanvasOpsOf<K> } = {
  clip: clipOps,
  adjustment: adjustmentOps,
  nested: nestedOps,
};

/** A kind's ops as the frame plan calls them, whatever the kind: it paints a placement of its kind that parsed. */
function loose<K extends CanvasKind>(kind: K): CanvasOps {
  return (ctx, item) => {
    const placement = placed(item.placement, kind);
    return placement ? PLAYER_CANVAS[kind](ctx, { ...item, placement }) : [];
  };
}

/** The canvas ops of the kinds with folders, for the table the frame plan asks (`CANVAS_OPS`). */
export const ELEMENT_CANVAS: Readonly<Record<string, CanvasOps>> = Object.fromEntries(
  (Object.keys(PLAYER_CANVAS) as CanvasKind[]).map((kind) => [kind, loose(kind)]),
);
