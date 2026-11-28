import { nodeIn } from "./overlay";
import type { RefEdge } from "./refs";
import type { ResolvedState } from "./resolve";

/**
 * Something whose place or length is given by another element: what an edit to that element has to carry along.
 *
 * - `anchor`: starts from it (`anchor="id"`, or its end with `anchor="id.end"`), at a word of its footage when `at`
 *   is set;
 * - `on`: a transition placed on one of its edges;
 * - `match` / `until`: lasts as long as it, or until it ends (or, with `at`, until it plays that moment);
 * - `beside`: a transition between it and its neighbour on a sequence track;
 * - `follow`: an overlay that moves with it (`follow="id"`);
 * - `push`: a camera that makes room for it (`push.on`) or keeps it in view (`push.keep`);
 * - `duck`: a sound that dips under it, a track (`duck.under`, by the track's id or its role);
 * - `marker` / `sceneTime`: an element with a time written as it, a marker (`in="marker:id"`, a scene's `times`);
 * - `link`: an element with a value read from one of its values (`{ link: "id.transform.rotation" }`), at `prop`.
 */
export type Dependent =
  | { readonly kind: "anchor"; readonly id: string; readonly edge?: "end"; readonly at?: string }
  | { readonly kind: "on"; readonly id: string; readonly edge: "in" | "out" }
  | { readonly kind: "match"; readonly id: string }
  | { readonly kind: "until"; readonly id: string; readonly at?: string }
  | { readonly kind: "beside"; readonly id: string; readonly side: "before" | "after" }
  | { readonly kind: "follow"; readonly id: string }
  | { readonly kind: "push"; readonly id: string; readonly part: "on" | "keep" }
  | { readonly kind: "duck"; readonly id: string }
  | { readonly kind: "marker"; readonly id: string; readonly prop: string }
  | { readonly kind: "sceneTime"; readonly id: string; readonly prop: string }
  | { readonly kind: "link"; readonly id: string; readonly prop: string };

/** How one reference of the graph reads as a dependent of what it names. */
function dependent(state: ResolvedState, edge: RefEdge): Dependent {
  const id = edge.from;
  const props = (nodeIn(state.tree, id)?.props ?? {}) as Record<string, unknown>;
  switch (edge.type) {
    case "anchor": {
      const end = edge.target.type === "element" && edge.target.edge === "end" ? ({ edge: "end" } as const) : {};
      return { kind: "anchor", id, ...end, ...(typeof props.at === "string" ? { at: props.at } : {}) };
    }
    case "on":
      return { kind: "on", id, edge: props.edge === "in" ? "in" : "out" };
    case "match":
      return { kind: "match", id };
    case "until": {
      const at = (props.duration as { at?: unknown } | undefined)?.at;
      return { kind: "until", id, ...(typeof at === "string" ? { at } : {}) };
    }
    case "push":
      return { kind: "push", id, part: edge.prop === "push.keep" ? "keep" : "on" };
    case "duck":
      return { kind: "duck", id };
    case "sceneTime":
      return { kind: "sceneTime", id, prop: edge.prop };
    case "marker":
      return { kind: "marker", id, prop: edge.prop };
    case "link":
      return { kind: "link", id, prop: edge.prop };
    default:
      return { kind: "follow", id };
  }
}

/**
 * The elements that depend on `id`, in timeline order of the file, each once per way it depends: the references to
 * it in the graph (`state.refs`), then the transitions beside it on a sequence track, which name nothing.
 */
export function dependentsOf(state: ResolvedState, id: string): Dependent[] {
  const out: Dependent[] = [];
  for (const edge of state.refs.to.get(id) ?? []) if (edge.from !== id) out.push(dependent(state, edge));
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
