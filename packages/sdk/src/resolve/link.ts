// A value linked to another element's: `{ link: "logo.transform.rotation", scale, offset, delay }`. `expandKeys` leaves
// an item in the link's place (`<id>.<path>.link`); once everything is placed, `lowerLinks` writes the linked value
// there as ordinary keys and, when it has one, its generator, as a camera's push is written. So whatever reads a value
// over time (the preview, the export, motion blur, the frame cache, the mixer, the checks) reads a link with no code
// of its own. The copy is exact: the linked value times `scale` plus `offset` is the same curve with other numbers.
import { type KeyPath, keyPathOf, keyPathsOf, Time } from "@uberscene/kit/schema";

import { T } from "../time";
import type { ResolveError } from "./errors";
import type { RefEdge, RefGraph } from "./refs";
import type { Placement } from "./resolve";

/** An effect's param, as a link names it: `effects.0.radius`. */
export const EFFECT_PARAM_PATH = /^effects\.(\d+)\.([A-Za-z_]\w*)$/;

/** What the resolver lends: its items, and how an item it makes is placed. */
export interface LinkHost {
  readonly items: Map<string, Placement>;
  /**
   * Places an item under `parent` (the element `owner`, or one of its effects): a key at `at` seconds of the value's
   * clock, or, with `at` null, a generator for all of it.
   */
  readonly add: (
    owner: Placement,
    parent: string,
    id: string,
    kind: "keyframe" | "generator",
    props: Record<string, unknown>,
    at: number | null,
  ) => void;
  readonly setChildren: (id: string, children: readonly string[]) => void;
}

/** A number's value when nothing is written and the table gives none. */
const UNWRITTEN: Readonly<Record<string, number>> = {
  "transform.rotation": 0,
  "transform.opacity": 1,
  "transform.borderRadius": 0,
  "audio.volume": 1,
  "audio.pan": 0,
  "shape.stroke.dashOffset": 0,
};

/** One value of an element, as a link reads it or writes it. */
interface Slot {
  readonly element: Placement;
  /** The element itself, or the effect the param is in. */
  readonly parent: Placement;
  /** How its keys and its generator are told from the parent's others. */
  readonly how: { readonly property: string } | { readonly param: string };
  /** Where its clock starts: the element's start, or the video's for a camera. */
  readonly origin: Time;
  /** Its constant when it has no keys, or why it has none to read. */
  readonly constant: () => number | string;
}

const number = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** The value at a dotted path of parsed props; one number for both axes (`scale: 2`) is each axis's. */
function at(props: Readonly<Record<string, unknown>>, path: string): unknown {
  let here: unknown = props;
  for (const seg of path.split(".")) {
    if (number(here) && (seg === "x" || seg === "y")) return here;
    if (here === null || typeof here !== "object") return undefined;
    here = (here as Record<string, unknown>)[seg];
  }
  return here;
}

/**
 * The path of the one number a link reads when it names both axes (`transform.scale`): the axis of the value that
 * holds the link, or x.
 */
function oneAxis(entry: KeyPath, path: string, holderPath: string): string {
  if (entry.both !== path) return path;
  return `${path}.${holderPath.endsWith(".y") ? "y" : "x"}`;
}

