// Every reference in a file, as one graph. An element that names another (the element it starts from, follows,
// lasts as long as; the elements a camera makes room for; the track a sound ducks under; a marker) is an edge from
// the one that names to the one named. What depends on an element, what order to work things out in, what a frame's
// picture also depends on and what an edit has to repair are all read from here, in place of a scan per feature.
import {
  capabilitiesOf,
  type Kind,
  keyPathOf,
  kindsWithProp,
  parseRef,
  type RefForm,
  type RefTarget,
} from "@uberscene/kit/schema";

import { sdkElement } from "../elements";
import { shortCuts } from "./cache";
import type { ResolveError } from "./errors";
import { expandedRoot } from "./expand";
import { EFFECT_PARAM_PATH } from "./link";
import type { CollectedNode, CollectedTree } from "./tree";

/** One reference: `from` names `to` in its prop `prop`. `type` is the name of its `RefKind`. */
export interface RefEdge {
  readonly type: string;
  readonly from: string;
  readonly prop: string;
  readonly to: string;
  readonly target: RefTarget;
  /** The reference names something it may not (the wrong kind, the wrong side of the camera): reported, not used. */
  readonly broken?: true;
}

/** What the checks of a reference may ask about the file. */
export interface RefContext {
  /** The kind of an element, track, marker or anything else with an id; undefined when nothing has the id. */
  readonly kindOf: (id: string) => Kind | undefined;
  /** The track an element is on, or null. */
  readonly trackOf: (id: string) => string | null;
  /** The camera a track is inside. */
  readonly cameraOfTrack: (track: string | null) => string | undefined;
  /** An element's props, parsed where it has been. */
  readonly propsOf: (id: string) => Readonly<Record<string, unknown>>;
  /** The tracks a duck may name: by id, or all with a role. */
  readonly tracks: readonly { readonly id: string; readonly role?: string }[];
}

/** One written reference of a holder, before its targets are looked up. */
interface Written {
  readonly prop: string;
  /** The text as written, for messages. */
  readonly text: string;
  readonly target: RefTarget;
}

/**
 * A way one element refers to another. An entry here is the whole of what the graph, the dependents and the errors
 * know about it: adding a way to refer is adding an entry.
 */
export interface RefKind {
  readonly name: string;
  /** The kinds that may write it. */
  readonly holders: (kind: Kind) => boolean;
  /** The kinds it may name. Left out: any. */
  readonly targets?: (kind: Kind) => boolean;
  /** The forms of the reference grammar it is written in. */
  readonly accept: readonly RefForm[];
  /**
   * The references a node writes, each with the prop it sits at. It reads the node alone (its props and the items
   * under it), so what it returns is kept for as long as the node is the same object.
   */
  readonly read: (node: CollectedNode) => readonly Written[];
  /** What a written reference names in this file, where the text alone does not say (a duck: a track's id or a role). */
  readonly aim?: (written: Written, ctx: RefContext) => RefTarget;
  /** Why this holder may not name this target where they stand (the camera's side), or null. */
  readonly scope?: (from: string, to: string, written: Written, ctx: RefContext) => string | null;
  /** Why this target cannot be read, though its kind is right, or null. */
  readonly unfit?: (from: string, to: string, written: Written, ctx: RefContext) => string | null;
  /**
   * When it is read: `placement` while elements are being placed (it gives a start or a length), `resolved` once they
   * all are (its result is written into the resolved state), `frame` at every frame drawn or mixed.
   */
  readonly phase: "placement" | "resolved" | "frame";
  /** What is read, which is also what a circle of references is a circle in. */
  readonly facet: "time" | "space" | "value";
  readonly cardinality: "one" | "many";
  /**
   * Which moment of the target is read: `same` (the same moment of the video), `held` (the target's own time, held
   * outside it), `source` (a moment of its footage), `once` (where it stands, read one time).
   */
  readonly timeMap: "same" | "held" | "source" | "once";
  /** What removing the target does to the holder: names another, keeps the value it had, or loses the reference. */
  readonly onRemove: "retarget" | "freeze" | "drop";
  /**
   * The errors the graph reports for it. Left out, the references are only recorded: what resolves them reports
   * them (an anchor's start, a marker's time).
   */
  readonly report?: {
    /** The prop the errors are on, when it is not the prop of the reference itself. */
    readonly prop?: string;
    readonly unknown: (written: Written) => string;
    readonly wrongKind?: (written: Written, kind: Kind) => string;
    /** A circle of these references, as the ids it goes through, the first one repeated last. */
    readonly cycle?: (loop: readonly string[]) => string;
  };
}

