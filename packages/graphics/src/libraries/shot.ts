// Samples a 3D shot at a time. Everything here reads the time and the tag's props, never the frame before, so playing
// forward, scrubbing back and jumping straight to a moment set the same transforms.
import * as THREE from "three";

import type { ShotBuilt, ShotDefinition, ShotInputDefault } from "@uberscene/kit";
import { type CurveKey, curveAt } from "@uberscene/kit/schema";

type Vec3 = readonly [number, number, number];

/** What `<Three>` passes to a shot: the tag's own props, resolved. */
export interface ShotProps {
  readonly in?: number;
  readonly objects?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly inputs?: Readonly<Record<string, unknown>>;
  readonly camera?: Readonly<Record<string, unknown>>;
}

/** The shot's own time at `elapsed` seconds into the layer: `in` plus the elapsed time, held at the shot's length. */
export function shotTime(elapsed: number, props: Pick<ShotProps, "in">, length?: number): number {
  // To the microsecond, so 15.2 - 12 and 23.2 - 20 are the same 3.2 and set the same pose.
  const t = Math.round(((props.in ?? 0) + elapsed) * 1e6) / 1e6;
  return length !== undefined ? Math.min(t, length) : t;
}

function isKeys(v: unknown): v is readonly CurveKey[] {
  return Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null && "at" in v[0];
}

/** A constant, or the value of its keys at `t`. */
function valueAt<T>(v: unknown, t: number): T | undefined {
  return (isKeys(v) ? curveAt(v, t) : v) as T | undefined;
}

/** The inputs at `t`: the shot's defaults under the tag's values, keys read on their curve. */
function inputsAt(shot: ShotDefinition, props: ShotProps, t: number): Record<string, ShotInputDefault> {
  const out: Record<string, ShotInputDefault> = { ...shot.inputs };
  for (const [name, v] of Object.entries(props.inputs ?? {})) {
    const value = valueAt<ShotInputDefault>(v, t);
    if (value !== undefined) out[name] = value;
  }
  return out;
}

const DEG = Math.PI / 180;

/** Sets the camera from the tag's `camera` at `t`: position, look-at and field of view may each be keys. */
export function applyCamera(camera: THREE.Camera, spec: ShotProps["camera"], t: number): void {
  if (!spec) return;
  const position = valueAt<Vec3>(spec.position, t);
  const lookAt = valueAt<Vec3>(spec.lookAt, t);
  const fov = valueAt<number>(spec.fov, t);
  if (position) camera.position.set(...position);
  if (camera instanceof THREE.PerspectiveCamera && fov !== undefined && camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  if (lookAt) camera.lookAt(...lookAt);
  camera.updateMatrixWorld();
}

/**
 * Puts the built scene at shot time `t`: first each object where the tag places it, then what the module computes.
 * A channel the tag does not write keeps what `build` gave it, which nothing changes after, so it too is the same at
 * every visit.
 */
export function applyShot(
  shot: ShotDefinition,
  built: ShotBuilt,
  props: ShotProps,
  camera: THREE.Camera,
  t: number,
): void {
  applyCamera(camera, props.camera, t);
  for (const [id, placed] of Object.entries(props.objects ?? {})) {
    const object = built.objects[id] as THREE.Object3D | undefined;
    if (!object) continue;
    const position = valueAt<Vec3>(placed.position, t);
    const rotation = valueAt<Vec3>(placed.rotation, t);
    const scale = valueAt<Vec3>(placed.scale, t);
    if (position) object.position.set(...position);
    if (rotation) object.rotation.set(rotation[0] * DEG, rotation[1] * DEG, rotation[2] * DEG, "XYZ");
    if (scale) object.scale.set(...scale);
  }
  built.sample?.(t, { THREE, camera, objects: built.objects, inputs: inputsAt(shot, props, t) });
  for (const object of Object.values(built.objects)) (object as THREE.Object3D).updateMatrixWorld(true);
}

/** Builds a shot into a scene: `build` once, with each returned object checked against what the shot declares. */
export function buildShot(shot: ShotDefinition, scene: THREE.Scene, camera: THREE.Camera): ShotBuilt {
  const built = shot.build({ THREE, scene, camera });
  for (const id of Object.keys(shot.objects))
    if (!(built.objects[id] instanceof THREE.Object3D))
      throw new Error(`the shot declares "${id}" but build did not return it as an Object3D`);
  return built;
}
