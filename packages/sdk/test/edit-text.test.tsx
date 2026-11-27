import { describe, expect, it } from "vitest";

import { Clip, Composition, Title, Track } from "@uberscene/kit";
import { collectModule, Executor, foldToSource } from "@uberscene/sdk";

// The text an editor saves after its edits: the values it was given, laid out as the file was.

/** The text and the module must agree: the index reads the text, collect evaluates the module. */
const text = `import { Composition, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1280} height={720}>
      <Track id="over" layout="free">
        <Title id="a" start={0} duration={2}>First</Title>
        <Title id="t" start={3} duration={2.5}>Hello</Title>
      </Track>
    </Composition>
  );
}
`;

const Video = () => (
  <Composition fps={30} width={1280} height={720}>
    <Track id="over" layout="free">
      <Title id="a" start={0} duration={2}>
        First
      </Title>
      <Title id="t" start={3} duration={2.5}>
        Hello
      </Title>
    </Track>
  </Composition>
);

const open = () => new Executor({ tree: collectModule({ default: Video }), manifest: { assets: {} } });

describe("trimming an element without a source", () => {
  it("writes the edge it was given, not the noise of the subtraction", () => {
    const exec = open();
    // 6.267 - 3 is 3.2670000000000003 in floating point.
    expect(exec.execute({ type: "clip/trim", params: { id: "t", edge: "out", value: 6.267 } }).ok).toBe(true);
    expect(foldToSource(text, exec.log(), exec.state()).text).toContain("duration={3.267}");
  });

  it("does the same at the in edge", () => {
    const exec = open();
    expect(exec.execute({ type: "clip/trim", params: { id: "t", edge: "in", value: 3.1 } }).ok).toBe(true);
    const out = foldToSource(text, exec.log(), exec.state()).text;
    expect(out).toContain("start={3.1}");
    expect(out).toContain("duration={2.4}");
  });
});

describe("undoing a delete", () => {
  it("gives back the file as it was, indent and all", () => {
    const exec = open();
    expect(exec.execute({ type: "element/remove", params: { id: "t" } }).ok).toBe(true);
    exec.undo();
    expect(foldToSource(text, exec.log(), exec.state()).text).toBe(text);
  });
});

describe("splitting a clip", () => {
  const footage = `import { Clip, Composition, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1280} height={720}>
      <Track id="over" layout="free">
        <Clip id="c" src="asset:talk" start={0} in={11.26} out={30} />
        <Title id="t" start={0.3} duration={2.5}>Hello</Title>
      </Track>
    </Composition>
  );
}
`;
  const Footage = () => (
    <Composition fps={30} width={1280} height={720}>
      <Track id="over" layout="free">
        <Clip id="c" src="asset:talk" start={0} in={11.26} out={30} />
        <Title id="t" start={0.3} duration={2.5}>
          Hello
        </Title>
      </Track>
    </Composition>
  );
  const manifest = { assets: { talk: { id: "talk", kind: "video", duration: 60, fps: 30, width: 1280, height: 720 } } };
  const open = () => new Executor({ tree: collectModule({ default: Footage }), manifest: manifest as never });

  it("writes the new edges without float noise", () => {
    const exec = open();
    // 11.26 + 11.3 is 22.560000000000002 in floating point.
    expect(exec.execute({ type: "clip/split", params: { id: "c", at: 11.3, newId: "c2" } }).ok).toBe(true);
    expect(exec.execute({ type: "clip/split", params: { id: "t", at: 1.4, newId: "t2" } }).ok).toBe(true);
    const out = foldToSource(footage, exec.log(), exec.state()).text;
    expect(out).toContain("out={22.56}");
    expect(out).toContain("in={22.56}");
    expect(out).toContain("start={11.3}");
    expect(out).toContain("duration={1.1}");
    expect(out).toContain("duration={1.4}");
    expect(out).not.toMatch(/\d\.\d*000000\d/);
  });

  it("refuses to leave less than a frame on either side", () => {
    const exec = open();
    const frame = 1 / 30;
    expect(exec.execute({ type: "clip/split", params: { id: "c", at: frame / 3, newId: "a" } }).ok).toBe(false);
    const item = exec.state().items.get("c")!;
    expect(
      exec.execute({ type: "clip/split", params: { id: "c", at: item.range.end.toSeconds() - frame / 3, newId: "b" } })
        .ok,
    ).toBe(false);
    expect(exec.execute({ type: "clip/split", params: { id: "c", at: frame, newId: "d" } }).ok).toBe(true);
  });
});