const str = (v: unknown): v is string => typeof v === "string";
const props = (node: CollectedNode): Record<string, unknown> => node.props as Record<string, unknown>;
const FOLLOWERS: ReadonlySet<Kind> = new Set(kindsWithProp("follow"));
const DUCKERS: ReadonlySet<Kind> = new Set(kindsWithProp("duck"));
/** The kinds whose schema has the prop a reference is written in: a transition's `on`, a camera's `push`. */
const ON_AN_EDGE: ReadonlySet<Kind> = new Set(kindsWithProp("on"));
const PUSHERS: ReadonlySet<Kind> = new Set(kindsWithProp("push"));
const WITH_TIMES: ReadonlySet<Kind> = new Set(kindsWithProp("times"));

const NOTHING: readonly Written[] = [];
/** The props a time reference may sit at: a footage range's ends, and a caption cue's. */
const MARKER_PROPS = ["in", "out", "start", "end"] as const;

/** A reference written as an element's id, with the edges the prop takes. */
function element(prop: string, text: unknown, edges: readonly ("start" | "mid" | "end")[] = []): Written[] {
  if (!str(text)) return [];
  const target = parseRef(text, ["element"], edges);
  return target.type === "invalid" ? [] : [{ prop, text, target }];
}

/** A `marker:ID` written at a prop. */
function marker(prop: string, text: unknown): Written[] {
  if (!str(text)) return [];
  const target = parseRef(text, ["marker"]);
  return target.type === "marker" ? [{ prop, text, target }] : [];
}

const WITH_EFFECTS: ReadonlySet<Kind> = new Set(kindsWithProp("effects"));

/**
 * The links an element writes, each with the path of the value that holds it. The resolver has already taken each
 * one out of the props as an item under the element (`<id>.<path>.link`), or under one of its effects.
 */
function links(node: CollectedNode): readonly Written[] {
  // An item the resolver made (a key, an effect) writes nothing itself: its links are its element's. An element with
  // nothing under it has no link either: most of a file, so this is the way out taken most.
  if (node.children.length === 0 || isItem(node.kind)) return NOTHING;
  let out: Written[] | undefined;
  const visit = (item: CollectedNode): void => {
    const text = props(item).type === "link" ? props(item).link : undefined;
    if (str(text) && item.id.endsWith(".link")) {
      const target = parseRef(text, ["prop"]);
      const prop = item.id.slice(node.id.length + 1, -".link".length);
      if (target.type === "prop") (out ??= []).push({ prop, text, target });
    }
    for (const child of item.children) if (isItem(child.kind)) visit(child);
  };
  for (const child of node.children) if (isItem(child.kind)) visit(child);
  return out ?? NOTHING;
}

const itemKinds = new Map<Kind, boolean>();
/** Whether a kind is an item under an element (a key, an effect), not an element with a place of its own. */
function isItem(kind: Kind): boolean {
  let known = itemKinds.get(kind);
  if (known === undefined) {
    known = capabilitiesOf(kind).placementScope === "child";
    itemKinds.set(kind, known);
  }
  return known;
}

const duration = (node: CollectedNode): { match?: unknown; until?: unknown } =>
  typeof props(node).duration === "object" && props(node).duration !== null
    ? (props(node).duration as { match?: unknown; until?: unknown })
    : {};

/**
 * The ways to refer, in the order a holder's references are listed. The first five are the order `dependentsOf` has
 * always listed them in.
 */
