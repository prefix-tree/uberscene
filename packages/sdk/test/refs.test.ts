import { describe, expect, it } from "vitest";

import {
  buildSourceIndex,
  collectModule,
  type Dependent,
  dependentsOf,
  loadModule,
  REF_KINDS,
  type ResolvedState,
  resolve,
} from "@uberscene/sdk";

import { CORPUS, resolveText } from "./editing/corpus";
import { manifest } from "./helpers";

const file = (
  body: string,
) => `import { Audio, Camera, Clip, Composition, Marker, Shape, Title, Track, Transition } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
${body}
    </Composition>
  );
}
`;
const load = (text: string): ResolvedState =>
  resolve(collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }), manifest);
const edges = (state: ResolvedState) => state.refs.edges.map((e) => `${e.from} -${e.type}:${e.prop}-> ${e.to}`);
const SHAPE = (id: string, extra = "") =>
  `<Shape id="${id}" start={0} duration={4} type="rectangle" width={40} height={200} box={{ x: 100, y: 100, width: 40, height: 200 }}${extra} />`;

/**
 * The scan `dependentsOf` was before it read the graph, kept here as the reference: the element-to-element ways of
 * depending, found from the raw props.
 */
function scanned(state: ResolvedState, id: string): Dependent[] {
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
const OLD_KINDS = new Set(["anchor", "follow", "on", "match", "until", "beside"]);

describe("the reference graph", () => {
  it("has an edge for each way one element names another", () => {
    const state = load(
      file(`      <Marker id="beat" start={1} />
      <Camera id="cam" push={{ on: ["card"], keep: ["host"] }}>
        <Track id="stage" layout="free">
          ${SHAPE("host")}
          ${SHAPE("card", ` follow="host"`)}
        </Track>
      </Camera>
      <Track id="talk" role="dialogue">
        <Clip id="a" src="asset:interview" in={0} out={2} />
        <Transition id="x" type="crossfade" duration={0.2} on="a" edge="out" />
      </Track>
      <Track id="titles" layout="free">
        <Title id="name" anchor="a.end" duration={{ until: "a" }} text="Name" />
        <Title id="same" anchor="a" duration={{ match: "name" }} text="Same" />
      </Track>
      <Track id="music" layout="free">
        <Audio id="bed" src="asset:interview" start={0} in="marker:beat" duration={2} duck={{ under: "dialogue" }} />
      </Track>`),
    );
    expect(edges(state)).toEqual([
      "cam -push:push.on-> card",
      "cam -push:push.keep-> host",
      "card -follow:follow-> host",
      "x -on:on-> a",
      "name -anchor:anchor-> a",
      "name -until:duration-> a",
      "same -anchor:anchor-> a",
      "same -match:duration-> name",
      "bed -duck:duck.under-> talk",
      "bed -marker:in-> beat",
    ]);
    expect(state.refs.to.get("a")?.map((e) => e.from)).toEqual(["x", "name", "name", "same"]);
    expect(state.refs.from.get("name")?.map((e) => e.type)).toEqual(["anchor", "until"]);
  });

  it("orders each facet so a target comes before what names it", () => {
    const state = load(
      file(`      <Track id="rig" layout="free">
        ${SHAPE("nail", ` follow="hand"`)}
        ${SHAPE("hand", ` follow="arm"`)}
        ${SHAPE("arm")}
      </Track>`),
    );
    expect(state.refs.order.space).toEqual(["arm", "hand", "nail"]);
    expect(state.refs.order.time).toEqual([]);
  });

  it("puts the elements of a circle last, and still orders the rest", () => {
    const state = load(
      file(`      <Track id="rig" layout="free">
        ${SHAPE("a", ` follow="b"`)}
        ${SHAPE("b", ` follow="a"`)}
        ${SHAPE("c")}
        ${SHAPE("d", ` follow="c"`)}
      </Track>`),
    );
    expect(state.refs.order.space).toEqual(["c", "d", "a", "b"]);
  });

  it("names a kind for every edge, and no edge to something that does not exist", () => {
    for (const f of CORPUS) {
      const state = resolveText(f.text, f.manifest, f.files);
      for (const edge of state.refs.edges) {
        expect(REF_KINDS[edge.type], `${f.name} ${edge.type}`).toBeDefined();
        expect(state.tree.byId.has(edge.to), `${f.name} ${edge.from} -> ${edge.to}`).toBe(true);
      }
    }
  });

  it("gives every example and recipe the dependents the scan of props gave", () => {
    for (const f of CORPUS) {
      const state = resolveText(f.text, f.manifest, f.files);
      for (const id of state.tree.byId.keys())
        expect(
          dependentsOf(state, id).filter((d) => OLD_KINDS.has(d.kind)),
          `${f.name} ${id}`,
        ).toEqual(scanned(state, id));
    }
  });
});
