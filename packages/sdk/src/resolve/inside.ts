import type { CollectedNode } from "./tree";

/**
 * Ways into the resolver for its own tests, left here by the modules they read so the package does not export
 * them. `written` is every reference a node writes, as text: the kind of reference, the prop it sits at and what
 * is written there, before anything it names is looked up.
 */
export const inside: {
  written?: (node: CollectedNode) => { type: string; prop: string; text: string }[];
} = {};
