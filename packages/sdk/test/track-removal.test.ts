import { describe, expect, it } from "vitest";

import { foldToSource } from "@uberscene/sdk";

import { executorFor, resolveText } from "./editing/corpus";

// Removing a track takes its elements with it. What another track's elements read of them (where they start, how
// long they last, what they follow) is written as what it was, so nothing points at an element that is gone.
const file = {
  name: "a track others read",
  manifest: { assets: { picture: { id: "picture", kind: "image" as const, duration: 0, width: 320, height: 180 } } },
  files: {},
  text: `import { Composition, Shape, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="first" layout="free">
        <Shape id="card" start={1} duration={4} type="rectangle" width={200} height={100} box={{ x: 400, y: 300 }} />
      </Track>
      <Track id="second" layout="free">
        <Title id="label" anchor="card" offset={0.5} duration={2}>On the card</Title>
        <Title id="long" start={0} duration={{ match: "card" }}>As long as the card</Title>
        <Shape id="dot" follow="card" start={0} duration={6} type="ellipse" width={20} height={20} box={{ x: 10, y: 10 }} />
      </Track>
    </Composition>
  );
}
`,
};

describe("removing a track", () => {
  it("leaves what another track read of its elements where it was", () => {
    const exec = executorFor(file);
    const before = exec.state();
    const result = exec.execute({ type: "track/remove", params: { trackId: "first" } });
    expect(result.errors ?? []).toEqual([]);
    const after = exec.state();
    expect(after.errors).toEqual([]);
    expect(after.items.has("card")).toBe(false);
    for (const id of ["label", "long"]) {
      expect(after.items.get(id)?.range.start.equals(before.items.get(id)!.range.start)).toBe(true);
      expect(after.items.get(id)?.range.duration.equals(before.items.get(id)!.range.duration)).toBe(true);
    }
    expect(after.items.get("dot")?.props.follow).toBeUndefined();
    // Written back, the file says the same.
    const folded = foldToSource(file.text, exec.log(), after);
    expect(resolveText(folded.text, file.manifest, file.files).errors).toEqual([]);
    expect(exec.undo()?.ok).toBe(true);
    expect(exec.state().items.get("label")?.props.anchor).toBe("card");
  });
});
