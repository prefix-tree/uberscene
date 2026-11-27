// What the player says of one element kind, in the kind's own folder (`elements/<kind>/`), beside the kit's and the
// SDK's parts and typed by the kind's placement, so what draws a title reads a title's props as their types.
//
// It is two parts in two files, because the engine entry (`engine.ts`) must not load React: `index.ts` holds what the
// engine asks (a kind's size, typed here), `dom.tsx` how it is drawn as DOM (typed in `dom-drawing.ts`). Each has its
// registry (`elements/index.ts`, `elements/dom.tsx`), typed over the kinds that have folders, so a part left out does
// not compile.
import type { MigratedKind } from "@uberscene/kit/schema";
import type { Placement, PlacementMap, ResolvedState } from "@uberscene/sdk/resolver";

import type { IntrinsicSize } from "../overlays/size";

/** The part the engine asks, with no React in it. */
export interface PlayerElement<K extends MigratedKind> {
  readonly kind: K;
  /**
   * Its own size before its box places it, and how it fills that box, at `rel` seconds into it. Left out, it is as
   * large as the frame.
   */
  readonly size?: (
    state: ResolvedState,
    placement: PlacementMap[K],
    children: readonly Placement[],
    rel: number,
  ) => IntrinsicSize;
}
