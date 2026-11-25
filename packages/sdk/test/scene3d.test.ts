import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { collectModule, editStage, gatherLocalFiles, loadModule, resolve, stageOf } from "@uberscene/sdk";

const dir = join(import.meta.dirname, "..", "..", "..", "examples", "3d");
const edit = readFileSync(join(dir, "crossing.tsx"), "utf8");
const scene = readFileSync(join(dir, "crossing.scene.js"), "utf8");
const manifest = { assets: {} } as never;

function load(text = edit, sceneText = scene) {
  const files = gatherLocalFiles(text, (p) => (p === "crossing.scene.js" ? sceneText : undefined));
  return resolve(collectModule(loadModule(text, { files }) as never, {}), manifest);
}

/** The lines that differ between two texts, trimmed, as `- old` / `+ new` pairs. */
function diff(a: string, b: string): string[] {
  const x = a.split("\n");
  const y = b.split("\n");
  const out: string[] = [];
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    if (x[i] !== y[i]) out.push(`- ${x[i]?.trim()}`, `+ ${y[i]?.trim()}`);
  return out;
}

describe("a clip that plays a 3D scene", () => {
  it("is placed like footage, the scene's length long, with its named times in scene seconds", () => {
    const state = load();
    expect(state.errors).toEqual([]);
    const clip = state.items.get("crossing-shot")!;
    expect([clip.start, clip.end]).toEqual([2, 7]);
    expect(clip.source).toMatchObject({ in: 0, out: 5, speed: 1 });
    const use = state.scenes?.get(clip.source!.asset);
    expect(use?.times).toEqual({ reveal: 2 });
    expect([use?.width, use?.height, use?.fps]).toEqual([1920, 1080, 30]);
  });

  it("keeps the beat on its marker when the clip moves, is trimmed or plays faster", () => {
    const times = (text: string) => {
      const state = load(text);
      expect(state.errors).toEqual([]);
      return state.scenes?.get(state.items.get("crossing-shot")!.source!.asset)?.times;
    };
    // Later in the edit: the marker at 4 s is 1 s into the clip.
    expect(times(edit.replace("start={2}", "start={3}"))).toEqual({ reveal: 1 });
    // Its head trimmed by 0.5 s: in moves with start, so the beat is still at scene time 2.
    expect(times(edit.replace("start={2}", "start={2.5} in={0.5}"))).toEqual({ reveal: 2 });
    // At double speed, 2 s of the edit is 4 s of the scene.
    expect(times(edit.replace("start={2}", "start={2} speed={2}"))).toEqual({ reveal: 4 });
  });

  it("opens fresh frames when the beat moves: the asset its frames come from names the times", () => {
    const a = load().items.get("crossing-shot")!.source!.asset;
    const b = load(edit.replace("start={4}", "start={3.5}")).items.get("crossing-shot")!.source!.asset;
    expect(a).not.toBe(b);
  });

  it("says when the scene uses a time the clip does not hand in, or a marker the edit does not have", () => {
    const missing = load(edit.replace(' times={{ reveal: "marker:reveal" }}', ""));
    expect(missing.errors.map((e) => e.message).join()).toContain('the scene\'s keys use the time "reveal"');
    const unknown = load(edit.replace('"marker:reveal"', '"marker:beat"'));
    expect(unknown.errors.map((e) => e.message).join()).toContain('no <Marker id="beat">');
  });

  it("refuses a value that is not a scene module", () => {
    const state = load(edit.replace("src={crossing}", "src={{ length: 5 }}"));
    expect(state.errors.some((e) => e.id === "crossing-shot")).toBe(true);
  });
});