/** The value of `element` at `path`, or why there is none there. */
function slotOf(items: ReadonlyMap<string, Placement>, element: Placement, path: string): Slot | string {
  const fx = EFFECT_PARAM_PATH.exec(path);
  if (fx) {
    const effect = items.get(`${element.id}.effects.${fx[1]}`);
    const name = fx[2] as string;
    if (!effect) return `"${element.id}" has no effect ${fx[1]}`;
    return {
      element,
      parent: effect,
      how: { param: name },
      origin: element.range.start,
      constant: () => {
        const written = (effect.props.params as Readonly<Record<string, unknown>> | undefined)?.[name];
        return number(written)
          ? written
          : `"${element.id}" writes no number for ${name} in its effect ${fx[1]}: write one to link to it`;
      },
    };
  }
  const entry = keyPathsOf(element.kind).find((k) => k.path === path);
  if (!entry?.numeric) return `a ${element.kind} has no number at "${path}" that changes over time`;
  return {
    element,
    parent: element,
    how: { property: entry.property },
    origin: entry.clock === "video" ? Time.ZERO : element.range.start,
    constant: () => {
      const written = at(element.props, path);
      if (number(written)) return written;
      const unwritten = entry.missing ?? UNWRITTEN[entry.property];
      return unwritten ?? `"${element.id}" writes no ${path}: write one to link to it`;
    },
  };
}

/** The items under a slot's parent that are this slot's: its keys, and its generator. */
function itemsOf(items: ReadonlyMap<string, Placement>, slot: Slot): { keys: Placement[]; generator?: Placement } {
  const [field, name] = Object.entries(slot.how)[0] as [string, string];
  const keys: Placement[] = [];
  let generator: Placement | undefined;
  for (const id of slot.parent.children) {
    const item = items.get(id);
    if (!item || item.props[field] !== name) continue;
    // A key has a time and a value; a generator has a type.
    if ("at" in item.props && "value" in item.props) keys.push(item);
    else if (typeof item.props.type === "string") generator = item;
  }
  keys.sort((a, b) => Number(a.props.at) - Number(b.props.at));
  return generator ? { keys, generator } : { keys };
}

const placeholderId = (holder: string, path: string): string => `${holder}.${path}.link`;
const isPlaceholder = (item: Placement): boolean => item.props.type === "link" && item.id.endsWith(".link");

/**
 * Writes every link as the keys and the generator of the value it names, in place of the item `expandKeys` left
 * for it. A link to a value that is itself linked is written after that one, so a chain reads through; a circle of
 * links is an error that names it. Returns the errors; every link's item is gone afterwards, written or not.
 */
