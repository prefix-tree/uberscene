import { describe, expect, it } from "vitest";

import { Composition, Mark, Title, Track } from "@uberscene/kit";
import { moveRuns } from "@uberscene/kit/schema";
import { collect, collectModule, Executor, foldToSource, resolve } from "@uberscene/sdk";

// `<Mark>` colours words inside one title: the title's text stays plain, and its marks are ranges of it (`runs`).

const one = (title: React.ReactElement, theme?: object) =>
  resolve(
    collect(
      <Composition fps={30} width={1280} height={720} {...(theme ? { theme } : {})}>
        <Track id="over" layout="free">
          {title}
        </Track>
      </Composition>,
    ),
    { assets: {} },
  );

describe("collecting a title with marks", () => {
  it("keeps the plain text, and each mark as a range of it with its look", () => {
    const state = one(
      <Title id="t" start={0} duration={2}>
        into the <Mark color="#0d2cf5">stars</Mark>, {2}{" "}
        <Mark weight={700} italic background="#ff0">
          times
        </Mark>
      </Title>,
    );
    expect(state.errors).toEqual([]);
    const node = state.tree.byId.get("t")!;
    expect(node.text).toBe("into the stars, 2 times");
    expect(node.runs).toEqual([
      { from: 9, to: 14, color: "#0d2cf5" },
      { from: 18, to: 23, weight: 700, italic: true, background: "#ff0" },
    ]);
  });

  it("checks a mark's colour token against the theme", () => {
    const ok = one(
      <Title id="t" start={0} duration={2}>
        a <Mark color="$accent">word</Mark>
      </Title>,
    );
    expect(ok.errors).toEqual([]);
    const bad = one(
      <Title id="t" start={0} duration={2}>
        a <Mark color="$nope">word</Mark>
      </Title>,
    );
    expect(bad.errors.map((e) => `${e.code}:${e.prop}`)).toEqual(["UNKNOWN_TOKEN:children"]);
    expect(bad.errors[0]?.message).toContain("$nope");
  });

  it("says what cannot go inside a title, instead of drawing it empty", () => {
    const span = one(
      <Title id="t" start={0} duration={2}>
        a <span>word</span>
      </Title>,
    );
    expect(span.errors.map((e) => `${e.code}:${e.prop}`)).toEqual(["SCHEMA:children"]);
    expect(span.errors[0]?.message).toContain("<span>");
    const nested = one(
      <Title id="t" start={0} duration={2}>
        <Mark color="#f00">
          a <Mark color="#00f">b</Mark>
        </Mark>
      </Title>,
    );
    expect(nested.errors[0]?.message).toMatch(/marks do not nest/);
    const sized = { size: 3 } as Record<string, unknown>;
    const prop = one(
      <Title id="t" start={0} duration={2}>
        a <Mark {...sized}>b</Mark>
      </Title>,
    );
    expect(prop.errors.map((e) => e.code)).toEqual(["SCHEMA"]);
  });

  it("does not count a mark as a helper call", () => {
    const Line = ({ id }: { id: string }) => (
      <Title id={id} start={0} duration={1}>
        x
      </Title>
    );
    const state = one(
      <>
        <Title id="m" start={0} duration={1}>
          a <Mark color="#f00">b</Mark>
        </Title>
        <Line id="l1" />
      </>,
    );
    expect(state.tree.byId.get("l1")?.origin).toMatchObject({ helper: "Line", callIndex: 0 });
  });
});

describe("moving marks onto new text", () => {
  it("finds each marked phrase again on its word edges, and drops one that is gone", () => {
    const runs = [{ from: 9, to: 14, color: "#00f" }];
    expect(moveRuns("into the stars", runs, "out into the stars tonight")).toEqual([
      { from: 13, to: 18, color: "#00f" },
    ]);
    expect(moveRuns("into the stars", runs, "into the starship")).toEqual([]);
    expect(moveRuns("into the stars", runs, "into the sea")).toEqual([]);
    // In order: the second mark is looked for after the first.
    const two = [
      { from: 0, to: 1, color: "#f00" },
      { from: 6, to: 7, color: "#00f" },
    ];
    expect(moveRuns("a b c a", [two[0]!, { from: 6, to: 7, color: "#00f" }], "a x a")).toEqual([
      { from: 0, to: 1, color: "#f00" },
      { from: 4, to: 5, color: "#00f" },
    ]);
  });
});

