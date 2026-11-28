// What each kind paints on the canvas at a moment. `buildFramePlan` asks this table for every visible item, in draw
// order; a kind with no entry paints nothing there (the DOM layer draws the overlays). Each kind says its ops in its
// own folder (`elements/<kind>/canvas.ts`).
import type { ResolvedState } from "@uberscene/sdk/resolver";

import { ELEMENT_CANVAS } from "../elements/canvas";
import type { DrawOp, ResolveNested } from "./frame-plan";
import type { VisibleItem } from "./visible";

/** What a kind's ops are planned from: the state and the moment, and what the plan holds so far. */
export interface PlanContext {
  readonly state: ResolvedState;
  readonly t: number;
  readonly resolveNested: ResolveNested | undefined;
  /** What the plan could not draw as written; an op function adds to it. */
  readonly warnings: string[];
  /** The ops planned before this item, beneath it. */
  readonly ops: readonly DrawOp[];
  /** The canvas the item's track paints on (`trackBands`); 0 is the first. */
  readonly band: number;
}

/** The ops one visible item paints, in order. They are put on the item's band by the plan. */
export type CanvasOps = (ctx: PlanContext, item: VisibleItem) => readonly DrawOp[];

export const CANVAS_OPS: Readonly<Record<string, CanvasOps>> = ELEMENT_CANVAS;
