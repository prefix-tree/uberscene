// What the player says of one element kind, in the kind's own folder (`elements/<kind>/`), beside the kit's and the
// SDK's parts and typed by the kind's placement, so what draws a title reads a title's props as their types.
//
// It is parts in separate files, because the engine entry (`engine.ts`) must not load React: `index.ts` holds what the
// engine asks (a kind's size, typed here), `canvas.ts` what it paints on the canvas, `dom.tsx` how it is drawn as DOM
// (typed in `dom-drawing.ts`). Each has its registry (`elements/index.ts`, `elements/canvas.ts`, `elements/dom.tsx`),
// typed over the kinds that have folders and the plane each stands on, so a part left out does not compile.
import type { MigratedKind, PlaneOf } from "@uberscene/kit/schema";
import type { AssetEntry, Placement, PlacementMap, ResolvedState, ResolvedTrack } from "@uberscene/sdk/resolver";

import type { AudioOccurrence } from "../model/audio-plan";
import type { PlanContext } from "../model/canvas-ops";
import type { DrawOp, ResolveNested } from "../model/frame-plan";
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
  /**
   * The asset frames are decoded from to paint it, and the matte read beside them, for a kind that paints decoded
   * video: what the decoder pool keeps a decoder open for near the play head. Left out, nothing is decoded for it.
   */
  readonly decodes?: (state: ResolvedState, placement: PlacementMap[K]) => Decoded | null;
  /** How it is heard, for a kind whose sound is not its asset's alone (a nested sequence plays its own tracks). */
  readonly sound?: Sound<K>;
}

/** What a placement is decoded from: its asset, and the asset of its matte. */
export interface Decoded {
  readonly asset: AssetEntry;
  readonly matte: string | null;
}

/** How a kind is heard, in place of playing its own asset: what it plays, and whether it is heard at all. */
export interface Sound<K extends MigratedKind> {
  readonly occurrences: (input: SoundInput<K>) => readonly AudioOccurrence[];
  /** Whether it makes any sound over its stretch, for what ducks under it. */
  readonly heard: (state: ResolvedState, placement: PlacementMap[K]) => boolean;
}

/** What a kind's sound is planned from. */
export interface SoundInput<K extends MigratedKind> {
  readonly state: ResolvedState;
  readonly placement: PlacementMap[K];
  readonly track: ResolvedTrack;
  readonly from: number;
  readonly to: number;
  readonly resolveNested: ResolveNested | undefined;
}

/** The kinds with a folder that paint on the canvas: each must have canvas ops (`elements/canvas.ts`), and no other may. */
export type CanvasKind = { [K in MigratedKind]: PlaneOf<K> extends "canvas" | "both" ? K : never }[MigratedKind];

/** What a kind paints on the canvas at a moment, in order, from its placement typed by its kind. */
export type CanvasOpsOf<K extends MigratedKind> = (
  ctx: PlanContext,
  item: VisibleItem & { readonly placement: PlacementMap[K] },
) => readonly DrawOp[];
