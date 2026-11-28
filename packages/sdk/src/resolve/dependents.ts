import { nodeIn } from "./overlay";
import { REF_KINDS, type RefDependent } from "./refs";
import type { ResolvedState } from "./resolve";

/**
 * Something whose place or length is given by another element: what an edit to that element has to carry along. It
 * names the element (`RefDependent`: an anchor, a follow, a length that matches), or stands beside it:
 *
 * - `beside`: a transition between it and its neighbour on a sequence track.
 */
export type Dependent =
  | RefDependent
  | { readonly kind: "beside"; readonly id: string; readonly side: "before" | "after" };

/**
 * The elements that depend on `id`, in timeline order of the file, each once per way it depends: the references to
 * it in the graph (`state.refs`), then the transitions beside it on a sequence track, which name nothing.
 */
export function dependentsOf(state: ResolvedState, id: string): Dependent[] {
  const out: Dependent[] = [];
  for (const edge of state.refs.to.get(id) ?? []) {
    if (edge.from === id) continue;
    const entry = REF_KINDS[edge.type];
    // How each way to refer reads as a dependent is its entry's to say.
    if (entry) out.push(entry.dependent(edge, nodeIn(state.tree, edge.from)?.props ?? {}) as RefDependent);
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
