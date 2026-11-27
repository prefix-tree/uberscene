// The part of each kind with a folder of its own that the engine asks, by kind. No React here: `engine.ts` loads it.
// Typed over the kit's list of those kinds, so a kind added there does not compile until its folder here is listed.
import { isMigratedKind, type MigratedKind } from "@uberscene/kit/schema";
import { type Placement, placed, type ResolvedState } from "@uberscene/sdk/resolver";

import type { IntrinsicSize } from "../overlays/size";
import type { PlayerElement } from "./element";
import { shape } from "./shape";
import { title } from "./title";

export const PLAYER_ELEMENTS: { readonly [K in MigratedKind]: PlayerElement<K> } = { title, shape };

function sizeAs<K extends MigratedKind>(
  kind: K,
  state: ResolvedState,
  p: Placement,
  children: readonly Placement[],
  rel: number,
): IntrinsicSize | undefined {
  const placement = placed(p, kind);
  return placement && PLAYER_ELEMENTS[kind].size?.(state, placement, children, rel);
}

/**
 * The size `p`'s kind says it draws at, at `rel` seconds into it: undefined for a kind with no folder of its own, one
 * that says no size, and an element whose props did not parse (it is not drawn).
 */
export function elementSize(
  state: ResolvedState,
  p: Placement,
  children: readonly Placement[],
  rel: number,
): IntrinsicSize | undefined {
  return isMigratedKind(p.kind) ? sizeAs(p.kind, state, p, children, rel) : undefined;
}
