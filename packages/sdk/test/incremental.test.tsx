// A resolve after an edit reuses what the edit did not touch: parsed props, an element's own length, whole tracks.
// These tests hold that to the answer worked out from nothing (`resolveFresh`: every cache off, no earlier placement):
// after every step of a row of edits, the two are the same timeline, item for item and in the same order, with the
// same errors in the same order. The rows are the editor's edits on every video in the repository with their undos
// and redos, and seeded random patches (props, text, removes, inserts, moves, take-backs) on a project that has every
// way one element reads another, at four frame rates.
import { describe, expect, it } from "vitest";

import { Audio, Captions, Clip, Composition, Gap, Marker, Shape, Svg, Title, Track, Transition } from "@uberscene/kit";
import {
  type ActionInput,
  type AssetManifest,
  type CollectedNode,
  type CollectedTree,
  collectModule,
  createPatchLog,
  Executor,
  type Patch,
  type PatchLog,
  type ResolvedState,
  resolve,
} from "@uberscene/sdk";

import { buildLarge } from "../fixtures/large";
import { resolveFresh, shortCuts } from "../src/resolve/cache";
import { type Dependent, dependentsOf } from "../src/resolve/dependents";
import { CORPUS, treeOf } from "./editing/corpus";
import { EDITS } from "./editing/edits";
import { manifest as sampleManifest } from "./helpers";

/** Everything a resolve answers, as plain data in the order it holds it. */
function answer(state: ResolvedState): unknown {
  return {
    composition: state.composition,
    tracks: state.tracks,
    items: [...state.items.entries()],
    errors: state.errors,
    fonts: state.fonts,
    scenes: state.scenes ? [...state.scenes.keys()] : null,
    // Every reference, and the order each kind of thing is worked out in.
    refs: {
      edges: state.refs.edges,
      time: state.refs.order.time,
      space: state.refs.order.space,
      value: state.refs.order.value,
    },
  };
}

/**
 * The cached resolve and the one from nothing agree; throwing is an answer too. Gives back the state from nothing,
 * when there is one, for what else a step holds the cached state to.
 */
function expectSame(
  tree: CollectedTree,
  manifest: AssetManifest,
  log: PatchLog | undefined,
  step: string,
): ResolvedState | undefined {
  let state: ResolvedState | undefined;
  const attempt = (work: () => ResolvedState, keep: boolean): unknown => {
    try {
      const made = work();
      if (keep) state = made;
      return answer(made);
    } catch (error) {
      return { threw: String(error) };
    }
  };
  const cached = attempt(() => resolve(tree, manifest, log), false);
  const fresh = attempt(() => resolveFresh(tree, manifest, log), true);
  expect(cached, step).toEqual(fresh);
  return state;
}

function logFor(tree: CollectedTree): PatchLog {
  return createPatchLog({
    isSource: (id) => tree.byId.has(id),
    sourceParent: (id) => tree.byId.get(id)?.parent ?? null,
    sourceNode: (id) => tree.byId.get(id),
  });
}

/** How many rows of random patches each case runs: `INCREMENTAL_ROWS=60` for a longer look after a change to a cache. */
const ROWS = Array.from({ length: Number(process.env.INCREMENTAL_ROWS ?? 6) }, (_, i) => i + 1);

/** A small seeded random, so a failure names a row that can be run again. */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe.each(CORPUS.map((file) => [file.name, file] as const))("cached and from nothing: %s", (_name, file) => {
  it("agree after every edit of a session, every undo and every redo", () => {
    const tree = treeOf(file.text, file.files);
    let n = 0;
    const exec = new Executor({ tree, manifest: file.manifest, log: logFor(tree), newActionId: () => `e${++n}` });
    expectSame(tree, file.manifest, undefined, "as written");
    let done = 0;
    for (const edit of EDITS) {
      const input = edit.pick(exec.state());
      if (!input) continue;
      const result = exec.execute(input);
      expectSame(tree, file.manifest, exec.log(), `${edit.name}${result.ok ? "" : " (refused)"}`);
      if (result.ok) done++;
    }
    for (let i = 0; i < done; i++) {
      if (!exec.undo()) break;
      expectSame(tree, file.manifest, exec.log(), `undo ${i}`);
    }
    for (let i = 0; i < done; i++) {
      if (!exec.redo()) break;
      expectSame(tree, file.manifest, exec.log(), `redo ${i}`);
    }
  });
});

