import { describe, expect, it } from "vitest";

import { affordances, buildSourceIndex, collectModule, Executor, loadModule } from "@uberscene/sdk";

import { manifest } from "./helpers";

// `mask/create` writes a <Mask> under an element. Only a kind that takes one as a child keeps it when the file is
// read again, so the action is offered and accepted there alone.

const file = (inside: string) => `import { Adjustment, Composition, Layer, Shape, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1000} height={600}>
      <Track id="over" layout="free">
        ${inside}
      </Track>
    </Composition>
  );
}
`;

const tree = (text: string) => collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) });

describe("a mask", () => {
  const mask = (parentId: string) =>
    ({
      type: "mask/create",
      params: { id: "m", parentId, props: { shape: { ellipse: { cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.3 } } } },
    }) as const;

  it("goes on a kind that takes one as a child, and on no other", () => {
    const text = file(
      `<Shape id="s" start={0} duration={2} type="rectangle" />
       <Layer id="l" start={0} duration={2}><div /></Layer>
       <Adjustment id="a" start={0} duration={2} />`,
    );
    const exec = new Executor({ tree: tree(text), manifest });
    expect(exec.can(mask("s")).ok).toBe(true);
    for (const id of ["l", "a"]) {
      // A <Mask> under a layer is free code, and under an adjustment it is dropped: the edit would not be in the file.
      expect(exec.can(mask(id))).toMatchObject({ ok: false, errors: [{ code: "INVALID_PARAMS" }] });
      expect(affordances(exec.state(), id)?.actions).not.toContain("mask/create");
    }
    expect(affordances(exec.state(), "s")?.actions).toContain("mask/create");
  });
});
