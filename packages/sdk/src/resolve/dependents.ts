import { layersIn, nodeIn } from "./overlay";
import type { ResolvedState } from "./resolve";
import type { CollectedNode } from "./tree";

/**
 * Something whose place or length is given by another element: what an edit to that element has to carry along.
 *
 * - `anchor`: starts from it (`anchor="id"`, or its end with `anchor="id.end"`), at a word of its footage when `at`
 *   is set;
 * - `on`: a transition placed on one of its edges;
 * - `match` / `until`: lasts as long as it, or until it ends (or, with `at`, until it plays that moment);
 * - `beside`: a transition between it and its neighbour on a sequence track;
 * - `follow`: an overlay that moves with it (`follow="id"`).
 */
export type Dependent =
  | { readonly kind: "anchor"; readonly id: string; readonly edge?: "end"; readonly at?: string }
  | { readonly kind: "on"; readonly id: string; readonly edge: "in" | "out" }
  | { readonly kind: "match"; readonly id: string }
  | { readonly kind: "until"; readonly id: string; readonly at?: string }
  | { readonly kind: "beside"; readonly id: string; readonly side: "before" | "after" }
  | { readonly kind: "follow"; readonly id: string };

/** The ids a node names in the props `dependentsOf` reads: who it is anchored to, follows, is on, matches, runs until. */
function named(node: CollectedNode): string[] {
  const props = node.props as Record<string, unknown>;
  const out: string[] = [];
  if (typeof props.anchor === "string") {
    out.push(props.anchor);
    if (props.anchor.endsWith(".end")) out.push(props.anchor.slice(0, -4));
  }
  if (typeof props.follow === "string") out.push(props.follow);
  if (typeof props.on === "string") out.push(props.on);
  const duration = props.duration;
  if (typeof duration === "object" && duration !== null) {
    const d = duration as { match?: unknown; until?: unknown };
    if (typeof d.match === "string") out.push(d.match);
    if (typeof d.until === "string") out.push(d.until);
  }
  return out;
}

interface Named {
  /** Every node, in the tree's order. */
  readonly nodes: readonly CollectedNode[];
  readonly place: ReadonlyMap<string, number>;
  /** For an id, the places of the nodes that name it, in order. */
  readonly by: ReadonlyMap<string, readonly number[]>;
}
const namedIn = new WeakMap<ReadonlyMap<string, CollectedNode>, Named>();

/** Who names whom in a file's own tree, worked out once: an edit's tree is that tree with a few nodes made again. */
function namesOf(base: ReadonlyMap<string, CollectedNode>): Named {
  let index = namedIn.get(base);
  if (!index) {
    const nodes = [...base.values()];
    const place = new Map<string, number>();
    const by = new Map<string, number[]>();
    nodes.forEach((node, at) => {
      place.set(node.id, at);
      for (const id of named(node)) {
        const list = by.get(id);
        if (!list) by.set(id, [at]);
        else if (list[list.length - 1] !== at) list.push(at);
      }
    });
    index = { nodes, place, by };
    namedIn.set(base, index);
  }
  return index;
}

/** The nodes that may depend on `id`, in the tree's order: every node, or for a patched tree only those that name it. */
function candidates(state: ResolvedState, id: string): Iterable<CollectedNode> {
  const layers = layersIn(state.tree);
  if (!layers) return state.tree.byId.values();
  const index = namesOf(layers.base);
  // A node made again may name anything now; any other names what it did in the file.
  const places = new Set<number>(index.by.get(id));
  for (const made of layers.over.keys()) {
    const at = index.place.get(made);
    if (at !== undefined) places.add(at);
  }
  return [...places]
    .sort((a, b) => a - b)
    .map((at) => {
      const node = index.nodes[at] as CollectedNode;
      return layers.over.get(node.id) ?? node;
    });
}

/** The elements that depend on `id`, in timeline order of the file, each once per way it depends. */
export function dependentsOf(state: ResolvedState, id: string): Dependent[] {
  const out: Dependent[] = [];
  for (const node of candidates(state, id)) {
    if (node.id === id) continue;
    const props = node.props as Record<string, unknown>;
    if (props.anchor === id || props.anchor === `${id}.end`) {
      const edge = props.anchor === `${id}.end` ? ({ edge: "end" } as const) : {};
      out.push({ kind: "anchor", id: node.id, ...edge, ...(typeof props.at === "string" ? { at: props.at } : {}) });
    }
    if (props.follow === id) out.push({ kind: "follow", id: node.id });
    if (node.kind === "transition" && props.on === id)
      out.push({ kind: "on", id: node.id, edge: props.edge === "in" ? "in" : "out" });
    const duration = props.duration;
    if (typeof duration === "object" && duration !== null) {
      const d = duration as { match?: unknown; until?: unknown; at?: unknown };
      if (d.match === id) out.push({ kind: "match", id: node.id });
      if (d.until === id) out.push({ kind: "until", id: node.id, ...(typeof d.at === "string" ? { at: d.at } : {}) });
    }
  }
  const track = state.tracks.find((t) => t.items.includes(id));
  if (track?.layout === "sequence") {
    const siblings = nodeIn(state.tree, track.id)?.children ?? [];
    const at = siblings.findIndex((c) => c.id === id);
    const before = siblings[at - 1];
    const after = siblings[at + 1];
    if (before?.kind === "transition" && typeof before.props.on !== "string")
      out.push({ kind: "beside", id: before.id, side: "before" });
    if (after?.kind === "transition" && typeof after.props.on !== "string")
      out.push({ kind: "beside", id: after.id, side: "after" });
  }
  return out;
}