/**
 * A project with every way one element reads another: sequences with a transition and a gap, a free track, titles
 * anchored to a clip's start, its end, a word it plays and the video's start, lengths that match and run until
 * another element, a bed that fills the video and ducks under a track, a marker, keys, effects, and captions made
 * from a transcript.
 */
function rich(fps: number | string, captions: boolean): CollectedTree {
  const clip = (id: string, i: number) => {
    const city = i % 2 === 1;
    const from = city ? (i * 3) % 7 : (i * 5) % 40;
    const keyed =
      i % 3 === 0
        ? {
            transform: {
              opacity: [
                { at: 0, value: 0, easing: "easeOutCubic" as const },
                { at: 0.5, value: 1 },
              ],
            },
            effects: [{ type: "blur" as const, radius: 2 }],
          }
        : {};
    return (
      <Clip
        key={id}
        id={id}
        src={city ? "asset:city" : "asset:interview"}
        in={from}
        out={from + 1 + (i % 3)}
        fit="cover"
        {...keyed}
      />
    );
  };
  const element = (
    <Composition fps={fps as never} width={1920} height={1080}>
      <Marker id="m1" start={3} />
      <Track id="v1">
        {clip("c0", 0)}
        {clip("c1", 1)}
        <Transition id="x1" type="crossfade" duration={0.3} />
        {clip("c2", 2)}
        <Gap id="g1" duration={0.5} />
        {clip("c3", 3)}
        {clip("c4", 4)}
        {clip("c5", 5)}
        <Clip id="talk" src="asset:interview" in="word:3" out="word:13.end" />
      </Track>
      <Track id="v2">
        {clip("d0", 6)}
        {clip("d1", 7)}
        {clip("d2", 8)}
        {clip("d3", 9)}
      </Track>
      <Track id="v3">
        {clip("e0", 10)}
        <Transition id="x2" type="crossfade" duration={0.2} />
        <Title id="mid" anchor="c1" duration={1}>
          Between a transition and its clip
        </Title>
        {clip("e1", 11)}
        {clip("e2", 12)}
      </Track>
      <Track id="free" layout="free">
        <Title id="f1" start={1} duration={2}>
          One
        </Title>
        <Title id="f2" start={4} duration={1.5} style={{ size: 40 }}>
          Two
        </Title>
        <Clip id="f3" src="asset:logo" start={2} duration={3} />
        <Shape
          id="s1"
          type="rectangle"
          width={120}
          height={80}
          start={0}
          duration={5}
          transform={{
            rotation: [
              { at: 0, value: 0 },
              { at: 2, value: 90 },
            ],
          }}
        />
        <Svg id="sv" start={0} duration={5} content="<svg viewBox='0 0 10 10'><rect width='10' height='10'/></svg>" />
        <Title id="f4" start={1} duration={2} follow="s1">
          Follows a shape
        </Title>
        <Title id="f5" start={1} duration={2} follow="sv">
          Follows a drawing
        </Title>
        <Shape
          id="s2"
          type="ellipse"
          width={40}
          height={40}
          start={0}
          duration={5}
          follow="f4"
          transform={{ rotation: { link: "s1.transform.rotation", scale: 2 } }}
        />
      </Track>
      <Track id="over">
        <Title id="t1" anchor="c2" offset={0.2} duration={1}>
          At a clip
        </Title>
        <Title id="t2" anchor="c4.end" offset={-0.5} duration={1}>
          At an end
        </Title>
        <Title id="t3" anchor="start" offset={1} duration={2}>
          At the start
        </Title>
        <Title id="t4" anchor="d1" duration={{ match: "c3" }}>
          As long as
        </Title>
        <Title id="t5" anchor="e0" duration={{ until: "e2" }}>
          Until
        </Title>
        <Title id="t6" anchor="talk" at="word:9" duration={1}>
          On a word
        </Title>
        <Title id="t7" anchor="t1" offset={0.1} duration={{ match: "t5" }}>
          Chained
        </Title>
      </Track>
      <Track id="music" layout="free" role="music">
        <Audio id="bed" src="asset:bed" start={0} duration="fill" volume={0.2} duck={{ under: "v1", to: 0.1 }} />
      </Track>
      {captions ? <Captions id="cap" src="asset:interview" /> : null}
    </Composition>
  );
  return collectModule({ default: () => element, defaults: {} });
}

