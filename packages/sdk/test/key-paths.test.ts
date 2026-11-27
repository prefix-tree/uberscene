import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  AUDIO_KEY_PATHS,
  BOX_KEY_PATHS,
  isMigratedKind,
  KEYFRAME_PROPERTIES,
  type KeyPath,
  KIND_CAPABILITIES,
  KINDS,
  type Kind,
  keyPathOf,
  keyPathsIn,
  keyPathsOf,
  kindsWithProp,
  SCHEMAS_BY_KIND,
  TRANSFORM_KEY_PATHS,
} from "@uberscene/kit/schema";

import { expandKeys } from "../src/resolve/expand";
import type { CollectedNode } from "../src/resolve/tree";
import { CORPUS, treeOf } from "./editing/corpus";
import DECLARED from "./key-paths.declared.json";

// The paths a key may sit at are one table per kind (`keyPathsOf`). These pin what the resolver makes of every key
// list, generator, effect, speed key and hold in every example and recipe: the items, their order and the props left
// behind. The order is in every frame's cache key, so it must never move.

/** A node as text: its id, kind and props, then its children in order. Code in a prop is its source. */
function written(node: CollectedNode): unknown {
  return [node.id, node.kind, plain(node.props, 0), node.children.map(written)];
}

function plain(value: unknown, depth: number): unknown {
  if (typeof value === "function") return "fn";
  if (value === null || typeof value !== "object") return value;
  if (depth > 12) return "deep";
  if (Array.isArray(value)) return value.map((v) => plain(v, depth + 1));
  if ("$$typeof" in value) return "element";
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((k) => [k, plain((value as Record<string, unknown>)[k], depth + 1)]),
  );
}

describe("what keys expand to", () => {
  it("is the same items in the same order for every example and recipe", () => {
    const hashes: Record<string, string> = {};
    for (const file of CORPUS) {
      const tree = expandKeys(treeOf(file.text, file.files));
      const text = JSON.stringify(written(tree.root));
      hashes[file.name] = `${createHash("sha256").update(text).digest("hex").slice(0, 16)} ${text.length}`;
    }
    expect(hashes).toMatchSnapshot();
  });
});

/** The properties a key could animate before they were read from the table, written out once. */
const PROPERTIES = [
  "box.x",
  "box.y",
  "transform.scale.x",
  "transform.scale.y",
  "transform.rotation",
  "transform.opacity",
  "transform.anchor.x",
  "transform.anchor.y",
  "transform.borderRadius",
  "transform.crop.x",
  "transform.crop.y",
  "transform.crop.width",
  "transform.crop.height",
  "audio.volume",
  "audio.pan",
  "camera.x",
  "camera.y",
  "camera.zoom",
  "camera.rotation",
  "shape.width",
  "shape.height",
  "shape.fill",
  "shape.points",
  "shape.stroke.color",
  "shape.stroke.thickness",
  "shape.stroke.dashOffset",
];

