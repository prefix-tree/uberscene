import { renderToStaticMarkup } from "react-dom/server";

import { resolveTheme, secondsToTicksExact, type TextRun } from "@uberscene/kit/schema";
import type { Placement, ResolvedState } from "@uberscene/sdk";

import { titleContent } from "../src/overlays/content";

// A title's <Mark>s, drawn: the words of each run in a span of its look, inside the title's own style, whatever the
// animation shows of the text.

const RUN: TextRun = { from: 9, to: 14, color: "#0000ff" };

function box(text: string, runs: readonly TextRun[], animation?: object, time = 1, theme = false): HTMLElement {
  const placement = {
    id: "t",
    kind: "title",
    start: 0,
    duration: 2,
    range: { start: 0, duration: secondsToTicksExact(2) },
    props: { style: { color: "#ff0000" }, ...(animation ? { animation } : {}) },
  } as unknown as Placement;
  const state = (theme ? { theme: resolveTheme(undefined) } : {}) as ResolvedState;
  const html = renderToStaticMarkup(titleContent({ placement, children: [], state, time, text, runs }));
  return new DOMParser().parseFromString(html, "text/html").body.firstElementChild as HTMLElement;
}

/** The text of the box's pieces, with the colour of each marked one. */
const pieces = (el: Element): string[] =>
  [...el.childNodes].flatMap((n) =>
    n.nodeType === 3
      ? [n.textContent ?? ""]
      : (n as HTMLElement).style.color
        ? [`${n.textContent}:${(n as HTMLElement).style.color}`]
        : pieces(n as Element),
  );

describe("a title with a mark", () => {
  it("draws the marked words in their colour, and the rest in the title's", () => {
    const el = box("into the stars tonight", [RUN]);
    expect(el.style.color).toBe("rgb(255, 0, 0)");
    expect(pieces(el)).toEqual(["into the ", "stars:rgb(0, 0, 255)", " tonight"]);
  });

  it("draws weight, italics and a highlight", () => {
    const el = box("a big word", [{ from: 2, to: 5, weight: 700, italic: true, background: "#ffff00" }]);
    const span = el.querySelector("span") as HTMLElement;
    expect(span.textContent).toBe("big");
    expect(span.style.fontWeight).toBe("700");
    expect(span.style.fontStyle).toBe("italic");
    expect(span.style.background).toContain("rgb(255, 255, 0)");
  });

  it("types in across the mark: half way, only what is typed, the mark cut where the typing is", () => {
    // 22 characters, typed over 0.6 s: at 0.3 s, 11 of them, two letters into "stars".
    const el = box("into the stars tonight", [RUN], { type: "typewriter", in: 0.6, out: 0 }, 0.3);
    expect(pieces(el)).toEqual(["into the ", "st:rgb(0, 0, 255)"]);
  });

  it("comes in word by word with its words, and splits a word where a mark starts inside it", () => {
    const el = box("superstars", [{ from: 5, to: 10, color: "#0000ff" }], { type: "wordByWord", in: 0.6, out: 0 });
    const words = [...(el.firstElementChild as HTMLElement).children];
    expect(words).toHaveLength(1);
    expect(pieces(words[0]!)).toEqual(["super", "stars:rgb(0, 0, 255)"]);
  });

  it("makes a theme token the theme's colour", () => {
    const el = box("a word", [{ from: 2, to: 6, color: "$accent" }], undefined, 1, true);
    const span = el.querySelector("span") as HTMLElement;
    expect(span.style.color).not.toBe("");
    expect(span.style.color).not.toContain("$");
  });
});
