// Every reference in a file, as one graph. An element that names another (the element it starts from, follows,
// lasts as long as; the elements a camera makes room for; the track a sound ducks under; a marker) is an edge from
// the one that names to the one named. What depends on an element, what order to work things out in, what a frame's
// picture also depends on and what an edit has to repair are all read from here, in place of a scan per feature.
import { kindsWithProp, parseRef, type RefForm, type RefTarget } from "@uberscene/kit/schema";

import type { ResolveError } from "./errors";
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
  readonly kindOf: (id: string) => string | undefined;
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
  readonly holders: (kind: string) => boolean;
  /** The kinds it may name. Left out: any. */
  readonly targets?: (kind: string) => boolean;
  /** The forms of the reference grammar it is written in. */
  readonly accept: readonly RefForm[];
  /** The references a node writes, each with the prop it sits at. */
  readonly read: (node: CollectedNode, ctx: RefContext) => readonly Written[];
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
    readonly wrongKind?: (written: Written, kind: string) => string;
    /** A circle of these references, as the ids it goes through, the first one repeated last. */
    readonly cycle?: (loop: readonly string[]) => string;
  };
}

const str = (v: unknown): v is string => typeof v === "string";
const props = (node: CollectedNode): Record<string, unknown> => node.props as Record<string, unknown>;
const FOLLOWERS: ReadonlySet<string> = new Set(kindsWithProp("follow"));
const DUCKERS: ReadonlySet<string> = new Set(kindsWithProp("duck"));
/** The kinds whose schema has the prop a reference is written in: a transition's `on`, a camera's `push`. */
const ON_AN_EDGE: ReadonlySet<string> = new Set(kindsWithProp("on"));
const PUSHERS: ReadonlySet<string> = new Set(kindsWithProp("push"));
const WITH_TIMES: ReadonlySet<string> = new Set(kindsWithProp("times"));

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
    unfit: (_from, to, written, ctx) =>
      ctx.kindOf(to) === "svg" && typeof ctx.propsOf(to).content !== "string"
        ? `follow names "${written.text}", an SVG read from a file: its size is only known once it is drawn, so it can't be followed yet; write its markup in \`content\`, or follow a shape`
        : null,
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
    read: (node, ctx) => {
      const under = (props(node).duck as { under?: unknown } | undefined)?.under;
      if (!str(under)) return [];
      // Written bare: a track's id where one has it, else a role.
      const target: RefTarget = ctx.tracks.some((t) => t.id === under)
        ? { type: "track", id: under }
        : { type: "role", role: under };
      return [{ prop: "duck.under", text: under, target }];
    },
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
    // A footage range's ends, and a caption cue's: the props a time reference may sit at.
    read: (node) => (["in", "out", "start", "end"] as const).flatMap((prop) => marker(prop, props(node)[prop])),
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
  const edges: RefEdge[] = [];
  const errors = new Map<string, ResolveError[]>();
  const fail = (kind: RefKind, code: ResolveError["code"], id: string, prop: string, message: string): void => {
    const list = errors.get(kind.name) ?? [];
    list.push({ code, id, prop: kind.report?.prop ?? prop, message });
    errors.set(kind.name, list);
  };
  for (const node of tree.byId.values()) {
    for (const kind of KINDS) {
      if (!kind.holders(node.kind)) continue;
      for (const written of kind.read(node, ctx)) {
        const ids = named(written.target, ctx);
        if (ids.length === 0) {
          if (kind.report) fail(kind, "UNKNOWN_REF", node.id, written.prop, kind.report.unknown(written));
          continue;
        }
        for (const to of ids) {
          const edge = { type: kind.name, from: node.id, prop: written.prop, to, target: written.target };
          const targetKind = ctx.kindOf(to) as string;
          let broken = false;
          if (kind.report) {
            const unfit = kind.unfit?.(node.id, to, written, ctx);
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
  const order = { time: orderOf("time", edges, tree), space: orderOf("space", edges, tree), value: [] as string[] };
  order.value = orderOf("value", edges, tree);
  return { graph: { edges, from, to, order }, errors };
}

/** The elements in the references of one facet, each after the ones it names; those in a circle last, in file order. */
function orderOf(facet: Facet, edges: readonly RefEdge[], tree: CollectedTree): string[] {
  const needs = new Map<string, Set<string>>();
  for (const edge of edges) {
    if ((REF_KINDS[edge.type] as RefKind).facet !== facet) continue;
    (needs.get(edge.from) ?? needs.set(edge.from, new Set()).get(edge.from)!).add(edge.to);
    if (!needs.has(edge.to)) needs.set(edge.to, new Set());
  }
  if (needs.size === 0) return [];
  // File order, so the same file always gives the same order.
  const ids = [...tree.byId.keys()].filter((id) => needs.has(id));
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
