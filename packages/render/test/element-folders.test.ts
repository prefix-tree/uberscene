import { wordsOf } from "../src/elements";

// The checks' part of a kind with a folder of its own (`src/elements/<kind>/`): how the layout check treats a kind
// of words. It is asked by the kind as the drawn page names it, which is text.

describe("how the layout check treats a kind", () => {
  it("a title is a kind of words: a fix can narrow its box or shrink its letters", () => {
    const words = wordsOf("title");
    expect(words?.narrower).toBe("a narrower box.width, or a smaller style.size");
    expect(words?.smaller(0.5)).toBe(
      "make its style.size 0.5 of what it is or less, or scale it to that (transform.scale),",
    );
  });

  it("a shape, a kind with no folder, and a part a layer names are not", () => {
    expect(wordsOf("shape")).toBeUndefined();
    expect(wordsOf("clip")).toBeUndefined();
    expect(wordsOf("part")).toBeUndefined();
    expect(wordsOf("toString")).toBeUndefined();
  });
});