export const REF_KINDS: Readonly<Record<string, RefKind>> = {
  anchor: {
    name: "anchor",
    holders: () => true,
    accept: ["element", "start"],
    read: (node) => element("anchor", props(node).anchor, ["end"]),
    phase: "placement",
    facet: "time",
    cardinality: "one",
    timeMap: "source",
    onRemove: "retarget",
  },
  follow: {
    name: "follow",
    holders: (kind) => FOLLOWERS.has(kind),
    targets: (kind) => FOLLOWERS.has(kind),
    accept: ["element"],
    read: (node) => element("follow", props(node).follow),
    scope: (from, to, _written, ctx) => {
      const mine = ctx.cameraOfTrack(ctx.trackOf(from));
      if (mine === ctx.cameraOfTrack(ctx.trackOf(to))) return null;
      const inside = mine !== undefined ? from : to;
      return `"${inside}" is under the camera and the other is not: put "${from}" and "${to}", which it follows, on tracks on the same side of the camera`;
    },
    unfit: (_from, to, written, ctx) => {
      const kind = ctx.kindOf(to);
      const why = kind && sdkElement(kind)?.cannotBeFollowed?.(ctx.propsOf(to));
      return why ? `follow names "${written.text}", ${why}` : null;
    },
    phase: "frame",
    facet: "space",
    cardinality: "one",
    timeMap: "held",
    onRemove: "freeze",
    report: {
      unknown: (written) => `follow names "${written.text}", which does not exist`,
      wrongKind: (written, kind) =>
        `follow names "${written.text}", a ${kind}: an element follows a title, shape, svg, sticker or layer`,
      cycle: (loop) =>
        `follows go round in a circle: ${loop.map((id) => `"${id}"`).join(" → ")}; remove one of these follows`,
    },
  },
  on: {
    name: "on",
    holders: (kind) => ON_AN_EDGE.has(kind),
    accept: ["element"],
    read: (node) => element("on", props(node).on),
    phase: "placement",
    facet: "time",
    cardinality: "one",
    timeMap: "once",
    onRemove: "drop",
  },
  match: {
    name: "match",
    holders: () => true,
    accept: ["element"],
    read: (node) => element("duration", duration(node).match),
    phase: "placement",
    facet: "time",
    cardinality: "one",
    timeMap: "once",
    onRemove: "freeze",
  },
  until: {
    name: "until",
    holders: () => true,
    accept: ["element"],
    read: (node) => element("duration", duration(node).until),
    phase: "placement",
    facet: "time",
    cardinality: "one",
    timeMap: "source",
    onRemove: "freeze",
  },
  push: {
    name: "push",
    holders: (kind) => PUSHERS.has(kind),
    accept: ["element"],
    read: (node) => {
      const push = props(node).push as { on?: unknown; keep?: unknown } | undefined;
      const list = (part: "on" | "keep"): Written[] =>
        Array.isArray(push?.[part]) ? (push[part] as unknown[]).flatMap((id) => element(`push.${part}`, id)) : [];
      return [...list("on"), ...list("keep")];
    },
    scope: (from, to, written, ctx) =>
      ctx.cameraOfTrack(ctx.trackOf(to)) === from
        ? null
        : `${written.prop} names "${to}", which is not on one of the camera's tracks: the camera does not move it`,
    phase: "resolved",
    facet: "space",
    cardinality: "many",
    timeMap: "once",
    onRemove: "drop",
    report: {
      prop: "push",
      unknown: (written) => `${written.prop} names "${written.text}", which does not exist`,
    },
  },
  duck: {
    name: "duck",
    holders: (kind) => DUCKERS.has(kind),
    accept: ["track", "role"],
    read: (node) => {
      const under = (props(node).duck as { under?: unknown } | undefined)?.under;
      return str(under) ? [{ prop: "duck.under", text: under, target: { type: "role", role: under } }] : NOTHING;
    },
    // Written bare: a track's id where one has it, else a role. Which one depends on the file's tracks, not on the
    // element, so it is settled each time the graph is built.
    aim: (written, ctx) =>
      ctx.tracks.some((t) => t.id === written.text)
        ? { type: "track", id: written.text }
        : { type: "role", role: written.text },
    phase: "frame",
    facet: "value",
    cardinality: "many",
    timeMap: "same",
    onRemove: "drop",
    report: {
      unknown: (written) => `duck.under "${written.text}" is neither a track id nor a track role`,
    },
  },
  marker: {
    name: "marker",
    holders: () => true,
    accept: ["marker"],
    read: (node) => {
      let out: Written[] | undefined;
      for (const prop of MARKER_PROPS) {
        const at = props(node)[prop];
        if (str(at)) for (const written of marker(prop, at)) (out ??= []).push(written);
      }
      return out ?? NOTHING;
    },
    phase: "placement",
    facet: "time",
    cardinality: "one",
    timeMap: "once",
    onRemove: "freeze",
  },
  sceneTime: {
    name: "sceneTime",
    holders: (kind) => WITH_TIMES.has(kind),
    accept: ["marker"],
    read: (node) => {
      const times = props(node).times;
      return typeof times === "object" && times !== null
        ? Object.entries(times as Record<string, unknown>).flatMap(([name, at]) => marker(`times.${name}`, at))
        : [];
    },
    phase: "resolved",
    facet: "time",
    cardinality: "many",
    timeMap: "once",
    onRemove: "freeze",
  },
  link: {
    name: "link",
    holders: () => true,
    accept: ["prop"],
    read: (node) => links(node),
    unfit: (_from, to, written, ctx) => {
      const kind = ctx.kindOf(to) as Kind;
      const path = written.target.type === "prop" ? written.target.path : "";
      if (EFFECT_PARAM_PATH.test(path))
        return WITH_EFFECTS.has(kind) ? null : `${written.prop} links to "${written.text}": a ${kind} has no effects`;
      const entry = keyPathOf(kind, path);
      if (entry?.numeric) return null;
      return entry
        ? `${written.prop} links to "${written.text}", which is not a number: a link reads a number`
        : `${written.prop} links to "${written.text}": a ${kind} has no "${path}" that changes over time`;
    },
    // Read once everything is placed: the resolver writes the linked value's keys onto the holder (`lowerLinks`).
    phase: "resolved",
    facet: "value",
    cardinality: "one",
    timeMap: "same",
    onRemove: "freeze",
    report: {
      unknown: (written) =>
        `${written.prop} links to "${written.text}", and there is no element "${written.text.split(".")[0]}"`,
    },
  },
};

