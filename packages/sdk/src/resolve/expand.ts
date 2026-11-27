// A file writes everything about an element as its props: a value that changes over time is a list of keys in place
// of the value, effects are a list, a speed ramp is keys on `speed`, holds are `freezes`. The resolver, the player and
// the export read those as items of their own (kinds `keyframe`, `effect`, `speedKey`, `freeze`) under the element.
// `expandKeys` makes those items from the props, after the patch log is overlaid and before the props are parsed, so
// an edit that writes a key list is read the same way as a file that does.

import {
  capabilitiesOf,
  generatorSeed,
  isGenerator,
  type KeyPath,
  keyPathsOf,
  TRANSFORM_KEY_PATHS,
} from "@uberscene/kit/schema";

import { createPatchLog } from "../patches/log";
import type { Json, PatchLog } from "../patches/types";
import type { CollectedNode, CollectedTree } from "./tree";

/** A list of keys: objects, each with `at` and `value`. Anything else (a number, a list of numbers) is a constant. */
export function isKeyList(value: unknown): value is readonly Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((k) => typeof k === "object" && k !== null && !Array.isArray(k) && "at" in k && "value" in k)
  );
}

/** Where a derived item's id says it came from: the element, and the path of the prop that wrote it. */
export function derivedOrigin(id: string): { readonly id: string; readonly path: string } | null {
  const dot = id.indexOf(".");
  return dot < 0 ? null : { id: id.slice(0, dot), path: id.slice(dot + 1) };
}

/** The fields of `transform` written under `prefix` that keys may animate, from the key-path table. */
const fieldsUnder = (prefix: string): readonly string[] =>
  TRANSFORM_KEY_PATHS.filter((k) => k.path.startsWith(prefix) && !k.path.slice(prefix.length).includes(".")).map((k) =>
    k.path.slice(prefix.length),
  );
/** The transform's own numbers: `rotation`, `opacity`, `borderRadius`. */
const TRANSFORM_FIELDS = fieldsUnder("transform.");
const CROP_FIELDS = fieldsUnder("transform.crop.");
/** A transform value when none is written: a scale of 1, an anchor in the middle, a crop of the whole picture. */
const missingAt = (path: string): number | undefined => TRANSFORM_KEY_PATHS.find((k) => k.path === path)?.missing;

const expanded = new WeakMap<CollectedNode, CollectedNode>();

/** The tree with each element's keys, effects, speed keys and holds as items under it. The same tree when none. */
export function expandKeys(tree: CollectedTree): CollectedTree {
  let changed = false;
  const byId = new Map(tree.byId);
  const visit = (node: CollectedNode): CollectedNode => {
    const cached = expanded.get(node);
    if (cached) {
      if (cached !== node) {
        changed = true;
        index(cached, byId);
      }
      return cached;
    }
    const kids = node.children.map(visit);
    const own = expandNode(node);
    const out =
      own === null && kids.every((k, i) => k === node.children[i])
        ? node
        : {
            ...node,
            props: own?.props ?? node.props,
            children: [...kids, ...(own?.derived ?? [])],
          };
    if (out !== node) {
      changed = true;
      byId.set(out.id, out);
      for (const d of own?.derived ?? []) index(d, byId);
    }
    expanded.set(node, out);
    return out;
  };
  const root = visit(tree.root);
  return changed ? { ...tree, root, byId } : tree;
}

function index(node: CollectedNode, byId: Map<string, CollectedNode>): void {
  byId.set(node.id, node);
  for (const c of node.children) index(c, byId);
}

interface Expansion {
  readonly props: Readonly<Record<string, unknown>>;
  readonly derived: readonly CollectedNode[];
}

