// The part of each kind with a folder of its own that the engine asks, by kind. No React here: `engine.ts` loads it.
// Typed over the kit's list of those kinds, so a kind added there does not compile until its folder here is listed.
import { isMigratedKind, type MigratedKind } from "@uberscene/kit/schema";
import { type Placement, placed, type ResolvedState } from "@uberscene/sdk/resolver";

import type { IntrinsicSize } from "../overlays/size";
import { adjustment } from "./adjustment";
import { audio } from "./audio";
import { clip } from "./clip";
import type { Decoded, PlayerElement, SoundInput } from "./element";
import { gap } from "./gap";
import { layer } from "./layer";
import { nested } from "./nested";
import { shape } from "./shape";
import { sticker } from "./sticker";
import { svg } from "./svg";
import { title } from "./title";
import { transition } from "./transition";

export const PLAYER_ELEMENTS: { readonly [K in MigratedKind]: PlayerElement<K> } = {
  clip,
  audio,
  gap,
  transition,
  title,
  shape,
  svg,
  sticker,
  layer,
  adjustment,
  nested,
};

function sizeAs<K extends MigratedKind>(
  kind: K,
  state: ResolvedState,
  p: Placement,
  children: readonly Placement[],
  rel: number,
  loaded: string | undefined,
): IntrinsicSize | undefined {
  const placement = placed(p, kind);
  return placement && PLAYER_ELEMENTS[kind].size?.(state, placement, children, rel, loaded);
}

/**
 * The size `p`'s kind says it draws at, at `rel` seconds into it: undefined for a kind with no folder of its own, one
 * that says no size, and an element whose props did not parse (it is not drawn). `loaded` is the text of its file,
 * when it reads one and has.
 */
export function elementSize(
  state: ResolvedState,
  p: Placement,
  children: readonly Placement[],
  rel: number,
  loaded?: string,
): IntrinsicSize | undefined {
  return isMigratedKind(p.kind) ? sizeAs(p.kind, state, p, children, rel, loaded) : undefined;
}

function decodedAs<K extends MigratedKind>(kind: K, state: ResolvedState, p: Placement): Decoded | null {
  const placement = placed(p, kind);
  return (placement && PLAYER_ELEMENTS[kind].decodes?.(state, placement)) ?? null;
}

/** What `p` is decoded from to be painted, or null for a kind that paints no decoded video, or one that did not parse. */
export function decodedOf(state: ResolvedState, p: Placement): Decoded | null {
  return isMigratedKind(p.kind) ? decodedAs(p.kind, state, p) : null;
}

/** How a placement is heard, for a kind that is not heard by playing its own asset. */
export interface ElementSound {
  readonly occurrences: (
    input: Omit<SoundInput<MigratedKind>, "placement">,
  ) => ReturnType<NonNullable<PlayerElement<MigratedKind>["sound"]>["occurrences"]>;
  readonly heard: (state: ResolvedState) => boolean;
}

function soundAs<K extends MigratedKind>(kind: K, p: Placement): ElementSound | undefined {
  const sound = PLAYER_ELEMENTS[kind].sound;
  const placement = placed(p, kind);
  if (!sound || !placement) return undefined;
  return {
    occurrences: (input) => sound.occurrences({ ...input, placement }),
    heard: (state) => sound.heard(state, placement),
  };
}

/** How `p` is heard, where its kind says so; undefined where it plays its own asset. */
export function elementSound(p: Placement): ElementSound | undefined {
  return isMigratedKind(p.kind) ? soundAs(p.kind, p) : undefined;
}
