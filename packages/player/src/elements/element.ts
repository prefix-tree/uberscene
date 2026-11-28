// What the player says of one element kind, in the kind's own folder (`elements/<kind>/`), beside the kit's and the
// SDK's parts and typed by the kind's placement, so what draws a title reads a title's props as their types.
//
// It is parts in separate files, because the engine entry (`engine.ts`) must not load React: `index.ts` holds what the
// engine asks (a kind's size, typed here), `canvas.ts` what it paints on the canvas, `dom.tsx` how it is drawn as DOM
// (typed in `dom-drawing.ts`). Each has its registry (`elements/index.ts`, `elements/canvas.ts`, `elements/dom.tsx`),
// typed over the kinds that have folders and the plane each stands on, so a part left out does not compile.
import type { MigratedKind, PlaneOf } from "@uberscene/kit/schema";
import type { Placement, PlacementMap, ResolvedState } from "@uberscene/sdk/resolver";

import type { PlanContext } from "../model/canvas-ops";
import type { DrawOp } from "../model/frame-plan";
import type { VisibleItem } from "../model/visible";
import type { IntrinsicSize } from "../overlays/size";

/** The part the engine asks, with no React in it. */
export interface PlayerElement<K extends MigratedKind> {
  readonly kind: K;
  /**
   * Its own size before its box places it, and how it fills that box, at `rel` seconds into it. Left out, it is as
   * large as the frame. `loaded` is the text of its file, for a kind that reads one and once it has (an SVG's
   * markup).
   */
  readonly size?: (
    state: ResolvedState,
    placement: PlacementMap[K],
    children: readonly Placement[],
    rel: number,
    loaded?: string,
  ) => IntrinsicSize;
}

/** The kinds with a folder that paint on the canvas: each must have canvas ops (`elements/canvas.ts`), and no other may. */
export type CanvasKind = { [K in MigratedKind]: PlaneOf<K> extends "canvas" | "both" ? K : never }[MigratedKind];

/** What a kind paints on the canvas at a moment, in order, from its placement typed by its kind. */
export type CanvasOpsOf<K extends MigratedKind> = (
  ctx: PlanContext,
  item: VisibleItem & { readonly placement: PlacementMap[K] },
) => readonly DrawOp[];
