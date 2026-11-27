// Removing something another element names in a way the scan of props never saw: an element a camera's push makes
// room for. Each case checks the timeline is left with no errors and that undo puts it all back.
import { describe, expect, it } from "vitest";

import { buildSourceIndex, collectModule, dependentsOf, Executor, foldToSource, loadModule } from "@uberscene/sdk";

import { manifest, serialize } from "../helpers";

const file = (body: string) => `import { Camera, Composition, Shape, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
${body}
    </Composition>
  );
}
`;

function executor(text: string): Executor {
  const tree = collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) });
  return new Executor({ tree, manifest, now: () => 0 });
}

const SHAPE = (id: string, x: number) =>
  `<Shape id="${id}" start={1} duration={3} type="rectangle" width={300} height={300} box={{ x: ${x}, y: 300, width: 300, height: 300 }} />`;
const props = (exec: Executor, id: string) => exec.state().tree.byId.get(id)?.props as Record<string, unknown>;
const errors = (exec: Executor) => exec.state().errors.map((e) => `${e.code} ${e.id}: ${e.message}`);

/** Runs `input`, checks it leaves no errors, hands the state over, then checks undo restores the start. */
function carried(exec: Executor, input: Parameters<Executor["execute"]>[0], check: () => void): void {
  const before = serialize(exec.state());
  expect(errors(exec)).toEqual([]);
  const result = exec.execute(input);
  expect(result.errors ?? []).toEqual([]);
  expect(errors(exec)).toEqual([]);
  check();
  const undone = exec.undo();
  expect(undone?.errors ?? []).toEqual([]);
  expect(undone?.ok).toBe(true);
  expect(serialize(exec.state())).toEqual(before);
}

const PUSHED = (push: string) =>
  file(`      <Camera id="cam" push={${push}}>
        <Track id="stage" layout="free">
          ${SHAPE("host", 800)}
          ${SHAPE("card", 2200)}
          ${SHAPE("note", 2600)}
        </Track>
      </Camera>`);

describe("removing an element a camera's push names", () => {
  it("is listed as a dependent of the element", () => {
    const exec = executor(PUSHED(`{ on: ["card", "note"], keep: ["host"] }`));
    expect(dependentsOf(exec.state(), "card")).toEqual([{ kind: "push", id: "cam", part: "on" }]);
    expect(dependentsOf(exec.state(), "host")).toEqual([{ kind: "push", id: "cam", part: "keep" }]);
  });

  it("takes it out of push.on and leaves the rest of the push", () => {
    const exec = executor(PUSHED(`{ on: ["card", "note"], keep: ["host"], margin: 40 }`));
    carried(exec, { type: "element/remove", params: { id: "card" } }, () => {
      expect(props(exec, "cam").push).toEqual({ on: ["note"], keep: ["host"], margin: 40 });
    });
  });

  it("takes it out of push.keep", () => {
    const exec = executor(PUSHED(`{ on: ["card"], keep: ["host"] }`));
    carried(exec, { type: "element/remove", params: { id: "host" } }, () => {
      expect(props(exec, "cam").push).toEqual({ on: ["card"], keep: [] });
    });
  });

  it("takes the push off the camera when nothing is left to make room for", () => {
    const text = PUSHED(`{ on: ["card"] }`);
    const exec = executor(text);
    carried(exec, { type: "element/remove", params: { id: "card" } }, () => {
      expect(props(exec, "cam").push).toBeUndefined();
    });
    exec.execute({ type: "element/remove", params: { id: "card" } });
    const folded = foldToSource(text, exec.log(), exec.state());
    expect(folded.text).not.toContain("push=");
    expect(folded.text).not.toContain(`id="card"`);
  });
});
