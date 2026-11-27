// One path a key list or a generator may sit at, and how such an entry is written. The groups of them are in
// `key-paths.ts`; a kind's own are in its folder (`elements/shape/key-paths.ts`).
import type { CurveBlend } from "../easing";

export interface KeyPath {
  /** Where the value is written in the element's props: `transform.rotation`, `volume`, `stroke.color`, `zoom`. */
  readonly path: string;
  /** What its keyframe and generator items are named: `transform.rotation`, `audio.volume`, `shape.stroke.color`. */
  readonly property: string;
  /** How the value moves between two keys: a number, a colour through OKLab, or points one by one. */
  readonly blend: CurveBlend;
  /** A number, so it also takes a generator. A colour or a list of points takes keys only. */
  readonly numeric: boolean;
  /**
   * What is left written once the keys are items. `first`: the first key's value, so the prop stays a value (a shape's
   * own values, a camera's). `removed`: nothing, the keys alone say it. `key`: nothing, and a constant is one key too
   * (a pan, which the mixer reads only from keys).
   */
  readonly constant: "first" | "removed" | "key";
  /** Its value when nothing is written. */
  readonly missing?: number;
  /** The prop must stay written: a generator with no `base` leaves `missing` there. */
  readonly required?: boolean;
  /** Whose clock its keys run on: the element's own, or the video's (a camera's). */
  readonly clock: "element" | "video";
  /** The path one list for both axes is written at (`transform.scale` for `.x` and `.y`). */
  readonly both?: string;
  /** Why `value` cannot be one of its keys, or null. A key's value is not parsed with the props, so it is checked here. */
  readonly check?: (value: unknown) => string | null;
}

/** A number's entry, keyed on the element's clock and written where its items are named, unless `more` says otherwise. */
export const keyPath = (path: string, more: Partial<KeyPath> = {}): KeyPath => ({
  path,
  property: path,
  blend: "number",
  numeric: true,
  constant: "removed",
  clock: "element",
  ...more,
});