// The paths each kind's keys could sit at were lists written beside the schemas. They are read from the schemas now
// (`animatable`, `keyed` and `linked` mark a value), and `key-paths.declared.json` is those lists as they stood, written
// out once: every kind's entries, in order, since the order is in the messages and in the items the resolver makes.
describe("the key paths read from the schemas", () => {
  /** An entry as the declared lists wrote it: every field but the check, which is a function. */
  const asDeclared = ({ check, generated: _generated, ...rest }: KeyPath) => ({
    ...rest,
    ...(check ? { checked: true } : {}),
  });

  it("are the declared lists, kind by kind and in the same order", () => {
    // The kinds there were then: one added since has the paths its own schema says, and is not in the lists.
    const then = KINDS.filter((kind) => kind in DECLARED || keyPathsOf(kind).length === 0 || !isMigratedKind(kind));
    const derived: Record<string, unknown[]> = {};
    for (const kind of then) {
      const paths = keyPathsOf(kind);
      if (paths.length > 0) derived[kind] = paths.map(asDeclared);
    }
    // The one difference: a nested composition's volume is 1 when none is written, which its schema's default says
    // and the list did not.
    const declared = structuredClone(DECLARED) as Record<string, Record<string, unknown>[]>;
    for (const entry of declared.nested ?? []) if (entry.path === "volume") entry.missing = 1;
    expect(derived).toEqual(declared);
    expect(Object.keys(derived)).toEqual(Object.keys(declared));
  });

  it("refuse the same values of a key, in the same words", () => {
    const problem = (path: string, value: unknown) => keyPathOf("shape", path)?.check?.(value) ?? null;
    expect(problem("width", 40)).toBeNull();
    expect(problem("width", 0)).toBe("a key on width is a number of pixels above 0");
    expect(problem("height", "tall")).toBe("a key on height is a number of pixels above 0");
    expect(problem("fill", "tomato")).toBeNull();
    expect(problem("fill", "$primary")).toBeNull();
    expect(problem("fill", "nope")).toBe('a key on fill is a colour, such as "#ff3b30", "rgb(255 59 48)" or "tomato"');
    expect(problem("stroke.color", 3)).toBe(
      'a key on stroke.color is a colour, such as "#ff3b30", "rgb(255 59 48)" or "tomato"',
    );
    expect(problem("points", [{ x: 0, y: 0 }])).toBeNull();
    expect(problem("points", [{ x: 0 }])).toBe(
      "a key on points is a list of points, each { x, y } as fractions of the box",
    );
    expect(problem("stroke.thickness", 0)).toBeNull();
    expect(problem("stroke.thickness", -1)).toBe("a key on stroke.thickness is a number of pixels, 0 or more");
    expect(problem("stroke.dashOffset", -40)).toBeNull();
    expect(problem("stroke.dashOffset", "far")).toBe("a key on stroke.dashOffset is a number of pixels");
  });

  it("say which values take a generator: every number but a sound's level and pan", () => {
    const ungenerated = (kind: Kind) =>
      keyPathsOf(kind)
        .filter((k) => !k.generated)
        .map((k) => k.path);
    expect(ungenerated("clip")).toEqual(["volume", "pan"]);
    expect(ungenerated("shape")).toEqual(["fill", "points", "stroke.color"]);
    expect(ungenerated("camera")).toEqual([]);
    // A link is to a number: a level and a pan take one, a colour does not.
    expect(keyPathOf("audio", "volume")?.numeric).toBe(true);
    expect(keyPathOf("shape", "fill")?.numeric).toBe(false);
  });

  it("are walked once for a schema", () => {
    expect(keyPathsIn(SCHEMAS_BY_KIND.clip)).toBe(keyPathsIn(SCHEMAS_BY_KIND.clip));
    expect(keyPathsOf("clip")).toBe(keyPathsIn(SCHEMAS_BY_KIND.clip));
  });

  it("are all of a kind's schema: no kind holds a marked value its entry leaves out", () => {
    for (const kind of KINDS) expect(keyPathsIn(SCHEMAS_BY_KIND[kind]), kind).toEqual(keyPathsOf(kind));
  });
});

describe("the key-path table", () => {
  it("names the same properties, in the same order", () => {
    expect(KEYFRAME_PROPERTIES).toEqual(PROPERTIES);
  });

  it("gives a kind the paths its schema has the props for", () => {
    const kindsWith = (path: string) => KINDS.filter((kind) => keyPathOf(kind, path));
    const scoped = (prop: string) => kindsWithProp(prop).filter((k) => KIND_CAPABILITIES[k].placementScope === "track");
    for (const k of TRANSFORM_KEY_PATHS) expect(kindsWith(k.path).sort()).toEqual([...scoped("transform")].sort());
    // Captions have a box too, but one that stays where it is written: it takes numbers only.
    for (const k of BOX_KEY_PATHS) expect(kindsWith(k.path).sort()).toEqual([...scoped("box")].sort());
    for (const k of AUDIO_KEY_PATHS) expect(kindsWith(k.path).sort()).toEqual([...scoped(k.path)].sort());
    expect(kindsWith("fill")).toEqual(["shape"]);
    expect(kindsWith("zoom")).toEqual(["camera"]);
  });

  it("finds both axes of a scale at the one path a list for both is written at", () => {
    expect(keyPathOf("clip", "transform.scale")?.property).toBe("transform.scale.x");
    expect(keyPathsOf("marker")).toEqual([]);
  });
});
