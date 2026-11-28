// What the SDK says of one element kind, in the kind's own folder (`elements/<kind>/index.ts`), beside the kit's
// part (`KitElement`) and typed by the kind's placement: what the resolver, the tools and the lint ask of a kind, in
// place of a test for its name where they work.
import type { Box, Kind, KindProps, Time } from "@uberscene/kit/schema";

import type { Makes } from "../resolve/resolve";
import type { CollectedNode } from "../resolve/tree";
import type { Deprecation } from "../source/lint/deprecation";
import type { PlacementFacts, PlacementMap } from "./placement";

interface SdkElementBase<K extends Kind> {
  readonly kind: K;
  /**
   * Its size at rest, before its box places it, when its props say one: what a camera's push makes room for. A kind
   * without one is measured by its asset or its box.
   */
  readonly restSize?: (placement: PlacementMap[K]) => Box;
  /**
   * Why it cannot be followed, from its props as written, as what a message says after naming it ("an SVG read from
   * a file: …"); undefined when it can. Left out, it always can.
   */
  readonly cannotBeFollowed?: (written: Readonly<Record<string, unknown>>) => string | undefined;
  /**
   * Keys the kind renamed, by the object they are in (`""` for its own props), old to new: what the resolver says in
   * place of the schema's "Unrecognized key".
   */
  readonly renamed?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /**
   * Where keys the schema does not know have moved to, each as "`size` is now `style.size`"; `at` is the object they
   * were written in (`""` for the element's own props). None when they have not moved.
   */
  readonly moved?: (at: string, keys: readonly string[]) => readonly string[];
  /** The lint's rows for the kind's old spellings, which `uberscene lint --fix` moves a file across. */
  readonly deprecations?: readonly Deprecation[];
  /**
   * How long it lasts from its props as written, for a kind that plays no source and takes no length from another
   * element: a transition's overlap, a gap's empty time. Its props may not have parsed.
   */
  readonly timing?: (written: Readonly<Record<string, unknown>>) => Time;
  /**
   * The shaders its `type` may name, besides the built-ins, when the file declares one with `transition()`: what the
   * resolver checks its params against.
   */
  readonly shader?: "transition";
  /** Its parsed props with what the schema leaves to the kind filled in: a built-in transition's params. */
  readonly complete?: (props: KindProps[K]) => KindProps[K];
  /** How it makes elements of its own: a multicam its clips, captions their cues. Such a kind spans the video. */
  readonly makes?: Makes;
  /** It is timed by the kind that holds it, which makes or places it (a cue, by its captions). */
  readonly made?: true;
}

/**
 * The SDK's part of a kind. A kind whose placement holds something from the file besides its props (a title's
 * words: a line in `PlacementFacts`) must say how that is read from its node, in `facts`.
 */
export type SdkElement<K extends Kind> = SdkElementBase<K> &
  (K extends keyof PlacementFacts
    ? { readonly facts: (node: CollectedNode) => PlacementFacts[K] }
    : { readonly facts?: never });