describe("what the viewport writes to the scene file", () => {
  it("reads the stage as data", () => {
    const stage = stageOf(scene);
    expect(stage.table).toEqual({ position: [0, 0, 0.6] });
    expect((stage.walker as { stride: number }).stride).toBe(1.4);
  });

  it("drag the table: the numbers in its one line", () => {
    const next = editStage(scene, { kind: "set", path: "table.position", value: [0.4, 0, 0.6] });
    expect(diff(scene, next)).toEqual(["- table: { position: [0, 0, 0.6] },", "+ table: { position: [0.4, 0, 0.6] },"]);
  });

  it("change the walker's key at 3.2 s: that key's value, nothing else", () => {
    const next = editStage(scene, { kind: "key", path: "walker.position", at: 3.2, value: [1.2, 0, -0.6] });
    expect(diff(scene, next)).toEqual([
      "- { at: 3.2, value: [1.5, 0, -0.8] },",
      "+ { at: 3.2, value: [1.2, 0, -0.6] },",
    ]);
  });

  it("finds a key tied to a named time by where the playhead shows it, and keeps it tied", () => {
    const next = editStage(
      scene,
      { kind: "key", path: "walker.position", at: 2, value: [-0.8, 0, -0.8] },
      { reveal: 2 },
    );
    expect(diff(scene, next)).toEqual([
      '- { at: "reveal", value: [-1, 0, -0.8] },',
      '+ { at: "reveal", value: [-0.8, 0, -0.8] },',
    ]);
  });

  it("retime the end of the crossing: the key's time", () => {
    const next = editStage(scene, { kind: "moveKey", path: "walker.position", at: 3.2, to: 2.8 });
    expect(diff(scene, next)).toEqual([
      "- { at: 3.2, value: [1.5, 0, -0.8] },",
      "+ { at: 2.8, value: [1.5, 0, -0.8] },",
    ]);
  });

  it("key a constant at the playhead: what it was at 0, then the new key", () => {
    const next = editStage(scene, { kind: "key", path: "table.position", at: 3.2, value: [0.3, 0, 0.6] });
    expect(stageOf(next).table).toEqual({
      position: [
        { at: 0, value: [0, 0, 0.6] },
        { at: 3.2, value: [0.3, 0, 0.6] },
      ],
    });
  });

  it("adds a key between two, on its own line as its neighbours are", () => {
    const next = editStage(
      scene,
      { kind: "key", path: "walker.position", at: 2.6, value: [0.4, 0, -0.8] },
      { reveal: 2 },
    );
    expect(diff(scene, next).filter((l) => l.startsWith("+"))).toContain("+ { at: 2.6, value: [0.4, 0, -0.8] },");
    const keys = (stageOf(next).walker as { position: { at: unknown }[] }).position.map((k) => k.at);
    expect(keys).toEqual([0.5, "reveal", 2.6, 3.2]);
    expect(next.split("\n").length).toBe(scene.split("\n").length + 1);
  });

  it("removes a key and its line", () => {
    const next = editStage(scene, { kind: "removeKey", path: "walker.position", at: 0.5 });
    expect((stageOf(next).walker as { position: unknown[] }).position).toHaveLength(2);
    expect(next.split("\n").length).toBe(scene.split("\n").length - 1);
  });

  it("adds a channel or an object the stage does not have yet", () => {
    const turned = editStage(scene, { kind: "set", path: "table.rotation", value: [0, 15, 0] });
    expect(stageOf(turned).table).toEqual({ position: [0, 0, 0.6], rotation: [0, 15, 0] });
    const lamp = editStage(scene, { kind: "set", path: "lamp.position", value: [1, 2, 0] });
    expect(stageOf(lamp).lamp).toEqual({ position: [1, 2, 0] });
  });

  it("refuses to write a constant over keys, or into code", () => {
    expect(() => editStage(scene, { kind: "set", path: "walker.position", value: [0, 0, 0] })).toThrow(/has keys/);
    const coded = scene.replace("table: { position: [0, 0, 0.6] }", "table: { position: spot() }");
    expect(() => editStage(coded, { kind: "key", path: "table.position", at: 1, value: [0, 0, 0] })).toThrow(/is code/);
  });

  it("leaves the scene loadable, and the edit resolves with the new stage", () => {
    const next = editStage(scene, { kind: "moveKey", path: "walker.position", at: 3.2, to: 2.8 });
    const state = load(edit, next);
    expect(state.errors).toEqual([]);
  });
});