const pick = <T,>(next: () => number, from: readonly T[]): T => from[Math.floor(next() * from.length)] as T;

/** A random patch on the tree as it stands: mostly ones a person's edit makes, some that break the file. */
function randomPatch(state: ResolvedState, next: () => number, n: number): Patch {
  const nodes = [...state.tree.byId.values()];
  const of = (...kinds: string[]): CollectedNode[] => nodes.filter((node) => kinds.includes(node.kind));
  const ids = nodes.map((node) => node.id);
  const some = (list: CollectedNode[]): string => (list.length > 0 ? pick(next, list).id : "nothing");
  const seconds = (): number => Math.round(next() * 80) / 10;
  const roll = next();
  if (roll < 0.22) {
    const id = some(of("clip"));
    const prop = pick(next, ["in", "out", "in", "out", "speed", "fit", "reverse", "volume"] as const);
    const value =
      prop === "speed"
        ? pick(next, [0.5, 1, 2, 0])
        : prop === "fit"
          ? pick(next, ["contain", "cover"])
          : prop === "reverse"
            ? next() < 0.5
            : prop === "volume"
              ? next()
              : seconds();
    return { op: "set", id, prop, value };
  }
  if (roll < 0.4) {
    const id = some(of("title", "clip", "audio"));
    const prop = pick(next, ["duration", "start", "offset", "anchor", "at"] as const);
    const other = pick(next, ids);
    const value =
      prop === "duration"
        ? pick(next, [seconds(), "fill", { match: other }, { until: other }, undefined, -1])
        : prop === "anchor"
          ? pick(next, [other, `${other}.end`, "start", "nowhere", undefined])
          : prop === "at"
            ? pick(next, ["word:5", "word:900", undefined])
            : seconds() - 1;
    return { op: "set", id, prop, value };
  }
  if (roll < 0.48) {
    const id = some(of("clip", "title"));
    const value = pick(next, [
      {
        opacity: [
          { at: 0, value: 0 },
          { at: seconds(), value: 1 },
        ],
      },
      { rotation: 12 },
      undefined,
    ]);
    return { op: "set", id, prop: "transform", value };
  }
  if (roll < 0.54) {
    const value = pick(next, [[{ type: "blur", radius: 3 }], [{ type: "nope" }], undefined]);
    return { op: "set", id: some(of("clip")), prop: "effects", value };
  }
  if (roll < 0.6) {
    const prop = pick(next, ["layout", "hidden", "role", "muted"] as const);
    const value =
      prop === "layout"
        ? pick(next, ["free", "sequence"])
        : prop === "role"
          ? pick(next, ["music", "voice", undefined])
          : next() < 0.5;
    return { op: "set", id: some(of("track")), prop, value };
  }
  if (roll < 0.64) return { op: "set", id: some(of("marker")), prop: "start", value: seconds() };
  if (roll < 0.66) {
    // What follows what, and what a followed drawing is read from: the checks of a reference read both.
    const id = some(of("title", "shape", "svg"));
    const kind = pick(next, ["follow", "follow", "content", "rotation"] as const);
    if (kind === "follow")
      return { op: "set", id, prop: "follow", value: pick(next, [pick(next, ids), "s1", "sv", "nowhere", undefined]) };
    if (kind === "content")
      return { op: "set", id: "sv", prop: "content", value: pick(next, ["<svg viewBox='0 0 4 4'/>", undefined]) };
    const link = pick(next, [
      { link: "s1.transform.rotation" },
      { link: `${pick(next, ids)}.transform.rotation`, scale: 2 },
      { link: "s1.transform.nothing" },
      12,
    ]);
    return { op: "set", id, prop: "transform", value: { rotation: link } };
  }
  if (roll < 0.68) {
    const prop = pick(next, ["width", "height", "fps"] as const);
    return { op: "set", id: state.composition.id, prop, value: pick(next, [24, 30, 1080, 1920]) };
  }
  if (roll < 0.72) return { op: "text", id: some(of("title")), text: `Words ${n}` };
  if (roll < 0.78) {
    const id = some(of("transition", "gap", "audio"));
    const prop = pick(next, ["duration", "duck"] as const);
    const value =
      prop === "duck" ? pick(next, [{ under: pick(next, ["v1", "voice", "none"]), to: 0.1 }, undefined]) : seconds();
    return { op: "set", id, prop, value };
  }
  if (roll < 0.86) return { op: "remove", id: some(of("clip", "title", "transition", "gap")) };
  const tracks = of("track");
  const track = pick(next, tracks);
  const after = next() < 0.3 || track.children.length === 0 ? null : pick(next, track.children).id;
  if (roll < 0.94) {
    // Now and then under an id the file already has, which no edit makes and the resolver must still answer alike.
    const id = next() < 0.12 ? pick(next, ids) : `n${n}`;
    const node: CollectedNode =
      next() < 0.7
        ? {
            id,
            kind: "clip",
            props: {
              id,
              src: pick(next, ["asset:city", "asset:interview", "asset:gone"]),
              in: 0,
              out: 1 + seconds() / 4,
            },
            children: [],
            parent: track.id,
            editable: "literal",
            lockedProps: [],
            boundProps: {},
          }
        : {
            id,
            kind: "title",
            props: { id, anchor: pick(next, ids), duration: 1 },
            text: "New",
            children: [],
            parent: track.id,
            editable: "literal",
            lockedProps: [],
            boundProps: {},
          };
    return { op: "insert", id, parent: track.id, after, node };
  }
  return { op: "move", id: some(of("clip", "title")), parent: track.id, after };
}

