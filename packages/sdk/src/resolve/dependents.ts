import type { ResolvedState } from "./resolve";

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

/** The elements that depend on `id`, in timeline order of the file, each once per way it depends. */
export function dependentsOf(state: ResolvedState, id: string): Dependent[] {
  const out: Dependent[] = [];
  for (const node of state.tree.byId.values()) {
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
    const siblings = state.tree.byId.get(track.id)?.children ?? [];
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
