// What the export's checks say of one element kind, in the kind's own folder (`elements/<kind>/`). The export draws
// through the player, so a kind has a part here only where a check or a tool treats it its own way: a title's words,
// what a sheet leaves out of an adjustment.
import type { MigratedKind } from "@uberscene/kit/schema";

export interface RenderElement<K extends MigratedKind> {
  readonly kind: K;
  /** How the layout check treats a kind whose content is words. */
  readonly words?: {
    /** What makes it fit besides a move, in a fix: "a narrower box.width, or a smaller style.size". */
    readonly narrower: string;
    /** How to make it `scale` of its size, in a fix, when it is larger than the area it must fit. */
    readonly smaller: (scale: number) => string;
  };
  /**
   * What a sheet leaves out when `look --without` names one of this kind: `effects` for a kind whose picture is its
   * effects over what is beneath it (an adjustment). Left out, the element itself is hidden, where it is DOM alone.
   */
  readonly without?: "effects";
}