const KINDS = Object.values(REF_KINDS);

type Facet = RefKind["facet"];

/** The references of a file. */
export interface RefGraph {
  /** Every reference whose target exists, holders in file order, each holder's in the order of `REF_KINDS`. */
  readonly edges: readonly RefEdge[];
  /** By the element that names. */
  readonly from: ReadonlyMap<string, readonly RefEdge[]>;
  /** By the element named. */
  readonly to: ReadonlyMap<string, readonly RefEdge[]>;
  /**
   * For each thing read, the elements that take part, each after what it names: the order to work them out in.
   * Elements in a circle come last, in file order.
   */
  readonly order: Readonly<Record<Facet, readonly string[]>>;
}

const EMPTY: RefGraph = {
  edges: [],
  from: new Map(),
  to: new Map(),
  order: { time: [], space: [], value: [] },
};

/** What one node writes: for each way to refer it uses, its references. */
type WrittenByKind = readonly { readonly kind: RefKind; readonly written: readonly Written[] }[];
const WRITES_NOTHING: WrittenByKind = [];
/**
 * What each node writes, kept by the node itself. An edit makes a new node for the element it changes and for
 * every element above it (the same rule the resolver's other per-node results rest on), so a drag reads three nodes
 * again and takes the rest from here: reading every node of a long timeline on each step was most of the graph's
 * cost.
 */
const writtenByNode = new WeakMap<CollectedNode, WrittenByKind>();

function writtenOf(node: CollectedNode): WrittenByKind {
  const known = writtenByNode.get(node);
  if (known) return known;
  let out: { kind: RefKind; written: readonly Written[] }[] | undefined;
  for (const kind of KINDS) {
    if (!kind.holders(node.kind)) continue;
    const written = kind.read(node);
    if (written.length > 0) (out ??= []).push({ kind, written });
  }
  const result = out ?? WRITES_NOTHING;
  writtenByNode.set(node, result);
  return result;
}

/** Every reference a node writes, as text: the kind of reference, the prop it sits at and what is written there. */
export function referencesWritten(node: CollectedNode): { type: string; prop: string; text: string }[] {
  return writtenOf(node).flatMap(({ kind, written }) =>
    written.map((w) => ({ type: kind.name, prop: w.prop, text: w.text })),
  );
}

/** The ids a written reference names, among what exists. */
function named(target: RefTarget, ctx: RefContext): string[] {
  switch (target.type) {
    case "element":
    case "marker":
    case "track":
    case "prop":
      return ctx.kindOf(target.id) === undefined ? [] : [target.id];
    case "role":
      return ctx.tracks.filter((t) => t.role === target.role).map((t) => t.id);
    case "moment":
      return target.of !== undefined && ctx.kindOf(target.of) !== undefined ? [target.of] : [];
    default:
      return [];
  }
}