/** One element's props without their keys, effects, speed keys and holds, and the items they make. Null when none. */
function expandNode(node: CollectedNode): Expansion | null {
  const onTrack = capabilitiesOf(node.kind).placementScope === "track";
  if (!onTrack && keyPathsOf(node.kind).length === 0) return null;
  const props: Record<string, unknown> = { ...node.props };
  const derived: CollectedNode[] = [];
  const item = (path: string, kind: string, itemProps: Record<string, unknown>, children: CollectedNode[] = []) => {
    const id = `${node.id}.${path}`;
    const made: CollectedNode = {
      id,
      kind,
      props: itemProps,
      children: children.map((c) => ({ ...c, parent: id })),
      parent: node.id,
      editable: node.editable,
      lockedProps: [],
      boundProps: {},
    };
    return made;
  };
  const keyItems = (
    path: string,
    keys: readonly Record<string, unknown>[],
    how: { property?: string; param?: string },
  ) =>
    keys.map((k, i) =>
      item(`${path}.${i}`, "keyframe", {
        ...how,
        at: k.at,
        value: k.value,
        ...(k.easing !== undefined ? { easing: k.easing } : {}),
      }),
    );
  /**
   * A generator written at `value` as an item, and what it is over: its `base` (a number, keys, or nothing), or a
   * loop's `keys`. Anything else comes back as it is.
   */
  const generator = (
    value: unknown,
    path: string,
    how: { property?: string; param?: string },
  ): { readonly over: unknown; readonly made?: CollectedNode } => {
    if (!isGenerator(value)) return { over: value };
    const { type, base, keys, ...params } = value;
    const over = type === "loop" ? keys : base;
    const times = isKeyList(over) ? over.map((k) => Number(k.at)) : [];
    return {
      over,
      made: item(`${path}.generator`, "generator", {
        ...how,
        type,
        ...params,
        ...(type === "wiggle" && params.seed === undefined ? { seed: generatorSeed(node.id, path) } : {}),
        ...(type === "loop" && times.length > 1 ? { span: [Math.min(...times), Math.max(...times)] } : {}),
      }),
    };
  };
  /** `value` with a generator written there made an item: what is left is a constant, keys, or nothing. */
  const settle = (value: unknown, path: string, property: string): unknown => {
    const g = generator(value, path, { property });
    if (g.made) derived.push(g.made);
    return g.over;
  };
  /** The keys at `value`, if it is a list; their first value stands in as the constant where one is required. */
  const take = (value: unknown, path: string, property: string): unknown => {
    if (!isKeyList(value)) return value;
    derived.push(...keyItems(path, value, { property }));
    return value[0]?.value;
  };

  /**
   * A value whose first key stays written as the constant (a shape's own values, a camera's): a generator leaves what
   * it is over, keys leave their first value. The holders on the way to it are copied, never changed in place.
   */
  const keepsConstant = (entry: KeyPath): void => {
    const segs = entry.path.split(".");
    const field = segs.pop() as string;
    let holder = props;
    for (const seg of segs) {
      const inner = holder[seg];
      if (!inner || typeof inner !== "object" || Array.isArray(inner)) return;
      const copy: Record<string, unknown> = { ...(inner as Record<string, unknown>) };
      holder[seg] = copy;
      holder = copy;
    }
    if (entry.numeric && isGenerator(holder[field])) {
      const over = settle(holder[field], entry.path, entry.property) ?? (entry.required ? entry.missing : undefined);
      if (over === undefined) delete holder[field];
      else holder[field] = over;
    }
    if (isKeyList(holder[field])) holder[field] = take(holder[field], entry.path, entry.property);
  };
  for (const entry of keyPathsOf(node.kind)) if (entry.constant === "first") keepsConstant(entry);
  // What is not on a track (a camera) has only those.
  if (!onTrack) return derived.length === 0 ? null : { props, derived };

  const transform = props.transform;
  if (transform && typeof transform === "object" && !Array.isArray(transform)) {
    const t: Record<string, unknown> = { ...(transform as Record<string, unknown>) };
    let touched = false;
    // A generator first: it leaves its base where it was written, which the lines below read as they always did.
    const unwrap = (holder: Record<string, unknown>, field: string, path: string): void => {
      if (!isGenerator(holder[field])) return;
      const over = settle(holder[field], path, path);
      if (over === undefined) delete holder[field];
      else holder[field] = over;
      touched = true;
    };
    for (const f of TRANSFORM_FIELDS) unwrap(t, f, `transform.${f}`);
    if (isGenerator(t.scale)) {
      // One generator moves both axes alike: the same wobble, so the element grows and shrinks, not shears.
      const x = generator(t.scale, "transform.scale.x", { property: "transform.scale.x" });
      const y = generator(t.scale, "transform.scale.y", { property: "transform.scale.y" });
      if (x.made && y.made) derived.push(x.made, { ...y.made, props: { ...y.made.props, seed: x.made.props.seed } });
      if (x.over === undefined) delete t.scale;
      else t.scale = x.over;
      touched = true;
    }
    for (const pair of ["scale", "anchor"] as const) {
      const v = t[pair];
      if (v && typeof v === "object" && !Array.isArray(v) && !isKeyList(v)) {
        const xy: Record<string, unknown> = { ...(v as Record<string, unknown>) };
        if (isGenerator(xy.x) || isGenerator(xy.y)) {
          unwrap(xy, "x", `transform.${pair}.x`);
          unwrap(xy, "y", `transform.${pair}.y`);
          t[pair] = { x: xy.x ?? missingAt(`transform.${pair}.x`), y: xy.y ?? missingAt(`transform.${pair}.y`) };
        }
      }
    }
    if (t.crop && typeof t.crop === "object" && !Array.isArray(t.crop)) {
      const c: Record<string, unknown> = { ...(t.crop as Record<string, unknown>) };
      if (CROP_FIELDS.some((f) => isGenerator(c[f]))) {
        for (const f of CROP_FIELDS) unwrap(c, f, `transform.crop.${f}`);
        t.crop = c;
      }
    }
    for (const f of TRANSFORM_FIELDS) {
      if (isKeyList(t[f])) {
        take(t[f], `transform.${f}`, `transform.${f}`);
        delete t[f];
        touched = true;
      }
    }
    if (isKeyList(t.scale)) {
      // One list moves both axes: a key's value is one number for both, or `{ x, y }` for each its own (squash and
      // stretch), which each axis's key takes its half of.
      const axis = (a: "x" | "y") =>
        (t.scale as readonly Record<string, unknown>[]).map((k) => {
          const v = k.value;
          return v && typeof v === "object" && !Array.isArray(v)
            ? { ...k, value: (v as Record<string, unknown>)[a] }
            : k;
        });
      derived.push(...keyItems("transform.scale.x", axis("x"), { property: "transform.scale.x" }));
      derived.push(...keyItems("transform.scale.y", axis("y"), { property: "transform.scale.y" }));
      delete t.scale;
      touched = true;
    }
    for (const pair of ["scale", "anchor"] as const) {
      const v = t[pair];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const xy = v as Record<string, unknown>;
        if (isKeyList(xy.x) || isKeyList(xy.y)) {
          t[pair] = {
            x: take(xy.x, `transform.${pair}.x`, `transform.${pair}.x`) ?? missingAt(`transform.${pair}.x`),
            y: take(xy.y, `transform.${pair}.y`, `transform.${pair}.y`) ?? missingAt(`transform.${pair}.y`),
          };
          touched = true;
        }
      }
    }
    const crop = t.crop;
    if (crop && typeof crop === "object" && !Array.isArray(crop)) {
      const c = crop as Record<string, unknown>;
      if (CROP_FIELDS.every((f) => c[f] === undefined || isKeyList(c[f]))) {
        // Keys alone: no crop is written, so one the clip's `frame` makes still applies to the axes not keyed.
        for (const f of CROP_FIELDS) take(c[f], `transform.crop.${f}`, `transform.crop.${f}`);
        delete t.crop;
        touched = true;
      } else if (CROP_FIELDS.some((f) => isKeyList(c[f]))) {
        t.crop = Object.fromEntries(
          CROP_FIELDS.map((f) => [
            f,
            take(c[f], `transform.crop.${f}`, `transform.crop.${f}`) ?? missingAt(`transform.crop.${f}`),
          ]),
        );
        touched = true;
      }
    }
    if (touched) {
      if (Object.keys(t).length > 0) props.transform = t;
      else delete props.transform;
    }
  }

  const box = props.box;
  if (box && typeof box === "object" && !Array.isArray(box)) {
    const b: Record<string, unknown> = { ...(box as Record<string, unknown>) };
    let touched = false;
    for (const axis of ["x", "y"] as const) {
      if (isGenerator(b[axis])) {
        const over = settle(b[axis], `box.${axis}`, `box.${axis}`);
        if (over === undefined) delete b[axis];
        else b[axis] = over;
        touched = true;
      }
      if (isKeyList(b[axis])) {
        take(b[axis], `box.${axis}`, `box.${axis}`);
        delete b[axis];
        touched = true;
      }
    }
    if (touched) {
      if (Object.keys(b).length > 0) props.box = b;
      else delete props.box;
    }
  }

  if (isKeyList(props.volume)) {
    take(props.volume, "volume", "audio.volume");
    delete props.volume;
  }
  if (props.pan !== undefined) {
    // A constant pan is one key: the mixer reads pan only from keys.
    const keys = isKeyList(props.pan) ? props.pan : [{ at: 0, value: props.pan }];
    derived.push(...keyItems("pan", keys, { property: "audio.pan" }));
    delete props.pan;
  }

  if (isKeyList(props.speed)) {
    props.speed.forEach((k, i) => {
      derived.push(
        item(`speed.${i}`, "speedKey", {
          at: k.at,
          speed: k.value,
          ...(k.easing !== undefined ? { easing: k.easing } : {}),
        }),
      );
    });
    delete props.speed;
  }

  if (Array.isArray(props.freezes)) {
    (props.freezes as unknown[]).forEach((f, i) => {
      const hold = (f ?? {}) as Record<string, unknown>;
      derived.push(item(`freezes.${i}`, "freeze", { at: hold.source, start: hold.start, duration: hold.duration }));
    });
    delete props.freezes;
  }

  if (Array.isArray(props.effects)) {
    (props.effects as unknown[]).forEach((e, i) => {
      const { type, enabled, ...rest } = (e ?? {}) as Record<string, unknown>;
      const params: Record<string, unknown> = {};
      const keyed: CollectedNode[] = [];
      for (const [name, written] of Object.entries(rest)) {
        const g = generator(written, `effects.${i}.${name}`, { param: name });
        if (g.made) keyed.push(g.made);
        const value = g.over;
        if (isKeyList(value)) keyed.push(...keyItems(`effects.${i}.${name}`, value, { param: name }));
        else if (value !== undefined) params[name] = value;
      }
      const fx = item(`effects.${i}`, "effect", { type, params, ...(enabled !== undefined ? { enabled } : {}) }, keyed);
      derived.push(fx);
    });
    delete props.effects;
  }

  return derived.length === 0 ? null : { props, derived };
}

/**
 * A patch log that turns these effects off (`enabled: false`), each named by the id the resolver gave it
 * (`pour.effects.1`): the element's `effects` prop written with those entries off, everything else as it was. For a
 * sheet's "without" cells, which draw the file as if the effect were switched off.
 */
export function withoutEffects(tree: CollectedTree, ids: readonly string[]): PatchLog {
  const log = createPatchLog();
  const off = new Map<string, Set<number>>();
  for (const id of ids) {
    const origin = derivedOrigin(id);
    const index = origin ? /^effects\.(\d+)$/.exec(origin.path)?.[1] : undefined;
    if (!origin || index === undefined) continue;
    const set = off.get(origin.id) ?? new Set<number>();
    off.set(origin.id, set);
    set.add(Number(index));
  }
  for (const [element, indexes] of off) {
    const effects = tree.byId.get(element)?.props.effects;
    if (!Array.isArray(effects)) continue;
    const value = effects.map((e, i) => (indexes.has(i) ? { ...(e as Record<string, unknown>), enabled: false } : e));
    log.append({ op: "set", id: element, prop: "effects", value: value as unknown as Json });
  }
  return log;
}
