// A composition written with an id of its own is still the one every composition action, font pick and marker names
// "composition": the file keeps the id it was written with.
import { describe, expect, it } from "vitest";

import { buildSourceIndex, collectModule, Executor, foldToSource, loadModule } from "@uberscene/sdk";

const file = (id: string) => `import { Composition, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition ${id} fps={30} width={640} height={360}>
      <Track id="t" layout="free">
        <Title id="a" start={0} duration={1}>A</Title>
      </Track>
    </Composition>
  );
}
`;

describe.each(['id="intro"', "id={`intro`}", ""])("a composition written with %s", (id) => {
  const text = file(id);
  const open = () =>
    new Executor({
      tree: collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }),
      manifest: { assets: {} },
    });

  it("takes its settings, and the file keeps its id", () => {
    const exec = open();
    expect(exec.state().composition.id).toBe("composition");
    const result = exec.execute({ type: "composition/updateSettings", params: { fps: 25, width: 1280 } });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const out = foldToSource(text, exec.log(), exec.state()).text;
    expect(out).toContain("fps={25}");
    expect(out).toContain("width={1280}");
    if (id) expect(out).toContain(id);
  });

  it("takes a font and a marker", () => {
    const exec = open();
    expect(exec.execute({ type: "font/use", params: { role: "heading", family: "Inter" } }).ok).toBe(true);
    expect(exec.execute({ type: "marker/add", params: { markerId: "m1", start: 0.5, label: "here" } }).ok).toBe(true);
    const out = foldToSource(text, exec.log(), exec.state()).text;
    expect(out).toContain('<Marker id="m1"');
  });
});