export function lowerLinks(graph: RefGraph, host: LinkHost): ResolveError[] {
  const { items } = host;
  const errors: ResolveError[] = [];
  const edges = graph.edges.filter((e) => e.type === "link");
  const state = new Map<string, "doing" | "done" | "failed">();

  /** Takes a link's item out of its parent, with `made` in its place. */
  const replace = (placeholder: Placement, made: readonly string[]): void => {
    const parent = placeholder.parent ? items.get(placeholder.parent) : undefined;
    items.delete(placeholder.id);
    if (parent)
      host.setChildren(
        parent.id,
        parent.children.flatMap((id) => (id === placeholder.id ? made : [id])),
      );
  };

  const edgeAt = (holder: string, path: string): RefEdge | undefined =>
    graph.from.get(holder)?.find((e) => e.type === "link" && e.prop === path);

  /** Writes the link `holder` has at `path`, if it has one. False when it could not be written. */
  const lower = (holder: string, path: string, chain: readonly string[]): boolean => {
    const key = `${holder}.${path}`;
    const placeholder = items.get(placeholderId(holder, path));
    const known = state.get(key);
    if (known === "doing") {
      const loop = [...chain.slice(chain.indexOf(key)), key];
      errors.push({
        code: "CYCLE",
        id: holder,
        prop: path,
        message: `links go round in a circle: ${loop.map((at) => `"${at}"`).join(" → ")}; write a number or keys in place of one of these links`,
      });
      return false;
    }
    if (known !== undefined) return known === "done";
    if (!placeholder) return true;
    state.set(key, "doing");
    const fail = (error?: string): false => {
      if (error !== undefined) errors.push({ code: "SCHEMA", id: holder, prop: path, message: error });
      const left = items.get(placeholder.id);
      if (left) replace(left, []);
      state.set(key, "failed");
      return false;
    };
    const edge = edgeAt(holder, path);
    const owner = items.get(holder);
    const target = edge ? items.get(edge.to) : undefined;
    // An unknown or unfit target is the graph's to report.
    if (!edge || edge.broken || !owner || !target || edge.target.type !== "prop") return fail();
    if (owner.props.push && path !== "rotation" && keyPathOf(owner.kind, path)?.clock === "video")
      return fail(
        `the camera's push sets its ${path}, so it cannot be linked as well: take the push off, or link another value`,
      );
    const both = keyPathOf(target.kind, edge.target.path);
    const targetPath = both ? oneAxis(both, edge.target.path, path) : edge.target.path;
    // What it names may be a link too: that one first.
    if (!lower(target.id, targetPath, [...chain, key])) return fail();
    // As they stand now: writing that link gave the element it is on new items.
    const from = slotOf(items, items.get(target.id) ?? target, targetPath);
    const into = slotOf(items, items.get(owner.id) ?? owner, path);
    if (typeof from === "string") return fail(`${path} links to "${edge.target.id}.${edge.target.path}": ${from}`);
    if (typeof into === "string") return fail(into);

    const scale = number(placeholder.props.scale) ? placeholder.props.scale : 1;
    const offset = number(placeholder.props.offset) ? placeholder.props.offset : 0;
    const delay = number(placeholder.props.delay) ? placeholder.props.delay : 0;
    // The same moment of the video, `delay` later: a time of the linked value's clock on this value's clock. Exact,
    // as `Time`s, so a key that sits on a frame there sits on a frame here.
    const shift = from.origin.minus(into.origin).plus(T(delay));
    const moved = (seconds: number): number => T(seconds).plus(shift).toSeconds();
    const read = itemsOf(items, from);
    const made: string[] = [];
    const base = placeholder.id;
    if (read.keys.length > 0) {
      read.keys.forEach((k, i) => {
        const id = `${base}.${i}`;
        const when = moved(Number(k.props.at));
        host.add(
          owner,
          into.parent.id,
          id,
          "keyframe",
          {
            ...into.how,
            at: when,
            value: Number(k.props.value) * scale + offset,
            easing: k.props.easing ?? "linear",
          },
          when,
        );
        made.push(id);
      });
    } else {
      const constant = from.constant();
      if (typeof constant === "string") return fail(`${path} links to a value with nothing to read: ${constant}`);
      const id = `${base}.0`;
      host.add(
        owner,
        into.parent.id,
        id,
        "keyframe",
        { ...into.how, at: 0, value: constant * scale + offset, easing: "linear" },
        0,
      );
      made.push(id);
    }
    const g = read.generator?.props;
    if (g) {
      const id = `${base}.generator`;
      // A wobble and a drift run on the linked value's clock: `shift` is where this value's start stands on it.
      const own = (number(g.shift) ? g.shift : 0) - shift.toSeconds();
      const span = g.span as readonly [number, number] | undefined;
      host.add(
        owner,
        into.parent.id,
        id,
        "generator",
        {
          ...into.how,
          type: g.type,
          ...(number(g.amount) ? { amount: g.amount * scale } : {}),
          ...(g.frequency !== undefined ? { frequency: g.frequency } : {}),
          ...(g.seed !== undefined ? { seed: g.seed } : {}),
          ...(number(g.speed) ? { speed: g.speed * scale } : {}),
          ...(g.mode !== undefined ? { mode: g.mode } : {}),
          ...(span ? { span: [moved(span[0]), moved(span[1])] } : { shift: own }),
        },
        null,
      );
      made.push(id);
    }
    const left = items.get(placeholder.id);
    if (left) replace(left, made);
    state.set(key, "done");
    return true;
  };

  for (const edge of edges) lower(edge.from, edge.prop, []);
  // A link whose target does not exist has no edge: its item goes too.
  for (const item of [...items.values()]) if (isPlaceholder(item) && items.has(item.id)) replace(item, []);
  return errors;
}
