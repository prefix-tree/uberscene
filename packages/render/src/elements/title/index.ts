// The checks' part of a `<Title>`: its words are measured in their box and must not sit over another title's, and a
// fix can change its box's width and its letters' size. Its read-time check is `read-check.ts`.
import type { RenderElement } from "../element";

export const title: RenderElement<"title"> = {
  kind: "title",
  words: {
    narrower: "a narrower box.width, or a smaller style.size",
    smaller: (scale) => `make its style.size ${scale} of what it is or less, or scale it to that (transform.scale),`,
  },
};
