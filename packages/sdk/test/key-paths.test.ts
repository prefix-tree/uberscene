import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  AUDIO_KEY_PATHS,
  BOX_KEY_PATHS,
  KEYFRAME_PROPERTIES,
  KIND_CAPABILITIES,
  keyPathOf,
  keyPathsOf,
  kindsWithProp,
  TRANSFORM_KEY_PATHS,
} from "@uberscene/kit/schema";

import { expandKeys } from "../src/resolve/expand";
import type { CollectedNode } from "../src/resolve/tree";
import { CORPUS, treeOf } from "./editing/corpus";

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

describe("the key-path table", () => {
  it("names the same properties, in the same order", () => {
    expect(KEYFRAME_PROPERTIES).toEqual(PROPERTIES);
  });

  it("gives a kind the paths its schema has the props for", () => {
    const kindsWith = (path: string) => Object.keys(KIND_CAPABILITIES).filter((kind) => keyPathOf(kind, path));
    const scoped = (prop: string) =>
      kindsWithProp(prop).filter((k) => KIND_CAPABILITIES[k]?.placementScope === "track");
    for (const k of TRANSFORM_KEY_PATHS) expect(kindsWith(k.path).sort()).toEqual([...scoped("transform")].sort());
    // Captions have a box too, but stand outside the tracks: nothing there takes keys.
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
