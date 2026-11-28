// The player's part of `<Multicam>`, `<Angle>` and `<Cut>`: nothing of their own. A multicam is drawn and heard
// through the clips the resolver makes of its cuts, which its entry gives in its place (`shownBy`).
import type { PlayerElement } from "../element";

export const multicam: PlayerElement<"multicam"> = {
  kind: "multicam",
  shownBy: (state, p) =>
    [...state.items.values()]
      .filter((q) => q.parent === p.id && q.kind === "clip")
      .sort((a, b) => a.range.start.compare(b.range.start)),
};
export const angle: PlayerElement<"angle"> = { kind: "angle" };
export const cut: PlayerElement<"cut"> = { kind: "cut" };