/**
 * Reads every reference of the tree into a graph, and reports what the kinds with a `report` find wrong: a target
 * that does not exist (`UNKNOWN_REF`), of a kind that may not be named (`WRONG_KIND`), on the wrong side of something
 * (`WRONG_SCOPE`), or a circle (`CYCLE`). The errors are listed per kind of reference, for the resolver to place
 * where that kind's errors have always stood.
 */
export function buildRefGraph(
  tree: CollectedTree,
  ctx: RefContext,
): { readonly graph: RefGraph; readonly errors: ReadonlyMap<string, readonly ResolveError[]> } {
  return graphOf(tree.byId.values(), (needed) => [...tree.byId.keys()].filter(needed), ctx);
}

/** The ids `needed` says yes to, in the order the file has them. */
export type InFileOrder = (needed: (id: string) => boolean, ids: Iterable<string>) => string[];

/**
 * The graph of the references `nodes` write. They are the tree's nodes in file order, or only those of them that
 * write a reference: a node that writes none adds nothing. `inOrder` is asked when an order is first read.
 */
export function graphOf(
  nodes: Iterable<CollectedNode>,
  inOrder: InFileOrder,
  ctx: RefContext,
  /** Told each answer of a kind's `unfit`, the one check that reads what an element's props say. */
  asked?: (check: Unfit) => void,
): { readonly graph: RefGraph; readonly errors: ReadonlyMap<string, readonly ResolveError[]> } {
  const edges: RefEdge[] = [];
  const errors = new Map<string, ResolveError[]>();
  const fail = (kind: RefKind, code: ResolveError["code"], id: string, prop: string, message: string): void => {
    const list = errors.get(kind.name) ?? [];
    list.push({ code, id, prop: kind.report?.prop ?? prop, message });
    errors.set(kind.name, list);
  };
  for (const node of nodes) {
    for (const { kind, written: all } of writtenOf(node)) {
      for (const read of all) {
        const written = kind.aim ? { ...read, target: kind.aim(read, ctx) } : read;
        const ids = named(written.target, ctx);
        if (ids.length === 0) {
          if (kind.report) fail(kind, "UNKNOWN_REF", node.id, written.prop, kind.report.unknown(written));
          continue;
        }
        for (const to of ids) {
          const edge = { type: kind.name, from: node.id, prop: written.prop, to, target: written.target };
          const targetKind = ctx.kindOf(to) as Kind;
          let broken = false;
          if (kind.report) {
            const unfit = kind.unfit?.(node.id, to, written, ctx);
            if (asked && kind.unfit) asked({ kind, from: node.id, to, written, answer: unfit ?? null });
            const scope = kind.scope?.(node.id, to, written, ctx);
            if (kind.targets && !kind.targets(targetKind)) {
              fail(
                kind,
                "WRONG_KIND",
                node.id,
                written.prop,
                kind.report.wrongKind?.(written, targetKind) ?? `${written.prop} names "${to}", a ${targetKind}`,
              );
              broken = true;
            } else if (unfit) {
              fail(kind, "WRONG_KIND", node.id, written.prop, unfit);
              broken = true;
            } else if (scope) {
              fail(kind, "WRONG_SCOPE", node.id, written.prop, scope);
              broken = true;
            }
          }
          edges.push(broken ? { ...edge, broken: true } : edge);
        }
      }
    }
  }
  if (edges.length === 0) return { graph: EMPTY, errors };
  const from = new Map<string, RefEdge[]>();
  const to = new Map<string, RefEdge[]>();
  for (const edge of edges) {
    (from.get(edge.from) ?? from.set(edge.from, []).get(edge.from)!).push(edge);
    (to.get(edge.to) ?? to.set(edge.to, []).get(edge.to)!).push(edge);
  }
  // Circles, for the kinds that report them: found from each sound reference in file order, each circle said once.
  for (const kind of KINDS) {
    const cycle = kind.report?.cycle;
    if (!cycle) continue;
    const next = (id: string): string | undefined => from.get(id)?.find((e) => e.type === kind.name)?.to;
    const inCycle = new Set<string>();
    for (const edge of edges) {
      if (edge.type !== kind.name || edge.broken || inCycle.has(edge.from)) continue;
      const chain = [edge.from];
      for (let at: string | undefined = edge.to; at !== undefined && !inCycle.has(at); at = next(at)) {
        const i = chain.indexOf(at);
        if (i >= 0) {
          const loop = chain.slice(i);
          for (const id of loop) inCycle.add(id);
          fail(kind, "CYCLE", loop[0] as string, edge.prop, cycle([...loop, loop[0] as string]));
          break;
        }
        chain.push(at);
      }
    }
  }
  return { graph: { edges, from, to, order: lazyOrder(edges, inOrder) }, errors };
}

