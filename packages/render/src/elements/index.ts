// The checks' part of each kind that has one, by kind. Loaded in the export page too, so nothing here reaches Node.
import { isMigratedKind, type MigratedKind } from "@uberscene/kit/schema";

import type { RenderElement } from "./element";
import { title } from "./title";

export const RENDER_ELEMENTS: { readonly [K in MigratedKind]?: RenderElement<K> } = { title };

/**
 * How the layout check treats `kind`'s words, or undefined for a kind whose content is not words. `kind` is text
 * here: the check reads it off the drawn page, where a part a layer names is a kind too.
 */
export function wordsOf(kind: string): RenderElement<MigratedKind>["words"] {
  return isMigratedKind(kind) ? RENDER_ELEMENTS[kind]?.words : undefined;
}
