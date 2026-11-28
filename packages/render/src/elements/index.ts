// The checks' part of each kind that has one, by kind. Loaded in the export page too, so nothing here reaches Node.
import { isMigratedKind, type MigratedKind } from "@uberscene/kit/schema";

import { adjustment } from "./adjustment";
import { audio } from "./audio";
import type { RenderElement } from "./element";
import { title } from "./title";

const RENDER_ELEMENTS: { readonly [K in MigratedKind]?: RenderElement<K> } = { audio, title, adjustment };

/**
 * How the layout check treats `kind`'s words, or undefined for a kind whose content is not words. `kind` is text
 * here: the check reads it off the drawn page, where a part a layer names is a kind too.
 */
export function wordsOf(kind: string): RenderElement<MigratedKind>["words"] {
  return isMigratedKind(kind) ? RENDER_ELEMENTS[kind]?.words : undefined;
}

/** Whether `kind` draws nothing on any frame, so a frame's key leaves it out. */
export function drawsNothing(kind: string): boolean {
  return isMigratedKind(kind) && RENDER_ELEMENTS[kind]?.drawsNothing === true;
}

/** Whether a sheet that leaves `kind` out leaves out its effects, and not the element. */
export function leftOutByEffects(kind: string): boolean {
  return isMigratedKind(kind) && RENDER_ELEMENTS[kind]?.without === "effects";
}
