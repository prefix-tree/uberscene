import { describe, expect, it } from "vitest";

import { kindTakes } from "@uberscene/kit/schema";
import { affordances, buildSourceIndex, foldToSource } from "@uberscene/sdk";

import { fixtureExecutor, fixtureText } from "./helpers";

const startOf = (exec: ReturnType<typeof fixtureExecutor>, id: string) =>
  exec.state().items.get(id)!.range.start.toSeconds();
const propsIn = (text: string, id: string) => buildSourceIndex(text).elements.get(id)?.props;

describe("clip/setAnchor", () => {
  it("anchors an element that has a start: the start goes, the offset places it, undo and redo hold", () => {
    const exec = fixtureExecutor();
    const c2 = startOf(exec, "c2");
    const result = exec.execute({ type: "clip/setAnchor", params: { id: "a1", anchor: "c2", offset: 1 } });
    expect(result.ok).toBe(true);
    expect(startOf(exec, "a1")).toBeCloseTo(c2 + 1, 9);
    expect(exec.state().items.get("a1")!.errors).toEqual([]);

    const text = foldToSource(fixtureText, exec.log(), exec.state()).text;
    const written = propsIn(text, "a1");
    expect(written?.has("anchor")).toBe(true);
    expect(written?.has("offset")).toBe(true);
    expect(written?.has("start")).toBe(false);

    expect(exec.undo()?.ok).toBe(true);
    expect(startOf(exec, "a1")).toBe(0);
    expect(exec.redo()?.ok).toBe(true);
    expect(startOf(exec, "a1")).toBeCloseTo(c2 + 1, 9);
  });

  it("taken off on a free track, writes back the start the element stood at", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "clip/setAnchor", params: { id: "a1", anchor: "c2", offset: 1 } });
    const anchored = startOf(exec, "a1");
    const result = exec.execute({ type: "clip/setAnchor", params: { id: "a1" } });
    expect(result.ok).toBe(true);
    expect(startOf(exec, "a1")).toBeCloseTo(anchored, 9);
    const written = propsIn(foldToSource(fixtureText, exec.log(), exec.state()).text, "a1");
    expect(written?.has("start")).toBe(true);
    expect(written?.has("anchor")).toBe(false);
    expect(written?.has("offset")).toBe(false);
  });

  it("is offered only on kinds whose schema has an anchor", () => {
    const exec = fixtureExecutor();
    let without = 0;
    for (const item of exec.state().items.values()) {
      const offered = affordances(exec.state(), item.id)?.actions.includes("clip/setAnchor") ?? false;
      if (!kindTakes(item.kind, "anchor")) {
        without++;
        expect(offered, item.id).toBe(false);
      }
    }
    expect(without).toBeGreaterThan(0);
  });
});
