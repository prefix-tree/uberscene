import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { readTimeNeeded, titleWords } from "@uberscene/kit/schema";

import { checkReadTime, loadVideo } from "../src";

// A title must stay on screen 0.5 s plus 0.3 s a word, plus the time its words take to appear.

const scratch = join(import.meta.dirname, ".tmp", "read-check");
let dir = "";
let n = 0;

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "r-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** The issues of a 4 s composition holding `titles` on a free track. */
async function issuesOf(titles: string) {
  const file = join(dir, `v${n++}.tsx`);
  writeFileSync(
    file,
    `import { Composition, Shape, Title, Track } from "@uberscene/kit";
export const manifest = { assets: {} };
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="bg" layout="free"><Shape id="card" type="rectangle" start={0} duration={4} /></Track>
      <Track id="text" layout="free">
        ${titles}
      </Track>
    </Composition>
  );
}
`,
  );
  const { state } = await loadVideo(file);
  expect(state.errors).toEqual([]);
  return checkReadTime(state);
}

describe("readTimeNeeded", () => {
  it("is 0.5 s plus 0.3 s a word, plus how long the words take to appear", () => {
    expect(readTimeNeeded(1)).toBeCloseTo(0.8);
    expect(readTimeNeeded(3, { type: "fade", in: 0.5 })).toBeCloseTo(1.4);
    expect(readTimeNeeded(2, { type: "typewriter", in: 0.6 })).toBeCloseTo(1.7);
    expect(readTimeNeeded(4, { type: "wordByWord", in: 0.8 })).toBeCloseTo(1.7 + 0.6);
    expect(readTimeNeeded(4, { type: "wordByWord", in: 0.5, stagger: 0.1 })).toBeCloseTo(1.7 + 0.3);
  });

  it("counts words between runs of white space", () => {
    expect(titleWords("  SAT\n DOWN  ")).toEqual(["SAT", "DOWN"]);
    expect(titleWords("   ")).toEqual([]);
  });
});

describe("checkReadTime", () => {
  it("passes a title held as long as its words need, and reports one held less", async () => {
    expect(await issuesOf(`<Title id="ok" start={0} duration={0.8}>SOMEONE</Title>`)).toEqual([]);
    const [issue, ...rest] = await issuesOf(`<Title id="fast" start={1} duration={0.4}>SOMEONE SAT DOWN</Title>`);
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ id: "fast", kind: "title", from: 1, to: 1.4, seconds: 0.4, needs: 1.4, words: 3 });
    expect(issue?.message).toBe('"fast" is on screen 0.40 s; 3 words need 1.40 s to be read');
    expect(issue?.fix).toBe("hold it 1.40 s or more (duration), or cut words");
  });

  it("allows a frame short", async () => {
    expect(await issuesOf(`<Title id="near" start={0} duration={1.38}>WOULDN'T IT BE</Title>`)).toEqual([]);
    expect(await issuesOf(`<Title id="short" start={0} duration={1.36}>WOULDN'T IT BE</Title>`)).toHaveLength(1);
  });

  it("adds the time a title takes to type in or come word by word", async () => {
    const typed = await issuesOf(
      `<Title id="typed" start={0} duration={1} animation={{ type: "typewriter", in: 0.5 }}>ONE TWO</Title>`,
    );
    expect(typed).toMatchObject([{ id: "typed", needs: 1.6 }]);
    expect(typed[0]?.message).toContain("2 words typed in need 1.60 s");
    const byWord = await issuesOf(
      `<Title id="words" start={0} duration={1.4} animation={{ type: "wordByWord", in: 0.5, stagger: 0.2 }}>A B C</Title>`,
    );
    expect(byWord).toMatchObject([{ id: "words", needs: 1.8 }]);
  });

  it("skips a title with no words", async () => {
    expect(await issuesOf(`<Title id="blank" start={0} duration={0.2}>{" "}</Title>`)).toEqual([]);
  });

  it("checks only the titles that overlap the window it is given", async () => {
    const file = join(dir, `w${n++}.tsx`);
    writeFileSync(
      file,
      `import { Composition, Shape, Title, Track } from "@uberscene/kit";
export const manifest = { assets: {} };
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="bg" layout="free"><Shape id="card" type="rectangle" start={0} duration={4} /></Track>
      <Track id="text" layout="free">
        <Title id="a" start={0} duration={0.3}>ONE</Title>
        <Title id="b" start={3} duration={0.3}>TWO</Title>
      </Track>
    </Composition>
  );
}
`,
    );
    const { state } = await loadVideo(file);
    expect(checkReadTime(state).map((i) => i.id)).toEqual(["a", "b"]);
    expect(checkReadTime(state, { from: 2 }).map((i) => i.id)).toEqual(["b"]);
  });
});
