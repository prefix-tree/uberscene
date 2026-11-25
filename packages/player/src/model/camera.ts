import { CAMERA_FIELDS } from "@uberscene/kit/schema";
import type { Placement, ResolvedState } from "@uberscene/sdk/resolver";

import { keyframedValue } from "./keyframes";
import { IDENTITY, type Matrix2D, multiply, rotate, scaleM, translate } from "./transform";

/** A `<Camera>`'s four values at one moment. */
export interface CameraValues {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  readonly rotation: number;
}

interface CameraUse {
  readonly placement: Placement;
  readonly keys: readonly Placement[];
  /** Tracks the camera moves. */
  readonly tracks: ReadonlySet<string>;
}

const uses = new WeakMap<ResolvedState, CameraUse | null>();

function cameraUse(state: ResolvedState): CameraUse | null {
  const known = uses.get(state);
  if (known !== undefined) return known;
  const id = state.tracks.find((t) => t.camera !== undefined)?.camera;
  const placement = id === undefined ? undefined : state.items.get(id);
  const use: CameraUse | null = placement
    ? {
        placement,
        keys: placement.children.flatMap((c) => {
          const k = state.items.get(c);
          return k?.kind === "keyframe" ? [k] : [];
        }),
        tracks: new Set(state.tracks.filter((t) => t.camera === placement.id).map((t) => t.id)),
      }
    : null;
  uses.set(state, use);
  return use;
}

/** The camera's values at composition time `t`, or null in a file without a camera that holds a track. */
export function cameraValuesAt(state: ResolvedState, t: number): CameraValues | null {
  const use = cameraUse(state);
  if (!use) return null;
  const value = (field: keyof CameraValues): number => {
    const base = use.placement.props[field];
    const constant = typeof base === "number" ? base : CAMERA_FIELDS[field];
    return Number(keyframedValue(use.keys, `camera.${field}`, t, constant));
  };
  return { x: value("x"), y: value("y"), zoom: value("zoom"), rotation: value("rotation") };
}

/**
 * What a camera does to composition pixels: the view's centre moves by (`x`, `y`), it closes in by `zoom` and turns
 * `rotation` degrees clockwise about the frame's centre, so what it shows moves, grows and turns the other way.
 */
export function cameraMatrix(v: CameraValues, comp: { readonly width: number; readonly height: number }): Matrix2D {
  const cx = comp.width / 2;
  const cy = comp.height / 2;
  if (v.x === 0 && v.y === 0 && v.zoom === 1 && v.rotation === 0) return IDENTITY;
  return multiply(
    multiply(multiply(translate(cx, cy), rotate(-v.rotation)), scaleM(v.zoom, v.zoom)),
    translate(-cx - v.x, -cy - v.y),
  );
}

let last: { state: ResolvedState; t: number; matrix: Matrix2D | null } | undefined;

/** The camera's matrix at composition time `t`: null without a camera, or while it shows everything as written. */
export function cameraAt(state: ResolvedState, t: number): Matrix2D | null {
  if (last && last.state === state && last.t === t) return last.matrix;
  const values = cameraValuesAt(state, t);
  const made = values ? cameraMatrix(values, state.composition) : null;
  const matrix = made === IDENTITY ? null : made;
  last = { state, t, matrix };
  return matrix;
}

/** The camera's matrix for something on `track` at `t`: null when the track is outside the camera. */
export function trackCamera(state: ResolvedState, track: string | null, t: number): Matrix2D | null {
  if (track === null || !cameraUse(state)?.tracks.has(track)) return null;
  return cameraAt(state, t);
}
