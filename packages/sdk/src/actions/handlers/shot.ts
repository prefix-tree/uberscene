// What the viewport writes for a 3D shot. A drag sets a literal channel of a placed object (`shot/set`), or a key at
// the playhead's shot time (`key/add`, `key/update` on the same paths). Channels the shot computes, and objects and
// inputs it does not declare, are refused with the reason, so nothing is written that the next frame would undo.
import { isShot, SHOT_CHANNELS, type ShotDefinition } from "@uberscene/kit";

import { isKeyList } from "../../resolve/expand";
import type { ResolvedState } from "../../resolve/resolve";
import { shotSecondsOf } from "../../resolve/shot";
import { define, makePropHandler, rawNode } from "../handler-kit";
import { invalid, ok, type ValidationResult } from "../types";
import { readPath, writePath } from "./effect";

const CAMERA_FIELDS = ["position", "lookAt", "fov"] as const;

/** Whether `path` is one a shot or a `<Three>` camera holds: `objects.<id>.<channel>`, `camera.<field>`, `inputs.<name>`. */
export function isShotPath(path: string): boolean {
  return /^(objects\.[A-Za-z_][\w-]*\.\w+|camera\.\w+|inputs\.[A-Za-z_]\w*)$/.test(path);
}

function shotOf(state: ResolvedState, id: string): ShotDefinition | undefined {
  const shot = state.items.get(id)?.props.shot;
  return isShot(shot) ? shot : undefined;
}

/** Why `path` on `<Three id>` cannot be written, or null. */
export function shotPathProblem(state: ResolvedState, id: string, path: string): string | null {
  const item = state.items.get(id);
  if (item?.kind !== "layer" || item.props.engine !== "three") return `"${path}" is a path of a <Three>`;
  const [head, name, channel] = path.split(".") as [string, string, string | undefined];
  if (head === "camera")
    return (CAMERA_FIELDS as readonly string[]).includes(name)
      ? null
      : `the camera's moving fields are ${CAMERA_FIELDS.join(", ")}`;
  const shot = shotOf(state, id);
  if (!shot) return `"${id}" has no shot, so it has no ${head}`;
  if (head === "inputs") {
    if (!(name in shot.inputs))
      return `the shot has no input "${name}"; it reads ${Object.keys(shot.inputs).join(", ")}`;
    return null;
  }
  const spec = shot.objects[name];
  if (!spec) return `the shot has no object "${name}"; it has ${Object.keys(shot.objects).join(", ")}`;
  if (!channel || !(SHOT_CHANNELS as readonly string[]).includes(channel))
    return `an object's channels are ${SHOT_CHANNELS.join(", ")}`;
  if (spec.computes?.includes(channel as never)) {
    const inputs = Object.keys(shot.inputs);
    return `the shot computes ${name}'s ${channel} on every frame, so a value written here would never show; change ${inputs.length ? `one of its inputs (${inputs.join(", ")})` : "the module"} instead`;
  }
  return null;
}

/** Why `value` cannot sit at `path`, or null: channels and camera points are `[x, y, z]`, the rest numbers. */
export function shotValueProblem(state: ResolvedState, id: string, path: string, value: unknown): string | null {
  const [head, name] = path.split(".") as [string, string];
  const vec3 = head === "objects" || (head === "camera" && name !== "fov");
  if (vec3)
    return Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === "number" && Number.isFinite(n))
      ? null
      : `${path} takes [x, y, z]`;
  if (head === "inputs") {
    const def = shotOf(state, id)?.inputs[name];
    if (typeof def !== typeof value && !(typeof def === "number" && typeof value === "string"))
      return `input "${name}" is a ${typeof def}`;
    return null;
  }
  return typeof value === "number" && Number.isFinite(value) ? null : `${path} takes a number`;
}

/**
 * A key's time in seconds on a shot path: its `at`, or the shot time of the marker it names. Elsewhere `at` is a
 * number already.
 */
export function keyTime(state: ResolvedState, id: string, at: unknown): number {
  if (typeof at === "number") return at;
  const m = typeof at === "string" ? /^marker:(.+)$/.exec(at) : null;
  const item = state.items.get(id);
  const marker = m ? state.items.get(m[1] as string) : undefined;
  if (!item || !marker) return Number.NaN;
  return shotSecondsOf(marker.start, item.start, typeof item.props.in === "number" ? item.props.in : 0);
}

const problem = (message: string | null, path = "path"): ValidationResult =>
  message ? invalid({ code: "INVALID_PARAMS", message, path }) : ok;

define(makePropHandler({
  type: "shot/set",
  kinds: ["layer"],
  write: (p, state) => {
    const { prop, value } = writePath(rawNode(state, p.id)?.props, p.path, p.value);
    return { [prop]: value };
  },
  validate: (a, state) => {
    const { id, path, value } = a.params;
    const where = shotPathProblem(state, id, path);
    if (where) return problem(where);
    if (isKeyList(readPath(rawNode(state, id)?.props, path)))
      return problem(`${path} has keys; change the one at the playhead with key/update, or add one with key/add`);
    return value === undefined ? ok : problem(shotValueProblem(state, id, path, value), "value");
  },
}));
