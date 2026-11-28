// The crossing scene (examples/3d) posed in Node: three.js computes transforms without a renderer, so this checks the
// contract itself. A frame is a function of scene time, and scene time comes from the clip like a file's source time.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { collectModule, editStage, gatherLocalFiles, loadModule, resolve, type SceneUse } from "@uberscene/sdk";

import { buildScene, poseScene } from "../src/libraries/scene3d";

const dir = join(import.meta.dirname, "..", "..", "..", "examples", "3d");
const edit = readFileSync(join(dir, "crossing.tsx"), "utf8");
const sceneText = readFileSync(join(dir, "crossing.scene.js"), "utf8");

function use(text = edit, scene = sceneText): { use: SceneUse; start: number; in: number; speed: number } {
  const files = gatherLocalFiles(text, (p) => (p === "crossing.scene.js" ? scene : undefined));
  const state = resolve(collectModule(loadModule(text, { files }) as never, {}), { assets: {} } as never);
  expect(state.errors).toEqual([]);
  const clip = state.items.get("crossing-shot")!;
  return {
    use: state.scenes!.get(clip.source!.asset)!,
    start: clip.range.start.toSeconds(),
    in: clip.source!.in,
    speed: clip.source!.speed,
  };
}

/** A fresh build of the scene, and a way to show a moment of the edit as the player does (`in + elapsed × speed`). */
function stage(text = edit, scene = sceneText) {
  const u = use(text, scene);
  const built = buildScene(u.use);
  const showScene = (t: number) => poseScene(u.use, built, t);
  const showEdit = (t: number) => showScene(Math.round((u.in + (t - u.start) * u.speed) * 1e6) / 1e6);
  const pose = () => {
    const out: Record<string, number[]> = { camera: built.camera.matrixWorld.toArray(), fov: [built.camera.fov] };
    built.root.traverse((o) => {
      if (o.name) out[o.name] = o.matrixWorld.toArray();
    });
    for (const [name, o] of Object.entries(built.objects)) out[name] = o.matrixWorld.toArray();
    return out;
  };
  return { built, showScene, showEdit, pose };
}

describe("posing a scene", () => {
  it("sets the same transforms at 3.2 s by playing forward, scrubbing back and jumping there", () => {
    const forward = stage();
    for (let f = 0; f <= 96; f++) forward.showScene(f / 30);
    forward.showScene(3.2);
    const back = stage();
    for (let f = 150; f >= 96; f--) back.showScene(f / 30);
    back.showScene(3.2);
    const jump = stage();
    jump.showScene(3.2);
    expect(forward.pose()).toEqual(jump.pose());
    expect(back.pose()).toEqual(jump.pose());
    expect(jump.built.objects.walker!.position.toArray()).toEqual([1.5, 0, -0.8]);
  });

  it("walks while the walker crosses, and stands still once the path holds", () => {
    const s = stage();
    const leg = () => s.built.objects.walker!.getObjectByName("legL")!.quaternion.toArray();
    s.showScene(1);
    const a = leg();
    s.showScene(1.25);
    expect(leg()).not.toEqual(a);
    s.showScene(4);
    const still = leg();
    s.showScene(4.8);
    expect(leg()).toEqual(still);
  });

  it("moves with its clip: the pose 3.2 s into the scene is at 15.2 s or 23.2 s of the edit", () => {
    const moved = (start: number) =>
      edit.replace("start={2}", `start={${start}}`).replace("start={4}", `start={${start + 2}}`);
    const at12 = stage(moved(12));
    const at20 = stage(moved(20));
    at12.showEdit(15.2);
    at20.showEdit(23.2);
    const ref = stage();
    ref.showScene(3.2);
    expect(at12.pose()).toEqual(ref.pose());
    expect(at20.pose()).toEqual(ref.pose());
  });

  it("is trimmed like footage: a head trim of 0.4 s shows the same scene time at the same moment", () => {
    const trimmed = stage(edit.replace("start={2}", "start={2.4} in={0.4}"));
    trimmed.showEdit(5.2);
    const ref = stage();
    ref.showEdit(5.2);
    expect(trimmed.pose()).toEqual(ref.pose());
  });

  it("comes out from behind the flat on the beat, wherever the beat is", () => {
    const later = stage(edit.replace("start={4}", "start={4.5}"));
    later.showEdit(4.5);
    expect(later.built.objects.walker!.position.toArray()).toEqual([-1, 0, -0.8]);
  });

  it("uses the lens as a full-frame focal length", () => {
    const s = stage();
    s.showScene(0);
    expect(s.built.camera.fov).toBeCloseTo((2 * Math.atan(24 / (2 * 38)) * 180) / Math.PI, 6);
  });

  it("shows a drag saved to the scene file once it is loaded again", () => {
    const dragged = editStage(sceneText, { kind: "set", path: "table.position", value: [0.4, 0, 0.6] });
    const keyed = editStage(dragged, { kind: "key", path: "walker.position", at: 3.2, value: [1.2, 0, -0.6] });
    const s = stage(edit, keyed);
    s.showScene(3.2);
    expect(s.built.objects.table!.position.toArray()).toEqual([0.4, 0, 0.6]);
    expect(s.built.objects.walker!.position.toArray()).toEqual([1.2, 0, -0.6]);
  });

  it("refuses a build that returns something that is not a three.js object", () => {
    const bad = sceneText.replace("return { table, flat, walker };", "return { table, flat, walker, note: 42 };");
    expect(() => buildScene(use(edit, bad).use)).toThrow(/"note", which is not an Object3D/);
  });
});
