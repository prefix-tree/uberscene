import { describe, expect, it } from "vitest";

import { collectModule, loadModule, placed, type ResolvedState, resolve, timelineRows } from "@uberscene/sdk";

import { manifest } from "./helpers";

// A placement says whether its props are what its kind's schema parsed (`parsed`). What the schema refuses is
// reported and left out, as narrowly as the rest still parses: the refused key inside an object first, then the
// whole prop. Only an element that still does not parse (a prop it cannot do without is missing or wrong) is
// unparsed: it keeps its row and its errors, and nothing draws it.

const file = (body: string) => `import { Clip, Composition, Shape, Sticker, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="over" layout="free">
${body}
      </Track>
    </Composition>
  );
}
`;

const load = (body: string): ResolvedState => resolve(collectModule(loadModule(file(body)) as never), manifest);
const at = (state: ResolvedState, id: string) =>
  state.errors.filter((e) => e.id === id).map((e) => `${e.code} ${e.prop}`);

describe("a placement's parsed props", () => {
  it("are parsed for an element with nothing wrong", () => {
    const state = load(`<Title id="t" start={0} duration={2}>Hi</Title>`);
    expect(state.errors).toEqual([]);
    expect(state.items.get("t")).toMatchObject({ parsed: true });
    // Every item is one: the composition, the track, and what the resolver makes.
    expect([...state.items.values()].filter((p) => !p.parsed)).toEqual([]);
  });

  it("leaves out only the refused key inside an object, and keeps the rest of the prop", () => {
    const state = load(
      `<Title id="t" start={0} duration={2} style={{ size: -1, color: "#ff0000", weight: 700 }}>Hi</Title>`,
    );
    expect(at(state, "t")).toEqual(["SCHEMA style.size"]);
    const title = state.items.get("t");
    expect(title?.parsed).toBe(true);
    // The colour and the weight written beside the bad size stay; the size is the schema's default.
    expect(title?.props.style).toMatchObject({ color: "#ff0000", weight: 700 });
    const size = placed(title, "title")?.props.style.size;
    expect(size).toBeGreaterThan(0);
    // The size an untouched title has.
    const plain = load(`<Title id="t" start={0} duration={2}>Hi</Title>`).items.get("t");
    expect(size).toBe(placed(plain, "title")?.props.style.size);
  });

  it("leaves out a key an object does not take, and keeps the rest of the prop", () => {
    const state = load(`<Title id="t" start={0} duration={2} style={{ colour: "#ff0000", weight: 700 }}>Hi</Title>`);
    expect(state.errors.filter((e) => e.id === "t")).toHaveLength(1);
    expect(state.items.get("t")).toMatchObject({ parsed: true, props: { style: { weight: 700 } } });
  });

  it("leaves out the whole prop when its object does not parse without the refused key", () => {
    // A stroke needs its thickness: without the refused one there is no stroke to keep.
    const state = load(
      `<Shape id="s" start={0} duration={2} type="rectangle" width={100} height={50} stroke={{ color: "#ffffff", thickness: -3 }} />`,
    );
    expect(at(state, "s")).toEqual(["SCHEMA stroke.thickness"]);
    const shape = state.items.get("s");
    expect(shape?.parsed).toBe(true);
    expect(shape?.props.stroke).toBeUndefined();
    expect(shape?.props).toMatchObject({ type: "rectangle", width: 100, height: 50 });
  });

  it("leaves out a refused prop of the element itself, as before", () => {
    const state = load(`<Clip id="c" start={0} src="asset:city" in={0} out={2} speed={0} />`);
    expect(at(state, "c")).toContain("SCHEMA speed");
    expect(state.items.get("c")).toMatchObject({ parsed: true });
    expect(state.items.get("c")?.props.speed).not.toBe(0);
  });

  it("is unparsed when a prop the element cannot do without is missing: it keeps its row and its errors", () => {
    const state = load(`<Sticker id="st" start={0} duration={2} />
        <Title id="t" start={0} duration={2}>Hi</Title>`);
    expect(at(state, "st")).toEqual(["SCHEMA src"]);
    const sticker = state.items.get("st");
    expect(sticker?.parsed).toBe(false);
    // The props as written, less nothing: there is nothing to read as a sticker's props.
    expect(sticker?.props).toMatchObject({ id: "st", start: 0, duration: 2 });
    expect(sticker?.errors.map((e) => e.prop)).toEqual(["src"]);
    expect(timelineRows(state).elements.map((e) => e.id)).toContain("st");
    // What stands beside it is untouched.
    expect(state.items.get("t")?.parsed).toBe(true);
  });

  it("does not change the props it was given", () => {
    const style = { size: -1, color: "#ff0000" };
    const tree = collectModule(loadModule(file(`<Title id="t" start={0} duration={2}>Hi</Title>`)) as never);
    const node = tree.byId.get("t");
    const patched = { ...tree, byId: new Map(tree.byId) };
    expect(node).toBeDefined();
    const before = JSON.stringify(style);
    const withStyle = { ...node!, props: { ...node!.props, style } };
    patched.byId.set("t", withStyle);
    const track = tree.byId.get("over")!;
    const newTrack = { ...track, children: track.children.map((c) => (c.id === "t" ? withStyle : c)) };
    patched.byId.set("over", newTrack);
    const root = { ...tree.root, children: tree.root.children.map((c) => (c.id === "over" ? newTrack : c)) };
    const state = resolve({ ...patched, root }, manifest);
    expect(state.items.get("t")?.parsed).toBe(true);
    expect(JSON.stringify(style)).toBe(before);
  });
});
