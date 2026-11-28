import type { NetPatch, PatchLog } from "../patches/types";
import { type CollectedNode, type CollectedTree, INTERIOR_PREFIX } from "./tree";

/**
 * The collected tree with the patch log's net effect applied: removed nodes
 * dropped, inserted nodes placed, moved nodes relocated, props and text
 * overlaid. Returns the same tree when the log is empty.
 */
export function overlay(tree: CollectedTree, log: PatchLog | undefined): CollectedTree {
  if (!log || log.net.size === 0) return tree;
  const net = log.net;
  if (![...net.values()].some((n) => n.presence !== "present" || n.place !== undefined || n.bake))
    return overlayProps(tree, net);
  const byId = new Map<string, CollectedNode>();

  // Children added or moved under a parent, keyed by parent id.
  const additions = new Map<string, { after: string | null; node: CollectedNode; seq: number }[]>();
  const movedAway = new Set<string>();
  for (const [id, n] of net) {
    if (n.presence === "inserted" && n.node && n.place) {
      // A remove followed by an insert of a different node under the same id replaces the original.
      if (tree.byId.has(id)) movedAway.add(id);
      push(additions, n.place.parent, { after: n.place.after, node: n.node, seq: n.place.seq });
    } else if (n.presence === "present" && n.place) {
      const original = tree.byId.get(id);
      if (original && original.parent !== n.place.parent) {
        movedAway.add(id);
        push(additions, n.place.parent, { after: n.place.after, node: original, seq: n.place.seq });
      } else if (original) {
        // Reorder within the same parent: treat as remove-then-add at the new spot.
        movedAway.add(id);
        push(additions, n.place.parent, { after: n.place.after, node: original, seq: n.place.seq });
      }
    }
  }

  const rebuild = (node: CollectedNode, parent: string | null): CollectedNode | null => {
    const n = net.get(node.id);
    if (n?.presence === "removed") return null;
    let props: Record<string, unknown> = node.props;
    let interior = node.interior;
    let text = node.text;
    let runs = node.runs;
    if (n) {
      if (n.props.size > 0) ({ props, interior } = overlaidProps(node, n));
      if (n.text !== undefined) ({ text, runs } = { text: n.text, runs: n.runs });
    }
    const kept: CollectedNode[] = [];
    for (const child of node.children) {
      if (movedAway.has(child.id)) continue;
      // Back inside a node the log inserted: it is drawn there, not at its place in the source.
      if (net.get(child.id)?.within !== undefined && tree.byId.get(child.id) === child) continue;
      const built = rebuild(child, node.id);
      if (built) kept.push(built);
    }
    const children = insertAdditions(kept, additions.get(node.id) ?? [], node.id, rebuild);
    const { runs: _runs, ...base } = node;
    const out: CollectedNode = {
      ...base,
      ...(runs?.length ? { runs } : {}),
      props,
      children,
      parent,
      ...(text !== undefined ? { text } : {}),
      ...(interior ? { interior } : {}),
    };
    byId.set(out.id, out);
    return out;
  };

  const root = rebuild(tree.root, null) ?? tree.root;
  return { root, byId, errors: tree.errors };
}

/**
 * The common case during a drag: only props or text changed. Rebuild the
 * patched nodes and their ancestors; every other node keeps its identity,
 * and with it its props object, so parsed props stay cached downstream.
 */
function overlayProps(tree: CollectedTree, net: ReadonlyMap<string, NetPatch>): CollectedTree {
  const dirty = new Set<string>();
  /** For a node on the way to a patched one, which of its children are on the way too. */
  const dirtyUnder = new Map<string, CollectedNode[]>();
  for (const [id, n] of net) {
    if (n.props.size === 0 && n.text === undefined) continue;
    for (let node = tree.byId.get(id); node && !dirty.has(node.id); ) {
      dirty.add(node.id);
      const parent = node.parent === null ? undefined : tree.byId.get(node.parent);
      if (parent) {
        const list = dirtyUnder.get(parent.id);
        if (list) list.push(node);
        else dirtyUnder.set(parent.id, [node]);
      }
      node = parent;
    }
  }
  if (dirty.size === 0) return tree;
  // With an id used twice, a node is not found by its id: every child of a node on the way is looked at.
  const unique = !tree.errors.some((e) => e.code === "DUPLICATE_ID");
  /** The nodes made again, by id: the patched ones and their ancestors. Every other id is the tree's own node. */
  const over = new Map<string, CollectedNode>();
  const rebuild = (node: CollectedNode): CollectedNode => {
    if (!dirty.has(node.id)) return node;
    const n = net.get(node.id);
    let props = node.props;
    let interior = node.interior;
    let text = node.text;
    let runs = node.runs;
    if (n && n.props.size > 0) ({ props, interior } = overlaidProps(node, n));
    if (n && n.text !== undefined) ({ text, runs } = { text: n.text, runs: n.runs });
    const { runs: _runs, ...base } = node;
    const out: CollectedNode = {
      ...base,
      ...(runs?.length ? { runs } : {}),
      props,
      children: unique ? withRebuilt(node, dirtyUnder.get(node.id), rebuild) : node.children.map(rebuild),
      ...(text !== undefined ? { text } : {}),
      ...(interior ? { interior } : {}),
    };
    over.set(out.id, out);
    return out;
  };
  return layered(tree, rebuild(tree.root), over);
}

