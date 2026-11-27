// One path a key list or a generator may sit at, and how a schema says a value is one. A schema marks the value
// (`animatable`, `keyed`, `linked` in `schemas/common.ts`), and a kind's paths are read from its schema
// (`keyPathsIn` in `key-paths.ts`): nothing lists them a second time.
import type { z } from "zod";

import type { CurveBlend } from "../easing";

export interface KeyPath {
  /** Where the value is written in the element's props: `transform.rotation`, `volume`, `stroke.color`, `zoom`. */
  readonly path: string;
  /** What its keyframe and generator items are named: `transform.rotation`, `audio.volume`, `shape.stroke.color`. */
  readonly property: string;
  /** How the value moves between two keys: a number, a colour through OKLab, or points one by one. */
  readonly blend: CurveBlend;
  /** A number, so it also takes a link to another number. A colour or a list of points takes keys only. */
  readonly numeric: boolean;
  /** It also takes a generator (a wiggle, a drift, a loop). A sound's level and pan do not: the mixer reads keys. */
  readonly generated: boolean;
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

/**
 * What a schema says of a value that takes keys, besides its type. All of it is optional: a number under `transform`
 * says nothing and is named by its path.
 */
export interface KeyHow {
  /**
   * The name its items go under, for a kind's own values: `shape` names a shape's `width` `shape.width`. Left out,
   * the items are named by the path.
   */
  readonly group?: string;
  /** The whole name of its items, where it is not the path under a group: `audio.volume` for `volume`. */
  readonly property?: string;
  /** What is left written once the keys are items (`KeyPath.constant`). Left out, `removed`. */
  readonly constant?: KeyPath["constant"];
  /** Its value when nothing is written. Left out, the schema's default when it has one. */
  readonly missing?: number;
  /** The prop must stay written (`KeyPath.required`). */
  readonly required?: boolean;
  /** Whose clock its keys run on. Left out, the element's. */
  readonly clock?: KeyPath["clock"];
  /** How it moves between two keys. Left out, as a number. */
  readonly blend?: CurveBlend;
  /**
   * What a key's value is, in words, for the message when one is not: "a number of pixels above 0" gives "a key on
   * width is a number of pixels above 0". With it, a key's value is checked against the value's schema.
   */
  readonly says?: string;
  /** With `says`: whether a value may be a key's, where the value's schema does not say (a colour's theme token). */
  readonly accepts?: (value: unknown) => boolean;
}

/** A marked value: what its schema's author said, what kind of value it is, and the schema of one value. */
export interface KeyMark extends KeyHow {
  readonly numeric: boolean;
  readonly generated: boolean;
  readonly value: z.ZodType;
}

const MARKS = new WeakMap<object, KeyMark>();

/** `schema`, marked as a value that takes keys. The mark is kept beside the schema, never in what it parses. */
export function markKey<S extends object>(schema: S, mark: KeyMark): S {
  MARKS.set(schema, mark);
  return schema;
}

/** What `schema` was marked with, if it is a value that takes keys. */
export function keyMarkOf(schema: object): KeyMark | undefined {
  return MARKS.get(schema);
}
