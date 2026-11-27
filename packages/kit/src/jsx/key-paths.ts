// The paths a key list, a generator or a link may sit at, read from a schema. A schema marks each value that takes
// keys (`animatable`, `keyed`, `linked`), and `keyPathsIn` walks it once: an element kind's paths are its schema's
// (`keyPathsOf` in `capabilities.ts`), in the schema's order, so a new value that changes over time is written once,
// where the prop is.
import type { z } from "zod";

import { shapeSchema } from "../elements/shape/schema";
import { type KeyMark, type KeyPath, keyMarkOf } from "./key-path";
import { placedSchema, soundSchema } from "./schemas/common";
import { cameraSchema } from "./schemas/composition";

export type { KeyHow, KeyPath } from "./key-path";

/** A schema's parts, as zod keeps them: all the walk reads. */
interface Def {
  readonly type: string;
  readonly innerType?: z.ZodType;
  readonly defaultValue?: unknown;
  readonly shape?: Readonly<Record<string, z.ZodType>>;
  readonly options?: readonly z.ZodType[];
}
const defOf = (schema: z.ZodType): Def => (schema as unknown as { def: Def }).def;

function entry(path: string, mark: KeyMark, unwritten: number | undefined): KeyPath {
  const missing = mark.missing ?? unwritten;
  const { says, accepts, value } = mark;
  return {
    path,
    property: mark.property ?? (mark.group ? `${mark.group}.${path}` : path),
    blend: mark.blend ?? "number",
    numeric: mark.numeric,
    generated: mark.generated,
    constant: mark.constant ?? "removed",
    clock: mark.clock ?? "element",
    ...(missing !== undefined ? { missing } : {}),
    ...(mark.required ? { required: true } : {}),
    ...(says !== undefined
      ? {
          check: (key: unknown) =>
            (accepts ? accepts(key) : value.safeParse(key).success) ? null : `a key on ${path} is ${says}`,
        }
      : {}),
  };
}

function walk(schema: z.ZodType, path: string): readonly KeyPath[] {
  // What a prop is under `optional` and `default`; a number it defaults to is its value when nothing is written.
  let unwritten: number | undefined;
  let inner = schema;
  for (let def = defOf(inner); def.innerType && def.type !== "pipe"; def = defOf(inner)) {
    if (def.type === "default" && typeof def.defaultValue === "number") unwritten = def.defaultValue;
    inner = def.innerType;
  }
  const mark = keyMarkOf(inner);
  if (mark) return [entry(path, mark, unwritten)];
  const def = defOf(inner);
  if (def.type === "object" && def.shape)
    return Object.entries(def.shape).flatMap(([name, prop]) => walk(prop, path === "" ? name : `${path}.${name}`));
  if (def.type === "union" && def.options) {
    // A value written whole or as its parts (`scale`, or `scale.x` and `scale.y`): the parts are the paths, and
    // each says the one path a list for all of them is written at.
    const whole = def.options.find((option) => keyMarkOf(option) !== undefined);
    const parts = def.options.flatMap((option) => (defOf(option).type === "object" ? walk(option, path) : []));
    if (parts.length > 0) return whole ? parts.map((part) => ({ ...part, both: path })) : parts;
    const marked = whole && keyMarkOf(whole);
    return marked ? [entry(path, marked, unwritten)] : [];
  }
  return [];
}

const WALKED = new WeakMap<z.ZodType, readonly KeyPath[]>();

/**
 * The paths in a schema's props that keys may sit at, in the schema's order: every value marked `animatable`, `keyed`
 * or `linked`, however deep. Each schema is walked once.
 */
export function keyPathsIn(schema: z.ZodType): readonly KeyPath[] {
  let found = WALKED.get(schema);
  if (!found) {
    found = walk(schema, "");
    WALKED.set(schema, found);
  }
  return found;
}

const under = (paths: readonly KeyPath[], prop: string): readonly KeyPath[] =>
  paths.filter((k) => k.path === prop || k.path.startsWith(`${prop}.`));

/** What moves anything with a `transform` and a `box`, as the shared schema says it. */
export const PLACED_KEY_PATHS: readonly KeyPath[] = keyPathsIn(placedSchema);
/** The values of a `transform` that keys may sit at. */
export const TRANSFORM_KEY_PATHS: readonly KeyPath[] = under(PLACED_KEY_PATHS, "transform");
/** The two of a `box` that keys may sit at: where it is. */
export const BOX_KEY_PATHS: readonly KeyPath[] = under(PLACED_KEY_PATHS, "box");
/** A sound's level and its pan. */
export const AUDIO_KEY_PATHS: readonly KeyPath[] = keyPathsIn(soundSchema);
/** Sound with no pan of its own (a nested composition). */
export const VOLUME_KEY_PATHS: readonly KeyPath[] = under(AUDIO_KEY_PATHS, "volume");
/** What a `<Camera>` animates. */
export const CAMERA_KEY_PATHS: readonly KeyPath[] = keyPathsIn(cameraSchema);

/** A shape's own values that change: its size, its colours, its points, and its outline's thickness and dash offset. */
export const SHAPE_KEY_PATHS: readonly KeyPath[] = keyPathsIn(shapeSchema).filter((k) =>
  k.property.startsWith("shape."),
);

/** What a `<Camera>` animates, and its value when the file writes none. */
export const CAMERA_FIELDS = Object.fromEntries(CAMERA_KEY_PATHS.map((k) => [k.path, k.missing ?? 0])) as {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  readonly rotation: number;
};