/** A node's children with the few on the way to a patch made again; the others are the same nodes. */
function withRebuilt(
  node: CollectedNode,
  changed: readonly CollectedNode[] | undefined,
  rebuild: (node: CollectedNode) => CollectedNode,
): readonly CollectedNode[] {
  if (!changed) return node.children;
  const children = node.children.slice();
  for (const child of changed) {
    // A node is its parent's child at one place; a tree that has it twice falls back to making every child again.
    const at = children.indexOf(child);
    if (at < 0 || children.indexOf(child, at + 1) >= 0) return node.children.map(rebuild);
    children[at] = rebuild(child);
  }
  return children;
}

export interface Layers {
  readonly base: ReadonlyMap<string, CollectedNode>;
  readonly over: ReadonlyMap<string, CollectedNode>;
}
const layersOf = new WeakMap<CollectedTree, Layers>();

/**
 * A tree that is `base` with a few nodes made again. Its `byId` is the base's map with those nodes in their places,
 * and is only built when something reads it: a drag makes one such tree a step, and copying the whole map each time
 * cost more than the patch. `nodeIn` and `hasNodeIn` read the tree without building it.
 */
function layered(base: CollectedTree, root: CollectedNode, over: ReadonlyMap<string, CollectedNode>): CollectedTree {
  const tree = { root, errors: base.errors } as CollectedTree;
  let built: Map<string, CollectedNode> | undefined;
  Object.defineProperty(tree, "byId", {
    enumerable: true,
    configurable: true,
    get(): ReadonlyMap<string, CollectedNode> {
      if (!built) {
        built = new Map(base.byId);
        for (const [id, node] of over) built.set(id, node);
      }
      return built;
    },
  });
  layersOf.set(tree, { base: base.byId, over });
  return tree;
}

/** The node with this id, as `tree.byId.get(id)` gives it. */
export function nodeIn(tree: CollectedTree, id: string): CollectedNode | undefined {
  const layers = layersOf.get(tree);
  if (!layers) return tree.byId.get(id);
  return layers.over.get(id) ?? layers.base.get(id);
}

/** Whether the tree has a node with this id, as `tree.byId.has(id)` says. */
export function hasNodeIn(tree: CollectedTree, id: string): boolean {
  const layers = layersOf.get(tree);
  return layers ? layers.base.has(id) : tree.byId.has(id);
}

/** The tree this one is laid over and the nodes made again, when it is one with only props and text patched. */
export function layersIn(tree: CollectedTree): Layers | undefined {
  return layersOf.get(tree);
}

/** Whether the tree is another with only props and text patched: the same ids, in the same places. */
export function sameIdsAsSource(tree: CollectedTree): boolean {
  return layersOf.has(tree);
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function insertAdditions(
  children: CollectedNode[],
  additions: { after: string | null; node: CollectedNode; seq: number }[],
  parent: string,
  rebuild: (node: CollectedNode, parent: string | null) => CollectedNode | null,
): CollectedNode[] {
  if (additions.length === 0) return children;
  const result = [...children];
  // In the order they were written: each `after` names a sibling as it stood when that insert or move was made.
  for (const { after, node } of [...additions].sort((a, b) => a.seq - b.seq)) {
    const built = rebuild({ ...node, parent }, parent);
    if (!built) continue;
    const index = after === null ? -1 : result.findIndex((c) => c.id === after);
    result.splice(index + 1, 0, built);
  }
  return result;
}

/** Apply a net's prop writes: `interior.<name>` keys go to the Layer's handles, the rest to the node's own props. */
function overlaidProps(
  node: CollectedNode,
  n: NetPatch,
): { props: Record<string, unknown>; interior: CollectedNode["interior"] } {
  const props: Record<string, unknown> = { ...node.props };
  let handles: Record<string, unknown> | null = null;
  for (const [k, v] of n.props) {
    const target = k.startsWith(INTERIOR_PREFIX) ? (handles ??= { ...(node.interior?.props ?? {}) }) : props;
    const key = k.startsWith(INTERIOR_PREFIX) ? k.slice(INTERIOR_PREFIX.length) : k;
    if (v === undefined) delete target[key];
    else target[key] = v;
  }
  const interior = handles && node.interior ? { component: node.interior.component, props: handles } : node.interior;
  return { props, interior };
}