/**
 * A row resolves from nothing after every patch, and the first one also warms the resolver up: under coverage on a
 * slow machine that is more than a test's five seconds.
 */
const ROW_MS = 20_000;

describe.each([
  [24, false],
  [30, true],
  ["29.97", false],
  [60, true],
] as const)("cached and from nothing: random patches at %s fps (captions: %s)", (fps, captions) => {
  it.each(ROWS)(
    "agree after every patch of row %i, and after taking patches back",
    (seed) => {
      const tree = rich(fps, captions);
      const log = logFor(tree);
      const next = random(seed * 7919 + Number.parseFloat(String(fps)) * 31);
      expectSame(tree, sampleManifest, undefined, "as written");
      for (let n = 0; n < 120; n++) {
        let state: ResolvedState;
        try {
          state = resolve(tree, sampleManifest, log);
        } catch {
          // The last patch left a tree nothing can resolve (expectSame saw both ways throw alike): take it back.
          log.truncate(log.mark() - 1);
          continue;
        }
        if (next() < 0.12 && log.mark() > 0) {
          log.truncate(Math.floor(next() * log.mark()));
          expectSame(tree, sampleManifest, log, `row ${seed}, step ${n}: take back to ${log.mark()}`);
          continue;
        }
        const patch = randomPatch(state, next, n);
        try {
          log.append(patch);
        } catch {
          continue;
        }
        const fresh = expectSame(
          tree,
          sampleManifest,
          log,
          `row ${seed}, step ${n}: ${JSON.stringify(patch).slice(0, 200)}`,
        );
        if (!fresh) continue;
        try {
          const now = resolve(tree, sampleManifest, log);
          for (const id of ["c2", "c3", "e2", "t1", "t5", "talk", "d1", "v1"])
            expectDependents(now, id, `dependents of ${id}`, fresh);
        } catch (error) {
          if (!(error instanceof Error) || error.name === "AssertionError") throw error;
        }
      }
    },
    ROW_MS,
  );
});

/** The ways to depend that reading every node's props finds. */
const READ_FROM_PROPS = new Set(["anchor", "follow", "on", "match", "until", "beside"]);

/**
 * What depends on an element is read from the graph of references, which a cached resolve builds from the nodes
 * that write one. It is what the graph of a resolve from nothing gives, and, for the ways written in an element's
 * own props and an element that is in the file, what reading every node gives.
 */
function expectDependents(state: ResolvedState, id: string, step: string, fresh: ResolvedState): void {
  const found = dependentsOf(state, id);
  expect(found, step).toEqual(dependentsOf(fresh, id));
  // The graph holds a reference to something that exists: nothing depends on an element that is gone.
  if (!state.tree.byId.has(id)) {
    expect(found, step).toEqual([]);
    return;
  }
  expect(
    found.filter((d) => READ_FROM_PROPS.has(d.kind)),
    step,
  ).toEqual(dependentsByReadingAll(state, id));
}

