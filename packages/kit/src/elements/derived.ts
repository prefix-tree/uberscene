// The kinds an element holds as items of its own, which have no folder: a mask written inside it, and what the
// resolver makes of its props (an effect, a key, a generator, a speed key, a hold). Each is placed inside its element
// and drawn by it, so each says only its row of traits here. Their schemas are in `jsx/schemas/children.ts`, which
// asks the kind table what a key may name, so the table does not read them back.
import type { KindTraits } from "../jsx/define";
import type { Kind, MigratedKind } from "./index";
import { traits } from "./traits";

/** A kind held inside an element: what has no folder. */
export type HeldKind = Exclude<Kind, MigratedKind>;

/** What the kit says of a held kind: its row in the kind table. */
export interface HeldElement<K extends HeldKind> {
  readonly kind: K;
  readonly traits: KindTraits;
}

const held = <K extends HeldKind>(kind: K, over: Partial<KindTraits> = {}): HeldElement<K> => ({
  kind,
  traits: traits({ placementScope: "child", ...over }),
});

/** Each held kind's row. A kind added to `KindProps` with no folder does not compile until it is here. */
export const HELD_ELEMENTS: { readonly [K in HeldKind]: HeldElement<K> } = {
  mask: held("mask"),
  effect: held("effect", { childKinds: ["keyframe"] }),
  keyframe: held("keyframe"),
  generator: held("generator"),
  speedKey: held("speedKey"),
  freeze: held("freeze"),
};
