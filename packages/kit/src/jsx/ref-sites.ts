// The props of a schema that name something else in the file. A schema marks each such value with `ref` and the kind
// of reference it is, and `refSitesIn` walks the schema once: what an element may name is read from where the prop is
// written, so a new way to refer is marked once, in the schema, and found by everything that reads references.
import { z } from "zod";

const MARKS = new WeakMap<object, string>();

/**
 * `schema`, as a value that names something else in the file: an element, a marker, a track. `type` is the kind of
 * reference it is (`anchor`, `follow`, `push`...), which the SDK's entry of the same name says the rest about. The
 * mark is on a copy of the schema, so the same schema used elsewhere (an `id`) is not a reference there.
 */
export function ref<S extends z.ZodType>(type: string, schema: S): S {
  const marked = z.core.clone(schema, schema.def) as S;
  MARKS.set(marked, type);
  return marked;
}

/** One place a schema's props hold a reference. */
export interface RefSite {
  /** The kind of reference written there. */
  readonly type: string;
  /** The keys to the value, from the element's props down. */
  readonly path: readonly string[];
  /** The value is a list of references, or an object of them by name (`times.reveal`); left out, it is one. */
  readonly each?: "list" | "record";
}

/** A schema's parts, as zod keeps them: all the walk reads. */
interface Def {
  readonly type: string;
  readonly innerType?: z.ZodType;
  readonly shape?: Readonly<Record<string, z.ZodType>>;
  readonly options?: readonly z.ZodType[];
  readonly element?: z.ZodType;
  readonly valueType?: z.ZodType;
}
const defOf = (schema: z.ZodType): Def => (schema as unknown as { def: Def }).def;

/** What a prop is under `optional`, `default` and the like. */
function bare(schema: z.ZodType): z.ZodType {
  let inner = schema;
  for (let def = defOf(inner); def.innerType && def.type !== "pipe" && !MARKS.has(inner); def = defOf(inner))
    inner = def.innerType;
  return inner;
}

function walk(schema: z.ZodType, path: readonly string[], out: RefSite[]): void {
  const inner = bare(schema);
  const type = MARKS.get(inner);
  if (type !== undefined) {
    out.push({ type, path });
    return;
  }
  const def = defOf(inner);
  if (def.type === "object" && def.shape) {
    for (const [name, prop] of Object.entries(def.shape)) walk(prop, [...path, name], out);
  } else if (def.type === "union" && def.options) {
    // A value written one way or another (a length in seconds, or `{ match: id }`): each way may hold a reference.
    for (const option of def.options) walk(option, path, out);
  } else if (def.type === "array" && def.element) {
    const each = MARKS.get(bare(def.element));
    if (each !== undefined) out.push({ type: each, path, each: "list" });
  } else if (def.type === "record" && def.valueType) {
    const each = MARKS.get(bare(def.valueType));
    if (each !== undefined) out.push({ type: each, path, each: "record" });
  }
}

const WALKED = new WeakMap<z.ZodType, readonly RefSite[]>();

/** Every place in a schema's props that holds a reference, in the schema's order. Each schema is walked once. */
export function refSitesIn(schema: z.ZodType): readonly RefSite[] {
  let found = WALKED.get(schema);
  if (!found) {
    const out: RefSite[] = [];
    walk(schema, [], out);
    found = out;
    WALKED.set(schema, found);
  }
  return found;
}