/** `dependentsOf` as it was written first: every node of the tree read. */
function dependentsByReadingAll(state: ResolvedState, id: string): Dependent[] {
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

describe("cached and from nothing: edits through the executor on the large project", () => {
  const manifest = {
    assets: { ...sampleManifest.assets, bed: { ...sampleManifest.assets.bed, duration: 600 } },
  } as AssetManifest;

  it.each(ROWS.slice(0, Math.max(3, ROWS.length / 2)))("agree after every edit, undo and redo of row %i", (seed) => {
    const tree = collectModule(buildLarge(40));
    let ids = 0;
    const exec = new Executor({ tree, manifest, log: logFor(tree), now: () => 0, newActionId: () => `a${++ids}` });
    const next = random(seed);
    for (let n = 0; n < 150; n++) {
      const state = exec.state();
      const clips = [...state.items.values()].filter((p) => p.kind === "clip" && p.source);
      const titles = [...state.items.values()].filter((p) => p.kind === "title");
      // A long row may remove every title or every clip: there is nothing left for these edits to be about.
      if (clips.length === 0 || titles.length === 0) break;
      const clip = pick(next, clips);
      const title = pick(next, titles);
      const roll = next();
      let what: string;
      if (roll < 0.12) what = `undo ${exec.undo()?.ok}`;
      else if (roll < 0.2) what = `redo ${exec.redo()?.ok}`;
      else {
        const input: ActionInput =
          roll < 0.4
            ? { type: "clip/trim", params: { id: clip.id, edge: "out", value: clip.source!.in + 0.3 + next() * 2 } }
            : roll < 0.5
              ? {
                  type: "clip/trim",
                  params: { id: clip.id, edge: "in", value: Math.max(0, clip.source!.out - 0.3 - next()) },
                }
              : roll < 0.62
                ? {
                    type: "clip/move",
                    params: { id: title.id, place: { anchor: pick(next, clips).id, offset: next() } },
                  }
                : roll < 0.72
                  ? { type: "box/update", params: { id: clip.id, box: { x: Math.round(next() * 100), y: 0 } } }
                  : roll < 0.8
                    ? { type: "clip/setFit", params: { id: clip.id, value: next() < 0.5 ? "contain" : "cover" } }
                    : roll < 0.88
                      ? {
                          type: "clip/split",
                          params: {
                            id: clip.id,
                            at: clip.range.start.toSeconds() + clip.range.duration.toSeconds() / 2,
                            newId: `s${n}`,
                          },
                        }
                      : roll < 0.94
                        ? { type: "clip/setSpeed", params: { id: clip.id, speed: pick(next, [0.5, 1, 2]) } }
                        : { type: "element/remove", params: { id: next() < 0.5 ? clip.id : title.id } };
        const result = exec.execute(input);
        what = `${input.type} on ${JSON.stringify(input.params).slice(0, 120)}${result.ok ? "" : " (refused)"}`;
      }
      const fresh = expectSame(tree, manifest, exec.log(), `row ${seed}, step ${n}: ${what}`);
      if (!fresh) continue;
      // What depends on an element is found from who names it in the file and the nodes the log made again; reading
      // every node gives the same list.
      const now = exec.state();
      for (const id of [clip.id, title.id, pick(next, clips).id])
        expectDependents(now, id, `dependents of ${id} after ${what}`, fresh);
    }
  });
});

describe("cached and from nothing: a file that uses one id twice", () => {
  // Two elements with one id share a place in the resolver's books, and what the file comes to depends on the order
  // they are read in. A settled track is not taken then: the resolve is done the plain way.
  const twice = (where: "tracks" | "inside") => {
    const element = (
      <Composition fps={30} width={1920} height={1080}>
        <Track id="v1">
          <Clip id="a" src="asset:interview" in={0} out={2} />
          <Clip id="b" src="asset:city" in={0} out={3} />
        </Track>
        <Track id="v2">
          <Clip id={where === "tracks" ? "a" : "c"} src="asset:city" in={1} out={2} />
          <Clip id="d" src="asset:interview" in={4} out={6} effects={[{ type: "blur", radius: 2 }]} />
        </Track>
        <Track id="v3">
          <Clip id={where === "inside" ? "d.effects.0" : "e"} src="asset:city" in={0} out={1} />
          <Clip id="f" src="asset:city" in={2} out={4} />
        </Track>
      </Composition>
    );
    return collectModule({ default: () => element, defaults: {} });
  };

  it.each(["tracks", "inside"] as const)("agrees after every patch (the id is used twice: %s)", (where) => {
    const tree = twice(where);
    const log = logFor(tree);
    expectSame(tree, sampleManifest, undefined, "as written");
    const patches: Patch[] = [
      { op: "set", id: "f", prop: "out", value: 5 },
      { op: "set", id: "b", prop: "out", value: 2 },
      { op: "set", id: "a", prop: "out", value: 1.5 },
      { op: "set", id: "d", prop: "fit", value: "contain" },
      { op: "set", id: "f", prop: "in", value: 1 },
      { op: "set", id: "b", prop: "fit", value: "contain" },
    ];
    for (const patch of patches) {
      log.append(patch);
      expectSame(tree, sampleManifest, log, JSON.stringify(patch));
    }
  });
});

describe("cached and from nothing: the graph of references kept between resolves", () => {
  // A resolve of a file with only props patched hands back the graph it built last, while what it was built from
  // stands. Each patch here changes one of those things, or none of them.
  const steps: readonly { readonly what: string; readonly patch: Patch; readonly kept: boolean }[] = [
    { what: "a prop no reference reads", patch: { op: "set", id: "c1", prop: "fit", value: "contain" }, kept: true },
    { what: "the same again", patch: { op: "set", id: "c1", prop: "fit", value: "cover" }, kept: true },
    { what: "a holder moved", patch: { op: "set", id: "t1", prop: "offset", value: 0.4 }, kept: true },
    { what: "a holder names another", patch: { op: "set", id: "t1", prop: "anchor", value: "c3" }, kept: false },
    { what: "an element starts to follow", patch: { op: "set", id: "f1", prop: "follow", value: "s1" }, kept: false },
    {
      what: "a followed drawing loses its markup",
      patch: { op: "set", id: "sv", prop: "content", value: undefined },
      kept: false,
    },
    {
      what: "a sound ducks under a role no track has",
      patch: { op: "set", id: "bed", prop: "duck", value: { under: "dialogue", to: 0.1 } },
      kept: false,
    },
    { what: "a track takes that role", patch: { op: "set", id: "v2", prop: "role", value: "dialogue" }, kept: false },
    { what: "a track is hidden", patch: { op: "set", id: "v2", prop: "hidden", value: true }, kept: true },
    {
      what: "a link names another value",
      patch: { op: "set", id: "s2", prop: "transform", value: { rotation: { link: "s1.transform.opacity" } } },
      kept: false,
    },
    { what: "a follow goes round", patch: { op: "set", id: "s1", prop: "follow", value: "s2" }, kept: false },
  ];

  it("is the same graph while nothing it reads changed, and a new one, the right one, when something did", () => {
    const tree = rich(30, false);
    const log = logFor(tree);
    let before = resolve(tree, sampleManifest, log).refs;
    for (const step of steps) {
      log.append(step.patch);
      expectSame(tree, sampleManifest, log, step.what);
      const now = resolve(tree, sampleManifest, log).refs;
      expect(now === before, step.what).toBe(step.kept);
      before = now;
    }
    // Taking a patch back is a change like any other.
    log.truncate(log.mark() - 1);
    expectSame(tree, sampleManifest, log, "the last patch taken back");
  });
});

describe("cached and from nothing: the rows above", () => {
  it("went through every short cut of the resolver, so each was held to the answer from nothing", () => {
    expect(shortCuts.tracksTaken).toBeGreaterThan(100);
    expect(shortCuts.tracksChanged).toBeGreaterThan(20);
    expect(shortCuts.tracksShifted).toBeGreaterThan(20);
    expect(shortCuts.refreshed).toBeGreaterThan(20);
    expect(shortCuts.givenBack).toBeGreaterThan(5);
    expect(shortCuts.walked).toBeGreaterThan(100);
    expect(shortCuts.graphKept).toBeGreaterThan(100);
    expect(shortCuts.plain).toBeGreaterThan(0);
  });
});