/** The order of each facet, worked out the first time it is read: most resolves read none, a frame reads one. */
function lazyOrder(edges: readonly RefEdge[], inOrder: InFileOrder): RefGraph["order"] {
  const known: Partial<Record<Facet, readonly string[]>> = {};
  const of = (facet: Facet) => (known[facet] ??= orderOf(facet, edges, inOrder));
  return {
    get time() {
      return of("time");
    },
    get space() {
      return of("space");
    },
    get value() {
      return of("value");
    },
  };
}

/** The elements in the references of one facet, each after the ones it names; those in a circle last, in file order. */
function orderOf(facet: Facet, edges: readonly RefEdge[], inOrder: InFileOrder): string[] {
  const needs = new Map<string, Set<string>>();
  for (const edge of edges) {
    if ((REF_KINDS[edge.type] as RefKind).facet !== facet) continue;
    (needs.get(edge.from) ?? needs.set(edge.from, new Set()).get(edge.from)!).add(edge.to);
    if (!needs.has(edge.to)) needs.set(edge.to, new Set());
  }
  if (needs.size === 0) return [];
  // File order, so the same file always gives the same order.
  const ids = inOrder((id) => needs.has(id), needs.keys());
  const done = new Set<string>();
  const out: string[] = [];
  for (let moved = true; moved; ) {
    moved = false;
    for (const id of ids) {
      if (done.has(id)) continue;
      const waits = needs.get(id) as Set<string>;
      let ready = true;
      for (const need of waits) if (!done.has(need)) ready = false;
      if (!ready) continue;
      done.add(id);
      out.push(id);
      moved = true;
    }
  }
  for (const id of ids) if (!done.has(id)) out.push(id);
  return out;
}

type Graphed = ReturnType<typeof graphOf>;

/** One answer of a kind's `unfit`: why `from` may not name `to`, or null. */
interface Unfit {
  readonly kind: RefKind;
  readonly from: string;
  readonly to: string;
  readonly written: Written;
  readonly answer: string | null;
}

/** A graph built for a file, with what it was built from: it stands for as long as all of that is the same. */
interface Kept {
  /** The nodes that write a reference, and what each writes. */
  readonly nodes: readonly CollectedNode[];
  readonly written: readonly WrittenByKind[];
  /** The tracks a duck may name and the camera each is under, as one text. */
  readonly tracks: string;
  /** What each check of an element named said, which is all the graph reads of an element's props. */
  readonly asked: readonly Unfit[];
  readonly result: Graphed;
}

interface Holders {
  readonly place: ReadonlyMap<string, number>;
  /** The places of the file's nodes that write a reference, in order, and those nodes with their items under them. */
  readonly holding: readonly number[];
  readonly nodes: readonly CollectedNode[];
  kept?: Kept | undefined;
}
const holdersIn = new WeakMap<ReadonlyMap<string, CollectedNode>, Holders>();

function sameWritten(a: WrittenByKind, b: WrittenByKind): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const mine = a[i] as WrittenByKind[number];
    const theirs = b[i] as WrittenByKind[number];
    if (mine.kind !== theirs.kind || mine.written.length !== theirs.written.length) return false;
    for (let j = 0; j < mine.written.length; j++) {
      const one = mine.written[j] as Written;
      const other = theirs.written[j] as Written;
      // What a reference names is read from its text alone.
      if (one.prop !== other.prop || one.text !== other.text) return false;
    }
  }
  return true;
}

