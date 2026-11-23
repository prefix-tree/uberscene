// The crossing shot (examples/3d) sampled in Node: three.js computes transforms without a renderer, so these check
// the sampling contract itself. A frame is a function of shot time, and shot time a function of the edit time.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as THREE from "three";
import { describe, expect, it } from "vitest";

import type { ShotDefinition } from "@uberscene/kit";
import {
  type ActionInput,
  applyEdits,
  buildSourceIndex,
  collectModule,
  Executor,
  foldToSource,
  gatherLocalFiles,
  loadModule,
  resolve,
} from "@uberscene/sdk";

import { applyShot, buildShot, type ShotProps, shotTime } from "../src/libraries/shot";

const dir = join(import.meta.dirname, "..", "..", "..", "examples", "3d");
const source = readFileSync(join(dir, "crossing.tsx"), "utf8");
const files = gatherLocalFiles(source, (p) => {
  try {
    return readFileSync(join(dir, p), "utf8");
  } catch {
    return undefined;
  }
});

function placed(text: string) {
  const state = resolve(collectModule(loadModule(text, { files }) as never, {}), { version: 1, assets: {} } as never);
  const item = state.items.get("crossing-shot")!;
  expect(item.errors).toEqual([]);
  return item;
}

/** A fresh scene with the shot built in it, and a way to show any moment of the edit. */
function stage(text = source) {
  const item = placed(text);
  const props = item.props as unknown as ShotProps & { shot: ShotDefinition };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
  const built = buildShot(props.shot, scene, camera);
  const showShot = (t: number) => applyShot(props.shot, built, props, camera, t);
  /** The edit at `editT` seconds: the layer's elapsed time, turned into shot time as the player does. */
  const showEdit = (editT: number) => showShot(shotTime(editT - item.start, props, props.shot.length));
  /** Everything that moves, as numbers. */
  const pose = () => {
    const out: Record<string, number[]> = { camera: camera.matrixWorld.toArray(), fov: [camera.fov] };
    scene.traverse((o) => {
      if (o.name || o === built.objects.walker || o === built.objects.table)
        out[o.name || (o === built.objects.walker ? "walker" : "table")] = o.matrixWorld.toArray();
    });
    return out;
  };
  return { item, built, showShot, showEdit, pose };
}

describe("sampling a shot", () => {
  it("sets the same transforms at 3.2 s by playing forward, scrubbing back and jumping there", () => {
    const forward = stage();
    for (let f = 0; f <= 96; f++) forward.showShot(f / 30);
    forward.showShot(3.2);

    const back = stage();
    for (let f = 150; f >= 96; f--) back.showShot(f / 30);
    back.showShot(3.2);

    const jump = stage();
    jump.showShot(3.2);

    expect(forward.pose()).toEqual(jump.pose());
    expect(back.pose()).toEqual(jump.pose());
    // And the pose is the one the file asks for: the walker's last key, the camera between its two.
    const walker = jump.built.objects.walker as THREE.Object3D;
    expect(walker.position.toArray()).toEqual([1.5, 0, -0.8]);
  });

  it("walks: the legs swing while the walker crosses and hold once the path holds", () => {
    const s = stage();
    const leg = () => (s.built.objects.walker as THREE.Object3D).getObjectByName("legL")!.quaternion.toArray();
    s.showShot(1.0);
    const a = leg();
    s.showShot(1.25);
    expect(leg()).not.toEqual(a);
    s.showShot(4);
    const still = leg();
    s.showShot(4.8);
    expect(leg()).toEqual(still);
  });

  it("moves its choreography with the layer: the pose at 3.2 s into the shot is at 15.2 s or 23.2 s of the edit", () => {
    // The beat is the edit's, so it moves with the shot here; the next test leaves it where it is.
    const moved = (start: number) =>
      source.replace("start={2}", `start={${start}}`).replace("start={4}", `start={${start + 2}}`);
    const at12 = stage(moved(12));
    const at20 = stage(moved(20));
    at12.showEdit(15.2);
    at20.showEdit(23.2);
    const ref = stage();
    ref.showShot(3.2);
    expect(at12.pose()).toEqual(ref.pose());
    expect(at20.pose()).toEqual(ref.pose());
  });

  it("keeps a beat key on its marker when only the shot moves", () => {
    const later = stage(source.replace("start={2}", "start={2.5}"));
    const walker = later.built.objects.walker as THREE.Object3D;
    // The marker is at 4 s of the edit, so 1.5 s into the shot: the walker clears the flat there.
    later.showEdit(4);
    expect(walker.position.toArray()).toEqual([-1, 0, -0.8]);
  });

  it("starts at `in`: a layer trimmed at its head by 0.4 s still shows shot time 3.2 at 15.2 s of the edit", () => {
    const trimmed = stage(
      source
        .replace("start={2}", "start={12.4} in={0.4}")
        .replace("duration={5}", "duration={4.6}")
        .replace("start={4}", "start={14}"),
    );
    trimmed.showEdit(15.2);
    const ref = stage();
    ref.showShot(3.2);
    expect(trimmed.pose()).toEqual(ref.pose());
  });

  it("holds the last pose past the shot's length", () => {
    const s = stage();
    s.showEdit(2 + 5);
    const end = s.pose();
    s.showEdit(2 + 6);
    expect(s.pose()).toEqual(end);
  });

  it("after a drag and a key change are saved and the file reopened, 3.2 s shows the new pose", () => {
    const tree = collectModule(loadModule(source, { files }) as never, {}, { index: buildSourceIndex(source) });
    const exec = new Executor({ tree, manifest: { version: 1, assets: {} } as never, now: () => 0 });
    for (const action of [
      { type: "shot/set", params: { id: "crossing-shot", path: "objects.table.position", value: [0.4, 0, 0.6] } },
      {
        type: "key/update",
        params: { id: "crossing-shot", path: "objects.walker.position", at: 3.2, value: [1.2, 0, -0.6] },
      },
    ] as ActionInput[])
      expect(exec.execute(action).ok).toBe(true);
    const saved = applyEdits(source, foldToSource(source, exec.log(), exec.state()).edits);

    const reopened = stage(saved);
    reopened.showShot(3.2);
    expect((reopened.built.objects.table as THREE.Object3D).position.toArray()).toEqual([0.4, 0, 0.6]);
    expect((reopened.built.objects.walker as THREE.Object3D).position.toArray()).toEqual([1.2, 0, -0.6]);
  });
});
