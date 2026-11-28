// The tools' part of an `<Adjustment>`: it is its effects over the picture beneath, so a sheet that leaves it out
// switches those off.
import type { RenderElement } from "../element";

export const adjustment: RenderElement<"adjustment"> = { kind: "adjustment", without: "effects" };
