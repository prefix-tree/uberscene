// What the kit says of one element kind, in the kind's own folder (`elements/<kind>/index.ts`). The SDK, the player
// and the editor each say their part in a folder of the same name, typed against this one, so a kind is one folder
// per package and a registry line in each, and a part left out does not compile.
import type { z } from "zod";

import type { DrawPlane, ElementCapabilities } from "../jsx/define";
import type { Kind, KindProps } from "./index";

/** The kit's part of one element kind: its schema, its row in the kind table, and a sample of it. */
export interface KitElement<K extends Kind, P extends DrawPlane = DrawPlane> {
  readonly kind: K;
  /** What its props are checked against. It parses to the kind's props (`KindProps[K]`). */
  readonly schema: z.ZodType<KindProps[K]>;
  /** The kind's row in the kind table. Its `plane` is typed, since it decides what the player must have to draw it. */
  readonly capabilities: ElementCapabilities & { readonly plane: P };
  /**
   * One of it as a file writes it, with the id `sample`, to stand on a free track: what the conformance suite
   * resolves, keys, edits and draws, and what a new kind is started from.
   */
  readonly sample: string;
  /**
   * What the sample stands over, written on a track beneath it, for a kind that shows only over something: an
   * adjustment filters the footage under it. A file the sample or this plays is `asset:picture`, an image.
   */
  readonly sampleBeneath?: string;
  /**
   * Its children in the file are free code, kept whole as its interior for the player to draw, and never read as
   * elements: a layer.
   */
  readonly interior?: true;
  /**
   * The schemas of a kind that more than one tag writes, told apart by the prop `by`: a layer a library draws says
   * which in `engine`, and has that engine's props. An element that writes none of them is checked against `schema`.
   */
  readonly variants?: { readonly by: string; readonly schemas: Readonly<Record<string, z.ZodType>> };
  /**
   * Whether a theme's motion style fills this element's `enter` and `exit`, given its props as written. Left out, it
   * always does (for a kind whose row has `themeMotion`).
   */
  readonly themeMotion?: (written: Readonly<Record<string, unknown>>) => boolean;
}