describe("editing a title with marks", () => {
  const text = `import { Composition, Mark, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1280} height={720}>
      <Track id="over" layout="free">
        <Title id="t" start={0} duration={2}>into the <Mark color="$accent">stars</Mark></Title>
        <Title id="p" start={2} duration={2}>Plain</Title>
      </Track>
    </Composition>
  );
}
`;
  const Video = () => (
    <Composition fps={30} width={1280} height={720}>
      <Track id="over" layout="free">
        <Title id="t" start={0} duration={2}>
          into the <Mark color="$accent">stars</Mark>
        </Title>
        <Title id="p" start={2} duration={2}>
          Plain
        </Title>
      </Track>
    </Composition>
  );
  const open = () => new Executor({ tree: collectModule({ default: Video }), manifest: { assets: {} } });

  it("keeps the mark on its word when the text around it changes, in the state and in the file", () => {
    const exec = open();
    expect(exec.execute({ type: "text/setContent", params: { id: "t", text: "out into the stars" } }).ok).toBe(true);
    const node = exec.state().tree.byId.get("t")!;
    expect(node.text).toBe("out into the stars");
    expect(node.runs).toEqual([{ from: 13, to: 18, color: "$accent" }]);
    expect(foldToSource(text, exec.log(), exec.state()).text).toContain(
      '<Title id="t" start={0} duration={2}>out into the <Mark color="$accent">stars</Mark></Title>',
    );
    exec.undo();
    expect(exec.state().tree.byId.get("t")?.runs).toEqual([{ from: 9, to: 14, color: "$accent" }]);
    expect(foldToSource(text, exec.log(), exec.state()).text).toBe(text);
  });

  it("drops the mark with its word, and sets marks it is given", () => {
    const exec = open();
    expect(exec.execute({ type: "text/setContent", params: { id: "t", text: "into the sea" } }).ok).toBe(true);
    expect(exec.state().tree.byId.get("t")?.runs).toBeUndefined();
    expect(foldToSource(text, exec.log(), exec.state()).text).toContain(">into the sea</Title>");
    expect(
      exec.execute({
        type: "text/setContent",
        params: { id: "p", text: "Plain red", runs: [{ from: 6, to: 9, color: "#f00" }] },
      }).ok,
    ).toBe(true);
    expect(foldToSource(text, exec.log(), exec.state()).text).toContain('>Plain <Mark color="#f00">red</Mark></Title>');
  });

  it("imports Mark when an edit brings the first one into a file", () => {
    const plain = text
      .replace('<Title id="t" start={0} duration={2}>into the <Mark color="$accent">stars</Mark></Title>\n', "")
      .replace("Composition, Mark, Title", "Composition, Title");
    const Plain = () => (
      <Composition fps={30} width={1280} height={720}>
        <Track id="over" layout="free">
          <Title id="p" start={2} duration={2}>
            Plain
          </Title>
        </Track>
      </Composition>
    );
    const exec = new Executor({ tree: collectModule({ default: Plain }), manifest: { assets: {} } });
    expect(
      exec.execute({
        type: "text/setContent",
        params: { id: "p", text: "Plain red", runs: [{ from: 6, to: 9, color: "#f00" }] },
      }).ok,
    ).toBe(true);
    const out = foldToSource(plain, exec.log(), exec.state()).text;
    expect(out).toContain('import { Mark } from "@uberscene/kit";');
    expect(out).toContain('<Mark color="#f00">red</Mark>');
  });
});
