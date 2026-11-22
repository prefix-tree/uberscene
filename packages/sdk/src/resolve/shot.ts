// A `<Three shot>` places a shot's objects and sets its inputs with literal props. Once the layer's start is known,
// this checks those props against what the shot declares, and turns every `"marker:ID"` (an input, or a key's `at`)
// into seconds of shot time, so a pose tied to a beat follows the beat when either moves.
import { isShot, SHOT_CHANNELS, type ShotDefinition } from "@uberscene/kit";

import type { ResolveError } from "./errors";

const MARKER = /^marker:([A-Za-z_][A-Za-z0-9_-]*)$/;

/** Shot time of edit time `editT` for a layer that starts at `start` with `in`: speed is 1. */
export function shotSecondsOf(editT: number, start: number, inT: number): number {
  return inT + (editT - start);
}

interface Ctx {
  readonly id: string;
  readonly start: number;
  readonly in: number;
  readonly markers: ReadonlyMap<string, number>;
  readonly errors: ResolveError[];
}

function markerSeconds(ref: string, prop: string, ctx: Ctx): number | undefined {
  const m = MARKER.exec(ref);
  if (!m) return undefined;
  const at = ctx.markers.get(m[1] as string);
  if (at === undefined) {
    ctx.errors.push({ code: "SCHEMA", id: ctx.id, prop, message: `no <Marker id="${m[1]}"> in the composition` });
    return 0;
  }
  return Math.round(shotSecondsOf(at, ctx.start, ctx.in) * 1e6) / 1e6;
}

/** A channel's value with each key's marker `at` in shot seconds; keys re-sorted, since a marker may move past another. */
function resolveKeys(value: unknown, prop: string, ctx: Ctx): unknown {
  if (!Array.isArray(value) || value.length === 0 || typeof value[0] !== "object" || value[0] === null) return value;
  let changed = false;
  const keys = (value as Record<string, unknown>[]).map((k, i) => {
    if (typeof k.at !== "string") return k;
    changed = true;
    return { ...k, at: markerSeconds(k.at, `${prop}.${i}.at`, ctx) ?? 0 };
  });
  return changed ? keys.sort((a, b) => (a.at as number) - (b.at as number)) : value;
}

/** The layer's props with markers resolved, and errors for objects, channels and inputs the shot does not have. */
export function resolveShotProps(
  props: Readonly<Record<string, unknown>>,
  id: string,
  start: number,
  markers: ReadonlyMap<string, number>,
  errors: ResolveError[],
): Readonly<Record<string, unknown>> {
  if (!isShot(props.shot)) return props;
  const shot: ShotDefinition = props.shot;
  const ctx: Ctx = { id, start, in: typeof props.in === "number" ? props.in : 0, markers, errors };
  const out: Record<string, unknown> = { ...props };

  const objects = (props.objects ?? {}) as Record<string, Record<string, unknown>>;
  const placed: Record<string, Record<string, unknown>> = {};
  for (const [name, channels] of Object.entries(objects)) {
    const spec = shot.objects[name];
    if (!spec) {
      const known = Object.keys(shot.objects);
      errors.push({
        code: "SCHEMA",
        id,
        prop: `objects.${name}`,
        message: `the shot has no object "${name}"${known.length ? `; it has ${known.join(", ")}` : ""}`,
      });
      continue;
    }
    const next: Record<string, unknown> = {};
    for (const channel of SHOT_CHANNELS) {
      if (channels[channel] === undefined) continue;
      if (spec.computes?.includes(channel)) {
        errors.push({
          code: "SCHEMA",
          id,
          prop: `objects.${name}.${channel}`,
          message: `the shot computes ${name}'s ${channel} on every frame, so a value here would never show; set one of its inputs (${Object.keys(shot.inputs).join(", ") || "none"})`,
        });
        continue;
      }
      next[channel] = resolveKeys(channels[channel], `objects.${name}.${channel}`, ctx);
    }
    placed[name] = next;
  }
  if (props.objects !== undefined) out.objects = placed;

  if (props.camera && typeof props.camera === "object") {
    const camera = { ...(props.camera as Record<string, unknown>) };
    for (const field of ["position", "lookAt", "fov"])
      if (camera[field] !== undefined) camera[field] = resolveKeys(camera[field], `camera.${field}`, ctx);
    out.camera = camera;
  }

  const inputs: Record<string, unknown> = {};
  for (const [name, value] of Object.entries((props.inputs ?? {}) as Record<string, unknown>)) {
    if (!(name in shot.inputs)) {
      errors.push({
        code: "SCHEMA",
        id,
        prop: `inputs.${name}`,
        message: `the shot has no input "${name}"; it reads ${Object.keys(shot.inputs).join(", ") || "none"}`,
      });
      continue;
    }
    inputs[name] =
      typeof value === "string"
        ? (markerSeconds(value, `inputs.${name}`, ctx) ?? value)
        : resolveKeys(value, `inputs.${name}`, ctx);
  }
  if (props.inputs !== undefined) out.inputs = inputs;
  return out;
}