/**
 * The graph of a tree that is `base`, a file's nodes, with the nodes of `over` made again, and the place of each id
 * in the file's order. It holds for a tree whose ids are the file's, each one node's (the resolver's `walkable`):
 * then the file's order is the order of `base`.
 *
 * Which of the file's own nodes write a reference is worked out once for the file: an edit's tree asks only the few
 * nodes it made again, so a drag does not read every node of a long timeline for the handful that name another. A
 * node is read with its keys and effects as items under it, which is where a link is read from: `again` has the
 * nodes of `over` so, and the file's own are kept by the node.
 *
 * The graph itself is kept too, and handed back as the same object while nothing it was built from has changed:
 * the nodes that write a reference write the same ones, the tracks have the ids, roles and cameras they had, and
 * every check of an element named (whether the one a `follow` names can be followed) answers as it did. The kind of an
 * element, the track it is on and the camera over that track are the file's, which patching props does not change.
 * A reference that names an id with a dot in it may name an item made from a prop, which a patch can make or take
 * away: a graph with one is built each time.
 */
export function graphOfFile(
  base: ReadonlyMap<string, CollectedNode>,
  over: ReadonlyMap<string, CollectedNode> | undefined,
  again: ReadonlyMap<string, CollectedNode>,
  inOrder: (place: ReadonlyMap<string, number>) => InFileOrder,
  ctx: RefContext,
): Graphed {
  let index = holdersIn.get(base);
  if (!index) {
    const place = new Map<string, number>();
    const holding: number[] = [];
    const nodes: CollectedNode[] = [];
    let at = 0;
    for (const node of base.values()) {
      place.set(node.id, at);
      const expanded = expandedRoot(node);
      if (writtenOf(expanded).length > 0) {
        holding.push(at);
        nodes.push(expanded);
      }
      at++;
    }
    index = { place, holding, nodes };
    holdersIn.set(base, index);
  }
  // A node made again may write anything now; any other writes what it did in the file.
  let nodes = index.nodes;
  if (over && over.size > 0) {
    let changed: Map<number, CollectedNode | null> | undefined;
    for (const [id, node] of over) {
      const at = index.place.get(id);
      if (at === undefined) continue;
      const expanded = again.get(id) ?? expandedRoot(node);
      const writes = writtenOf(expanded).length > 0;
      const k = lowerBound(index.holding, at);
      const held = index.holding[k] === at;
      if (!held && !writes) continue;
      (changed ??= new Map()).set(at, writes ? expanded : null);
    }
    if (changed) {
      const out: CollectedNode[] = [];
      const extra = [...changed.keys()].sort((a, b) => a - b);
      let e = 0;
      const take = (limit: number): void => {
        for (; e < extra.length && (extra[e] as number) <= limit; e++) {
          const node = changed.get(extra[e] as number);
          if (node) out.push(node);
        }
      };
      for (let k = 0; k < index.holding.length; k++) {
        const at = index.holding[k] as number;
        take(at - 1);
        if (changed.has(at)) take(at);
        else out.push(index.nodes[k] as CollectedNode);
      }
      take(Number.POSITIVE_INFINITY);
      nodes = out;
    }
  }
  let tracks = "";
  for (const track of ctx.tracks) tracks += `${track.id}\n${track.role ?? ""}\n${ctx.cameraOfTrack(track.id) ?? ""}\n`;
  const kept = index.kept;
  if (kept && kept.tracks === tracks && kept.nodes.length === nodes.length) {
    let same = true;
    if (kept.nodes !== nodes)
      for (let i = 0; same && i < nodes.length; i++) {
        const node = nodes[i] as CollectedNode;
        const was = kept.nodes[i] as CollectedNode;
        same = node === was || (node.id === was.id && sameWritten(writtenOf(node), kept.written[i] as WrittenByKind));
      }
    for (let i = 0; same && i < kept.asked.length; i++) {
      const check = kept.asked[i] as Unfit;
      same = (check.kind.unfit?.(check.from, check.to, check.written, ctx) ?? null) === check.answer;
    }
    if (same) {
      shortCuts.graphKept++;
      return kept.result;
    }
  }
  const asked: Unfit[] = [];
  let dotted = false;
  const result = graphOf(
    nodes,
    inOrder(index.place),
    {
      ...ctx,
      kindOf: (id) => {
        if (id.includes(".")) dotted = true;
        return ctx.kindOf(id);
      },
    },
    (check) => asked.push(check),
  );
  index.kept = dotted ? undefined : { nodes, written: nodes.map(writtenOf), tracks, asked, result };
  return result;
}

/** The first place in a sorted list that holds `value` or more. */
function lowerBound(sorted: readonly number[], value: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if ((sorted[mid] as number) < value) low = mid + 1;
    else high = mid;
  }
  return low;
}
