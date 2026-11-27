import type { z } from "zod";

import { isScene } from "@uberscene/kit";
import {
  applyTheme,
  capabilitiesOf,
  DERIVED_KINDS,
  type DeclaredFont,
  defaultTransitionParams,
  ENGINE_SCHEMAS,
  effectEntry,
  effectParamProblem,
  type FrameRate,
  isBuiltInTransition,
  MAIN_TRACK_KINDS,
  MAX_SECONDS,
  parseRate,
  type Rate,
  RESPELLED_VALUES,
  type ResolvedTheme,
  rateValue,
  renamedParam,
  resolveTheme,
  round3,
  SCHEMAS_BY_KIND,
  type ShaderDefinition,
  sampleRateProblem,
  shaderFor,
  type ThemeOrigin,
  Time,
  TimeRange,
  TRANSITION_TYPES,
  type TrackLayout,
  type TrackRole,
  type TransitionType,
  themedRuns,
  VIDEO_EFFECT_TYPES,
} from "@uberscene/kit/schema";

import { parseTimeRef, resolveTimeRef } from "../manifest/timeref";
import { type AssetEntry, type AssetManifest, assetIdOf, lookupAsset } from "../manifest/types";
import type { PatchLog } from "../patches/types";
import { T } from "../time";
import { Cache, cachesOff, shortCuts, uncached } from "./cache";
import {
  type AssetPlay,
  assetPlay,
  type CueOptions,
  cueNodes,
  onTimeline,
  planCues,
  playsKey,
  sameAsset,
  timelineWords,
} from "./captions";
import type { ResolveError } from "./errors";
import { derivedOrigin, expandedRoot, expandKeys, expansionOf } from "./expand";
import { FOLLOW_KINDS, followOf } from "./follow";
import { layersIn, overlay, sameIdsAsSource } from "./overlay";
import { type PushSpec, pushKeys } from "./push";
import { placeScene, type SceneUse, sceneAssetId, withSceneAssets } from "./scene3d";
import { shapeKeyProblem } from "./shape-keys";
import { freezeHoldsOf, heldWithin, holdTotal, rampAdvance, rampInverse, reachedHolds, speedKeysOf } from "./speed";
import type { CollectedNode, CollectedTree, Editable, LayerInterior } from "./tree";

export interface Placement {
  readonly id: string;
  readonly kind: string;
  readonly track: string | null;
  readonly parent: string | null;
  readonly children: readonly string[];
  /** Where it plays on the timeline, as exact `Time`s (decisions 0044, 0045). For seconds, `range.start.toSeconds()`. */
  readonly range: TimeRange;
  readonly source?: PlacementSource;
  /** Schema-parsed props with defaults applied, after patches. Raw props when the schema rejected them. */
  readonly props: Readonly<Record<string, unknown>>;
  readonly editable: Editable;
  readonly lockedProps: readonly string[];
  /** Prop → `schema` key; editable, but the fold writes the value into `defaults` rather than the element. */
  readonly boundProps: Readonly<Record<string, string>>;
  readonly errors: readonly ResolveError[];
  /** For transitions between siblings: the two clips. */
  readonly between?: readonly [string, string];
  /** A Layer's handles: the component inside it and its current props. */
  readonly interior?: LayerInterior;
  /** Props the theme supplied, by dot path: `$primary`, `style:h1`, `motion` or `theme`. Absent when none did. */
  readonly themed?: Readonly<Record<string, ThemeOrigin>>;
}

/** The part of an asset a clip or audio plays. `in` and `out` are seconds of the source, `range` the same in ticks. */
export interface PlacementSource {
  readonly in: number;
  readonly out: number;
  readonly speed: number;
  readonly asset: string;
  /** `[in, out)` of the source, as exact `Time`s. */
  readonly range: TimeRange;
}

/**
 * A start and a length as a `TimeRange`. A length below zero (a source played backwards past its in, a broken file)
 * is held at zero, and an end past about 9.85 hours at `Time.MAX`: the resolver reports both, and must still place
 * the rest.
 */
const rangeOf = (start: Time, duration: Time): TimeRange => TimeRange.clamped(start, duration);

/** A placement's source with its range, from the seconds the resolver works the source out in. */
function withRange(source: PendingSource | undefined): PlacementSource | undefined {
  if (!source) return undefined;
  const start = T(source.in);
  return { ...source, range: rangeOf(start, T(source.out).minus(start)) };
}

const MAIN_KINDS: ReadonlySet<string> = new Set(MAIN_TRACK_KINDS);

export interface ResolvedTrack {
  readonly id: string;
  readonly layout: TrackLayout;
  readonly order: number;
  readonly locked: boolean;
  readonly hidden: boolean;
  readonly muted: boolean;
  readonly solo: boolean;
  readonly role?: TrackRole;
  readonly group?: string;
  /** The `<Camera>` the track is written inside, which moves everything on it. Absent for a track outside one. */
  readonly camera?: string;
  /** The main track of a file that writes its clips straight in the composition: no `<Track>` stands for it. */
  readonly implicit?: true;
  readonly items: readonly string[];
}

export interface ResolvedState {
  readonly composition: {
    readonly id: string;
    /** Frames per second as a number, for display. Frame math uses `rate`. */
    readonly fps: number;
    /** The frame rate as an exact fraction, which frame and timecode math goes through (`@uberscene/kit/schema` time). */
    readonly rate: Rate;
    readonly width: number;
    readonly height: number;
    /** @deprecated Seconds, derived from `length`. */
    readonly duration: number;
    /** How long the video is. */
    readonly length: Time;
  };
  readonly tracks: readonly ResolvedTrack[];
  readonly items: ReadonlyMap<string, Placement>;
  readonly errors: readonly ResolveError[];
  readonly tree: CollectedTree;
  readonly manifest: AssetManifest;
  readonly log: PatchLog | undefined;
  /** The composition's theme, its base merged in; the default theme when the file declares none. */
  readonly theme: ResolvedTheme;
  /** The faces the file declares (`font()`, `googleFont()`), which every renderer loads. */
  readonly fonts: readonly DeclaredFont[];
  /** The effects and transitions the file declares (`effect()`, `transition()`). */
  readonly shaders: readonly ShaderDefinition[];
  /** The 3D scenes clips play, by the asset id of their frames (a placement's `source.asset`). Absent when none. */
  readonly scenes?: ReadonlyMap<string, SceneUse>;
}

const DEFAULT_OVERLAY_DURATION = 5;
const IMAGE_DEFAULT_DURATION = 5;

/** A source while the resolver works it out: seconds of the asset, which speed ramps and freezes are computed in. */
type PendingSource = Omit<PlacementSource, "range">;

interface Pending {
  readonly node: CollectedNode;
  readonly track: string | null;
  readonly parent: string | null;
  props: Record<string, unknown>;
  errors: ResolveError[];
  source: PendingSource | undefined;
  /** Intrinsic length, when it does not depend on other elements. */
  duration: Time | undefined;
  durationDep:
    | { kind: "match"; id: string }
    | { kind: "until"; id: string; at?: string }
    | { kind: "fill" }
    | undefined;
  start: Time | undefined;
  /** `at` is a word, shot or silence of the anchor's source: the start is where the anchor plays it, plus `offset`. */
  anchorDep: { id: string | "start"; offset: Time; edge?: "end"; at?: string } | undefined;
  between: readonly [string, string] | undefined;
  /** Set on an element of a settled track (`settledByTrack`): it is frozen, and holds what it was last placed as. */
  readonly settled: { placed?: Placed; end?: Time | null; readonly reads?: readonly Read[] } | undefined;
}

/**
 * A `Pending` with nothing worked out yet. Every one is made here, with every field in the same order, and a field
 * that is given up is set to undefined, not deleted: the resolver reads these fields of every element in loops, and
 * objects of one shape are read several times faster than objects of many.
 */
function pendingOf(
  node: CollectedNode,
  track: string | null,
  parent: string | null,
  props: Record<string, unknown>,
  errors: ResolveError[],
): Pending {
  return {
    node,
    track,
    parent,
    props,
    errors,
    source: undefined,
    duration: undefined,
    durationDep: undefined,
    start: undefined,
    anchorDep: undefined,
    between: undefined,
    settled: undefined,
  };
}

/** An element another one waited on, by the id it was named with: the `Pending` it had then, or none. */
interface Read {
  readonly id: string;
  readonly was: Pending | undefined;
}

/** What placing a settled element gave: its placement, those of everything inside it, and the errors, in order. */
interface Placed {
  readonly placement: Placement;
  readonly inside: readonly Placement[];
  readonly errors: readonly ResolveError[];
  /** The latest tick any of those placements reaches. */
  readonly far: number;
  /** Where the element ends, when it makes the video at least that long: not for a transition or one of no length. */
  readonly ends: Time | null;
  /** What the checks after placing find in those placements: null for nothing, not set until they are run. */
  found?: Found | null;
}

/**
 * What the checks that read placed items find in a run of them: the errors of the texture, key and generator checks,
 * and the elements that follow another, each in the items' order.
 */
interface Found {
  readonly texture: readonly ResolveError[];
  readonly keys: readonly ResolveError[];
  readonly generators: readonly ResolveError[];
  readonly followers: readonly Placement[];
}

const NOTHING: readonly never[] = [];

/**
 * Runs the texture, key and generator checks on a run of placements that are in `items` with everything they are
 * inside of, and lists the followers among them. Null when none of them is an effect, a key, a generator or a follower.
 */
function findIn(
  first: Placement,
  rest: readonly Placement[],
  items: ReadonlyMap<string, Placement>,
  manifest: AssetManifest,
): Found | null {
  let effects: Placement[] | undefined;
  let keyframes: Placement[] | undefined;
  let generators: Placement[] | undefined;
  let followers: Placement[] | undefined;
  for (let i = -1; i < rest.length; i++) {
    const item = i < 0 ? first : (rest[i] as Placement);
    if (item.kind === "effect") (effects ??= []).push(item);
    else if (item.kind === "keyframe") (keyframes ??= []).push(item);
    else if (item.kind === "generator") (generators ??= []).push(item);
    if (FOLLOW_KINDS.has(item.kind) && followOf(item) !== undefined) (followers ??= []).push(item);
  }
  if (!effects && !keyframes && !generators && !followers) return null;
  return {
    texture: effects ? textureErrors(effects, manifest) : NOTHING,
    keys: keyframes ? keyframeErrors(keyframes, items) : NOTHING,
    generators: generators ? generatorErrors(generators, items) : NOTHING,
    followers: followers ?? NOTHING,
  };
}

/** The later of two times: `Time.max` of two, without the list it takes its arguments as. */
const later = (a: Time, b: Time): Time => (b.isAfter(a) ? b : a);

const childIdsOf = new Cache<CollectedNode, readonly string[]>();

/** The ids of a node's children, in order. Kept by node: every resolve lists them for each track and placement. */
function childIds(node: CollectedNode): readonly string[] {
  let ids = childIdsOf.get(node);
  if (!ids) {
    ids = node.children.map((c) => c.id);
    childIdsOf.set(node, ids);
  }
  return ids;
}

/**
 * A track whose elements nothing outside the track decides: each has its start and length from the track's own order
 * and its own props, and none waits on an anchor, a match, an until or the video's length. Their `Pending`s are kept
 * by the track's node, so a resolve after an edit elsewhere takes them as they are, placed.
 *
 * It holds for the node (the overlay and the key expansion keep the node of a track no patch reached) and for what
 * the elements were read against: the theme, the manifest, the markers, the composition's parsed props (a `frame`
 * is cut to its size) and the file's shaders. Any of those changing makes it again.
 */
interface SettledTrack {
  readonly theme: ResolvedTheme;
  readonly manifest: AssetManifest;
  readonly markersKey: string;
  readonly composition: Record<string, unknown>;
  readonly shaders: readonly ShaderDefinition[] | undefined;
  readonly pendings: readonly Pending[];
  /** Where the last of them that shows or sounds ends: what the track adds to the video's length. */
  readonly end: Time;
  readonly layout: TrackLayout;
  /** The track's children the `pendings` are of, in order. */
  readonly children: readonly CollectedNode[];
  /** Where the placing stood after each child. */
  readonly stood: readonly TrackCursor[];
  /** The latest tick the placing reached: a cursor, or an element's end. */
  readonly far: number;
  /**
   * Which of `pendings` waited on another element (an anchor, a match, an until): each has its `reads`, the elements
   * it waited on as they were. Such an element holds while each of those is still that same settled element:
   * `Pending`s of settled tracks are frozen, so the same object is the same start, length and source. Empty for a
   * track nothing outside decides.
   */
  readonly readers: readonly number[];
}
const settledByTrack = new Cache<CollectedNode, SettledTrack>();
/**
 * The last settled track under each track id of a file's tree. An edit makes the track's node again with one child
 * changed; what was settled for the others still holds (`takeChanged`).
 */
const lastSettled = new Cache<CollectedTree, Map<string, SettledTrack>>();

/** Where a settled element ends, worked out once: see `endOf`. */
function settledEnd(p: Pending): Time | null {
  const settled = p.settled as NonNullable<Pending["settled"]>;
  if (settled.end === undefined) settled.end = endOf(p);
  return settled.end;
}

/** Marks an element settled: frozen, so nothing that reads it later can change it. */
function freezeSettled(p: Pending, reads?: readonly Read[]): void {
  (p as { settled: Pending["settled"] }).settled = reads && reads.length > 0 ? { reads } : {};
  Object.freeze(p.errors);
  Object.freeze(p);
}

/** A time is a safe whole number of ticks; a placing that reaches the limit is held there, and is not moved by adding. */
const LIMIT = Number.MAX_SAFE_INTEGER;

/** A placement `by` later (or earlier), as placing its element that much later gives it. */
function moved(placement: Placement, by: Time): Placement {
  return { ...placement, range: rangeOf(placement.range.start.plus(by), placement.range.duration) };
}

/**
 * A settled element of a sequence whose start is `ticks` later: everything before it on the track grew by that much.
 * Its placements move with it when none of them is near the limit, and are made again otherwise.
 */
function shifted(old: Pending, ticks: number, by: Time): Pending {
  const p = pendingOf(old.node, old.track, old.parent, old.props, old.errors);
  p.source = old.source;
  p.duration = old.duration;
  const start = (old.start as Time).plus(by);
  p.start = start;
  p.between = old.between;
  const was = old.settled?.placed;
  // The element's placement starts where the element does, and it ends where its placement's range does.
  const placement =
    was && was.far < LIMIT && was.far + ticks < LIMIT
      ? { ...was.placement, range: rangeOf(start, was.placement.range.duration) }
      : undefined;
  (p as { settled: Pending["settled"] }).settled =
    was && placement
      ? {
          placed: {
            placement,
            inside: was.inside.length > 0 ? was.inside.map((inner) => moved(inner, by)) : was.inside,
            errors: was.errors,
            far: was.far + ticks,
            ends: was.ends ? placement.range.end : null,
            // The followers among them are these placements, moved: found again when they are put back.
            ...(was.found === null ? { found: null } : {}),
          },
        }
      : {};
  return Object.freeze(p);
}

/** Whether two placings left the same clip behind them, for what the next child reads of it: its id and its length. */
function sameClipBehind(a: Pending | null, b: Pending | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.node.id === b.node.id && a.duration !== undefined && b.duration !== undefined && a.duration.equals(b.duration)
  );
}
/** Counts the `Pending`s one `compute` makes or takes, before it places anything. */
let entered = 0;
/** Counts the `Pending`s made for elements the file does not write: a multicam's clips, captions' cues. */
let made = 0;

/** Where an element that shows or sounds ends, or null for one that has no length or is a transition. */
function endOf(p: Pending): Time | null {
  // Something with no length shows and sounds nothing, so it does not make the video longer.
  return p.start !== undefined && p.duration?.isAfter(Time.ZERO) && p.node.kind !== "transition"
    ? p.start.plusClamped(p.duration)
    : null;
}

const sourceIdsUnique = new WeakMap<CollectedTree, boolean>();
const sceneInside = new Cache<CollectedNode, boolean>();

/** Whether a clip in `node` or under it plays a 3D scene. Kept by node, so an edit looks again only along its path. */
function playsScene(node: CollectedNode, source?: ReadonlyMap<string, CollectedNode>): boolean {
  const known = sceneInside.get(node);
  if (known !== undefined) return known;
  let found = node.kind === "clip" && isScene(node.props.src);
  // A node made again from one with no scene inside has none in the children it kept: only the others are asked.
  const was = source?.get(node.id);
  const before = was ? expansionOf(was) : undefined;
  const kept = before && before !== node && sceneInside.get(before) === false ? before : undefined;
  for (let i = 0; !found && i < node.children.length; i++) {
    const child = node.children[i] as CollectedNode;
    if (kept && kept.children[i] === child) continue;
    found = playsScene(child, source);
  }
  // A node the log made again is not seen a second time: only one that stays is worth keeping the answer for.
  if (!before || before === node) sceneInside.set(node, found);
  return found;
}

/**
 * The expanded root of `written`, when the tree can be placed by walking it: then `tree.byId.get(track.id)` is the
 * track's own node for every track, and the manifest needs no scene assets. Null when it cannot, and the tree is
 * placed with its `byId`. It can when
 *
 * - the file gives each id to one node (`collect` reports a second use as `DUPLICATE_ID`), and the log only patches
 *   props and text, so the written tree has the file's ids;
 * - no track's id has a dot in it: an item made from a prop is named `<element>.<path>`, so none can take such an id;
 * - no clip plays a scene.
 */
function walkable(original: CollectedTree, written: CollectedTree): CollectedNode | null {
  if (written !== original && !sameIdsAsSource(written)) return null;
  let unique = sourceIdsUnique.get(original);
  if (unique === undefined) {
    unique = !original.errors.some((e) => e.code === "DUPLICATE_ID");
    sourceIdsUnique.set(original, unique);
  }
  if (!unique) return null;
  const source = layersIn(written)?.base;
  const root = expandedRoot(written.root, source);
  const dotted = (track: CollectedNode): boolean => track.id.includes(".");
  for (const child of root.children) {
    if (child.kind === "track" && dotted(child)) return null;
    if (child.kind === "camera")
      for (const inner of child.children) if (inner.kind === "track" && dotted(inner)) return null;
  }
  return playsScene(root, source) ? null : root;
}

/** Whether every track of the composition, those in its camera among them, has an id of its own. */
function uniqueTracks(root: CollectedNode): boolean {
  const ids = new Set<string>();
  let count = 0;
  const add = (track: CollectedNode): void => {
    count++;
    ids.add(track.id);
  };
  for (const child of root.children) {
    if (child.kind === "track") add(child);
    else if (child.kind === "camera") for (const inner of child.children) if (inner.kind === "track") add(inner);
  }
  return ids.size === count;
}

/**
 * Whether `p` has come to what it will be, once the anchors, matches and fills are worked out: it has a start and a
 * length and waits on nothing, and is not one of the kinds a settled track cannot hold. An element that waited on
 * the video's length is not asked: its length is the whole file's to say.
 */
function isFinal(p: Pending): boolean {
  return (
    p.start !== undefined &&
    p.duration !== undefined &&
    !p.durationDep &&
    p.props.duck === undefined &&
    !isScene(p.props.src) &&
    p.node.kind !== "multicam" &&
    p.node.kind !== "captions" &&
    p.node.kind !== "caption"
  );
}

/** Whether nothing outside its track decides `p`, now that the track is placed: see `SettledTrack`. */
function isSettled(p: Pending): boolean {
  return (
    p.start !== undefined &&
    p.duration !== undefined &&
    !p.anchorDep &&
    !p.durationDep &&
    // A duck names a track by id or role, which another track's props decide; a scene is placed with the markers.
    p.props.duck === undefined &&
    !isScene(p.props.src) &&
    p.node.kind !== "multicam" &&
    p.node.kind !== "captions" &&
    p.node.kind !== "caption"
  );
}

interface Memo {
  readonly tree: CollectedTree;
  readonly manifest: AssetManifest;
  readonly version: number;
  readonly state: ResolvedState;
}
const byLog = new WeakMap<PatchLog, Memo>();
const byTree = new WeakMap<CollectedTree, Memo>();

/** Absolute placements for every element, computed from the tree, the manifests and the patch log. Memoised per log on its version. */
export function resolve(tree: CollectedTree, manifest: AssetManifest, log?: PatchLog): ResolvedState {
  const cached = log ? byLog.get(log) : byTree.get(tree);
  if (cached && cached.tree === tree && cached.manifest === manifest && cached.version === (log?.version ?? -1))
    return cached.state;
  // A log's first resolve may still reuse the plain resolve of the same tree.
  const previous = cached?.state.items ?? (log ? byTree.get(tree)?.state.items : undefined);
  const state = compute(tree, manifest, log, previous);
  const memo: Memo = { tree, manifest, version: log?.version ?? -1, state };
  if (log) byLog.set(log, memo);
  else byTree.set(tree, memo);
  return state;
}

/**
 * The same answer as `resolve`, worked out from the tree and the log alone: no cache is read or written and no
 * earlier placement is handed back. Slow; it is what the tests hold a cached resolve to.
 */
export function resolveFresh(tree: CollectedTree, manifest: AssetManifest, log?: PatchLog): ResolvedState {
  return uncached(() => compute(tree, manifest, log));
}

/**
 * `previous` is the item map of the last resolve on the same log. A placement
 * equal to its predecessor is returned as the same object, so a drag step
 * allocates only for the elements it moved and consumers can memoise on
 * `Placement` identity.
 */
function compute(
  original: CollectedTree,
  manifest: AssetManifest,
  log: PatchLog | undefined,
  previous?: ReadonlyMap<string, Placement>,
  /** Without settled tracks: the way back when two elements turn out to share an id (see `clash` below). */
  plain = false,
): ResolvedState {
  // The tree as written, with the log over it: what the editor reads and writes. Its key lists, effects, speed keys
  // and holds are expanded into items for placing.
  const written = overlay(original, log);
  // The tree's `byId` is not needed to place it when each track is found from the root and no clip plays a scene:
  // see `walkable`. Then the keys are expanded from the root alone, and nothing copies the map.
  const walked = plain || cachesOff() ? null : walkable(original, written);
  const tree = walked ? null : expandKeys(written);
  if (walked) shortCuts.walked++;
  fileShaders = original.shaders ?? [];
  const errors: ResolveError[] = [...written.errors];
  const root = walked ?? (tree as CollectedTree).root;
  const theme = resolveTheme(root.props.theme);
  const compParsed = parseProps(root, errors, theme);
  // A clip that plays a 3D scene reads its length from an asset made for it (`withSceneAssets`).
  if (tree)
    manifest = withSceneAssets(manifest, tree, {
      fps: rateValue(rateOf(compParsed.fps, root.id, [])),
      width: Number(compParsed.width ?? 1920),
      height: Number(compParsed.height ?? 1080),
    });
  const scenes = new Map<string, SceneUse>();
  const markers = new Map<string, number>();
  const pending = new Map<string, Pending>();
  const tracks: ResolvedTrack[] = [];
  const reuse = (placement: Placement): Placement => {
    const prev = previous?.get(placement.id);
    return prev && samePlacement(prev, placement) ? prev : placement;
  };
  // Decide reuse before allocating: for an untouched element the previous placement is returned without building a new one.
  const place = (
    node: CollectedNode,
    track: string | null,
    parent: string | null,
    start: Time,
    length: Time,
    props: Record<string, unknown>,
    errors: readonly ResolveError[],
    pendingSource: PendingSource | undefined,
    between: Placement["between"],
  ): Placement => {
    const range = rangeOf(start, length);
    const prev = previous?.get(node.id);
    // What an element that only moved keeps of its last placement: the source it plays and its children's ids.
    const sourceKept = prev !== undefined && sameSource(prev.source, pendingSource);
    const childrenKept = prev !== undefined && sameChildIds(prev.children, node.children);
    if (
      prev &&
      prev.kind === node.kind &&
      prev.track === track &&
      prev.parent === parent &&
      prev.range.equals(range) &&
      prev.props === props &&
      prev.editable === node.editable &&
      prev.lockedProps === node.lockedProps &&
      prev.boundProps === node.boundProps &&
      sourceKept &&
      sameBetween(prev.between, between) &&
      prev.interior === node.interior &&
      childrenKept &&
      sameErrors(prev.errors, errors)
    )
      return prev;
    // Only a placement whose source changed works out the source's range.
    const source = sourceKept ? prev.source : withRange(pendingSource);
    const themed = themedByData.get(props);
    const placement: { -readonly [K in keyof Placement]: Placement[K] } = {
      id: node.id,
      kind: node.kind,
      track,
      parent,
      children: childrenKept ? prev.children : childIds(node),
      range,
      props,
      editable: node.editable,
      lockedProps: node.lockedProps,
      boundProps: node.boundProps,
      errors,
    };
    if (source) placement.source = source;
    if (between) placement.between = between;
    if (node.interior) placement.interior = node.interior;
    if (themed) placement.themed = themed;
    return placement;
  };

  for (const child of root.children) {
    if (child.kind === "marker") {
      // A failed parse returns the raw props; the schema error already names a non-numeric `start`.
      const start = parseProps(child, errors, theme).start;
      if (typeof start === "number") markers.set(child.id, start);
    }
  }

  const markersKey = markersSignature(markers);
  const shaders = original.shaders;
  // Two tracks with one id are placed as one, twice: nothing of theirs is kept.
  const settling = !plain && !cachesOff() && (walked !== null || uniqueTracks(root));
  /** Each track's node, in the order of `tracks`. */
  const trackNodes: CollectedNode[] = [];
  /** The tracks taken as they were settled, which are not placed again. */
  const taken = new Set<CollectedNode>();
  /** Every settled track of this resolve: those taken, and those settled now. */
  const settledTracks: SettledTrack[] = [];
  let lasts = settling ? lastSettled.get(original) : undefined;
  if (settling && !lasts) {
    lasts = new Map();
    lastSettled.set(original, lasts);
  }
  /** Keeps a track's settled elements by its node, and as the last under its id. */
  const keep = (
    node: CollectedNode,
    layout: TrackLayout,
    pendings: readonly Pending[],
    stood: readonly TrackCursor[],
  ) => {
    let end = Time.ZERO;
    let far = 0;
    let readers: number[] | undefined;
    for (let i = 0; i < pendings.length; i++) {
      const p = pendings[i] as Pending;
      const at = settledEnd(p);
      if (at) end = later(end, at);
      far = Math.max(far, (p.start as Time).ticks + (p.duration as Time).ticks, (stood[i] as TrackCursor).cursor.ticks);
      if (p.settled?.reads) (readers ??= []).push(i);
    }
    const settled: SettledTrack = {
      theme,
      manifest,
      markersKey,
      composition: compParsed,
      shaders,
      pendings,
      end,
      layout,
      children: node.children,
      stood,
      far,
      readers: readers ?? NOTHING,
    };
    settledByTrack.set(node, settled);
    lasts?.set(node.id, settled);
    settledTracks.push(settled);
    done.add(node);
  };
  /** The tracks kept as settled in this resolve, by `keep`. */
  const done = new Set<CollectedNode>();
  /**
   * The tracks taken with elements that waited on others (`reads`), or with a changed element that waits: their
   * elements are in `pending`, and they are kept once the others are seen to be who they were and the changed one
   * has come to its place.
   */
  const open = new Map<CollectedNode, { layout: TrackLayout; pendings: Pending[]; stood: readonly TrackCursor[] }>();
  /** The track each track node is, for placing one of its children again. */
  const trackOf = new Map<CollectedNode, ResolvedTrack>();
  /**
   * Takes a track that was settled before one of its children changed: the children before the change keep what
   * they came to, the changed ones are placed from where the placing stood, and it stops where the placing stands as
   * it did the last time, with the rest as they were. On a sequence, when it stands as it did but later or earlier
   * (a trim), the rest are the same elements moved by that much. False when the track cannot be taken this way.
   */
  const takeChanged = (node: CollectedNode, track: ResolvedTrack): boolean => {
    const last = lasts?.get(node.id);
    const kids = node.children;
    const n = kids.length;
    if (
      !last ||
      last.theme !== theme ||
      last.manifest !== manifest ||
      last.markersKey !== markersKey ||
      last.composition !== compParsed ||
      last.shaders !== shaders ||
      last.layout !== track.layout ||
      last.children.length !== n
    )
      return false;
    let from = 0;
    while (from < n && kids[from] === last.children[from]) from++;
    let pendings: Pending[];
    let stood: TrackCursor[];
    let derived = 0;
    /** Whether a changed element waits on another: the track is kept after the anchors are worked out. */
    let waitsHere = false;
    if (from === n) {
      pendings = last.pendings as Pending[];
      stood = last.stood as TrackCursor[];
    } else {
      let to = n - 1;
      while (to > from && kids[to] === last.children[to]) to--;
      // Start where no transition waits for its second clip: one that does is placed again with the clip.
      while (from > 0 && (last.stood[from - 1] as TrackCursor).open) from--;
      const scratch = new Map<string, Pending>();
      const mark = entered;
      const placer = new TrackPlacer(track, scratch, theme, errors);
      if (from > 0) placer.resume(last.stood[from - 1] as TrackCursor);
      const fresh: Pending[] = [];
      const freshStood: TrackCursor[] = [];
      let met = -1;
      let ticks = 0;
      for (let i = from; i < n; i++) {
        const kid = kids[i] as CollectedNode;
        // These make elements of their own, or wait on the video's length: the track is not a settled one.
        if (kid.kind === "multicam" || kid.kind === "captions" || kid.kind === "caption") break;
        intrinsic(kid, node.id, scratch, manifest, markers, markersKey, theme, errors, kid === last.children[i]);
        const p = scratch.get(kid.id);
        if (!p || p.node !== kid || p.props.duck !== undefined) break;
        if (p.props.frame && p.source) p.props = framed(p.props, manifest.assets[p.source.asset], compParsed);
        placer.step(kid);
        const now = placer.at();
        fresh.push(p);
        freshStood.push(now);
        if (i < to) continue;
        const was = last.stood[i] as TrackCursor;
        if (now.open || was.open || !now.intoPrev.equals(was.intoPrev) || !sameClipBehind(now.prevClip, was.prevClip))
          continue;
        const later = now.cursor.ticks - was.cursor.ticks;
        // Later or earlier on a sequence, every start after this is the cursor's (none is anchored: the track read
        // no other element): unless one would reach the limit.
        const movable = track.layout === "sequence" && last.readers.length === 0 && last.far < LIMIT;
        if (later === 0 || (movable && last.far + later < LIMIT)) {
          met = i;
          ticks = later;
          break;
        }
      }
      const reached = met >= 0 ? met + 1 : n;
      if (from + fresh.length !== reached) {
        entered = mark;
        return false;
      }
      if (met < 0) placer.finish();
      for (const p of fresh) {
        if (isSettled(p)) continue;
        // One that waits on another element is worked out with the rest and kept after; any other is not settled.
        const waits = p.anchorDep !== undefined || p.durationDep?.kind === "match" || p.durationDep?.kind === "until";
        if (!waits || p.durationDep?.kind === "fill" || isScene(p.props.src) || ticks !== 0) {
          entered = mark;
          return false;
        }
        waitsHere = true;
      }
      for (const p of fresh) if (isSettled(p)) freezeSettled(p);
      derived = fresh.length;
      pendings = last.pendings.slice(0, from);
      stood = last.stood.slice(0, from);
      for (const p of fresh) pendings.push(p);
      for (const at of freshStood) stood.push(at);
      if (ticks === 0) shortCuts.tracksChanged++;
      else shortCuts.tracksShifted++;
      if (ticks === 0) {
        for (let i = reached; i < n; i++) {
          pendings.push(last.pendings[i] as Pending);
          stood.push(last.stood[i] as TrackCursor);
        }
      } else {
        const by = Time.ofTicks(ticks);
        for (let i = reached; i < n; i++) {
          pendings.push(shifted(last.pendings[i] as Pending, ticks, by));
          const was = last.stood[i] as TrackCursor;
          stood.push({ cursor: was.cursor.plus(by), prevClip: was.prevClip, intoPrev: was.intoPrev, open: was.open });
        }
      }
    }
    for (const p of pendings) pending.set(p.node.id, p);
    entered += n - derived;
    taken.add(node);
    if (last.readers.length > 0 || waitsHere)
      open.set(node, {
        layout: track.layout,
        pendings: pendings === last.pendings ? pendings.slice() : pendings,
        stood,
      });
    else keep(node, track.layout, pendings, stood);
    return true;
  };
  /** Gives back a track taken as settled: its elements are derived again, and it is placed with the rest. */
  const giveBack = (node: CollectedNode): void => {
    taken.delete(node);
    open.delete(node);
    const kept = settledByTrack.get(node);
    const at = kept ? settledTracks.indexOf(kept) : -1;
    if (at >= 0) settledTracks.splice(at, 1);
    done.delete(node);
    entered -= node.children.length;
    for (const item of node.children) intrinsic(item, node.id, pending, manifest, markers, markersKey, theme, errors);
  };
  /** Whether every element `reads` names is still the settled element it was. */
  const holds = (reads: readonly Read[]): boolean => {
    for (const read of reads) if (pending.get(read.id) !== read.was) return false;
    return true;
  };
  /**
   * Derives one element of a taken track again, in its place, because an element it waited on changed. It can when
   * placing it leaves the track's placing where it stood (an anchored element, or one on a free track): then nothing
   * else on the track is touched. False when it cannot, and the whole track is given back.
   */
  const refresh = (node: CollectedNode, taking: { pendings: Pending[]; stood: readonly TrackCursor[] }, i: number) => {
    const track = trackOf.get(node);
    const before = i > 0 ? (taking.stood[i - 1] as TrackCursor) : STARTING;
    if (!track || before.open || !standsAs(taking.stood[i] as TrackCursor, before)) return false;
    const kid = node.children[i] as CollectedNode;
    one.clear();
    const mark = entered;
    intrinsic(kid, node.id, one, manifest, markers, markersKey, theme, errors);
    entered = mark;
    const p = one.get(kid.id);
    if (!p || p.node !== kid || p.props.duck !== undefined) return false;
    if (p.props.frame && p.source) p.props = framed(p.props, manifest.assets[p.source.asset], compParsed);
    const placer = new TrackPlacer(track, one, theme, errors);
    placer.resume(before);
    placer.step(kid);
    if (!standsAs(placer.at(), before)) return false;
    taking.pendings[i] = p;
    pending.set(kid.id, p);
    return true;
  };
  /** Where `refresh` derives its one element. */
  const one = new Map<string, Pending>();
  /**
   * Looks at every taken track's elements that waited on others: one whose others are no longer who they were is
   * derived again, or its track given back. Each makes new elements, which others may have waited on, so it looks
   * until nothing changes.
   */
  const settleReaders = (): void => {
    for (let again = true; again; ) {
      again = false;
      for (const node of [...taken]) {
        let taking = open.get(node);
        const kept = taking ? undefined : settledByTrack.get(node);
        if (!taking && (!kept || kept.readers.length === 0)) continue;
        const count = taking ? taking.pendings.length : (kept as SettledTrack).readers.length;
        for (let k = 0; k < count; k++) {
          const i = kept ? (kept.readers[k] as number) : k;
          const p = (taking ? taking.pendings[i] : (kept as SettledTrack).pendings[i]) as Pending;
          const reads = p.settled?.reads;
          if (!reads || holds(reads)) continue;
          again = true;
          if (!taking) {
            const whole = kept as SettledTrack;
            taking = { layout: whole.layout, pendings: whole.pendings.slice(), stood: whole.stood };
            open.set(node, taking);
            const at = settledTracks.indexOf(whole);
            if (at >= 0) settledTracks.splice(at, 1);
            done.delete(node);
          }
          if (refresh(node, taking, i)) shortCuts.refreshed++;
          else {
            giveBack(node);
            shortCuts.givenBack++;
            break;
          }
        }
      }
    }
  };
  /** Whether every taken track's elements still read who they read: asked again once a multicam has made its clips. */
  const readersHold = (): boolean => {
    for (const node of taken) {
      const pendings = open.get(node)?.pendings ?? settledByTrack.get(node)?.pendings ?? [];
      for (const p of pendings) if (p.settled?.reads && !holds(p.settled.reads)) return false;
    }
    return true;
  };
  // How many elements are given a `Pending`: more than `pending` holds when two share an id.
  entered = 0;
  let order = 0;
  // A camera's tracks are numbered in place, so the file's order is the drawing order across the camera's edge.
  const addTrack = (child: CollectedNode, camera: string | undefined): void => {
    trackNodes.push(child);
    const p = parseProps(child, errors, theme);
    tracks.push({
      id: child.id,
      layout: (p.layout as TrackLayout) ?? "sequence",
      order: order++,
      locked: Boolean(p.locked),
      hidden: Boolean(p.hidden),
      muted: Boolean(p.muted),
      solo: Boolean(p.solo),
      ...(typeof p.role === "string" ? { role: p.role as TrackRole } : {}),
      ...(typeof p.group === "string" ? { group: p.group } : {}),
      ...(camera !== undefined ? { camera } : {}),
      ...(child.implicit ? { implicit: true as const } : {}),
      items: childIds(child),
    });
    trackOf.set(child, tracks[tracks.length - 1] as ResolvedTrack);
    const kept = settling ? settledByTrack.get(child) : undefined;
    if (
      kept &&
      kept.theme === theme &&
      kept.manifest === manifest &&
      kept.markersKey === markersKey &&
      kept.composition === compParsed &&
      kept.shaders === shaders
    ) {
      for (const settled of kept.pendings) pending.set(settled.node.id, settled);
      entered += kept.pendings.length;
      taken.add(child);
      settledTracks.push(kept);
      done.add(child);
      lasts?.set(child.id, kept);
      shortCuts.tracksTaken++;
      return;
    }
    if (settling && takeChanged(child, tracks[tracks.length - 1] as ResolvedTrack)) return;
    for (const item of child.children) intrinsic(item, child.id, pending, manifest, markers, markersKey, theme, errors);
  };
  let camera: CollectedNode | undefined;
  for (const child of root.children) {
    if (child.kind === "track") {
      addTrack(child, undefined);
    } else if (child.kind === "camera") {
      if (camera) {
        errors.push({
          code: "INVALID_CHILD",
          id: child.id,
          message: `a composition has one <Camera>: move these tracks into <Camera id="${camera.id}">, or out of a camera`,
        });
      } else camera = child;
      for (const inner of child.children) {
        if (inner.kind === "track") addTrack(inner, camera.id);
        else if (!DERIVED_KINDS.has(inner.kind))
          errors.push({
            code: "INVALID_CHILD",
            id: inner.id,
            message:
              inner.kind === "camera"
                ? "a <Camera> cannot hold another <Camera>"
                : `<Camera> holds <Track>s only: put <${inner.kind}> in a <Track>, or outside the camera`,
          });
      }
    } else if (child.kind === "captions") {
      intrinsic(child, null, pending, manifest, markers, markersKey, theme, errors);
    } else if (child.kind === "multicam") {
      errors.push({ code: "INVALID_CHILD", id: child.id, message: "<Multicam> belongs inside a <Track>" });
    } else if (MAIN_KINDS.has(child.kind)) {
      // Left here only when the id "main" is taken, which `collect` has reported.
    } else if (child.kind !== "marker") {
      errors.push({
        code: "INVALID_CHILD",
        id: child.id,
        message: `<Composition> cannot contain <${child.kind}>: put it in a <Track>`,
      });
    }
  }

  // Two elements with one id share a `Pending`, and a settled track's would be taken over by another track's: place
  // everything the plain way, which is what says what such a file comes to.
  // A taken track's element that waited on another holds only while that other is still who it was.
  if (taken.size > 0) settleReaders();
  if (taken.size > 0 && pending.size !== entered) {
    shortCuts.plain++;
    return compute(original, manifest, log, previous, true);
  }

  // The elements still to be worked out: every one but a settled track's. The loops below read these, in the order
  // `pending` holds them, and leave the settled ones alone.
  let moving: Pending[] = [];
  const listMoving = (): void => {
    moving = [];
    for (const p of pending.values()) if (!p.settled) moving.push(p);
  };
  listMoving();

  for (const p of moving) {
    const duck = p.props.duck as { under: string } | undefined;
    if (duck && !tracks.some((t) => t.id === duck.under || t.role === duck.under)) {
      p.errors.push({
        code: "UNKNOWN_REF",
        id: p.node.id,
        prop: "duck.under",
        message: `duck.under "${duck.under}" is neither a track id nor a track role`,
      });
    }
    if (p.props.frame && p.source) p.props = framed(p.props, manifest.assets[p.source.asset], compParsed);
  }

  /** Where the placing of each track placed here stood after each child. */
  const stoodBy = new Map<CollectedNode, TrackCursor[]>();
  const madeBefore = made;
  // Place track children: sequence cursors, free starts; anchors and dependent durations by iteration.
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i] as ResolvedTrack;
    // The node the tree has under the track's id: the track's own, unless another node took the id.
    const trackNode = tree ? tree.byId.get(track.id) : trackNodes[i];
    if (!trackNode || taken.has(trackNode)) continue;
    const stood: TrackCursor[] | undefined = settling ? [] : undefined;
    placeTrack(trackNode, track, pending, theme, errors, stood);
    if (!stood) continue;
    stoodBy.set(trackNode, stood);
    // Settled when every child is, and is its own: one that shares an id with an element elsewhere is not.
    const pendings: Pending[] = [];
    for (const child of trackNode.children) {
      const p = pending.get(child.id);
      if (!p || p.node !== child || !isSettled(p)) break;
      pendings.push(p);
    }
    if (pendings.length !== trackNode.children.length || pendings.length === 0) continue;
    for (const p of pendings) freezeSettled(p);
    keep(trackNode, track.layout, pendings, stood);
  }
  // A multicam's clips are elements now: an anchor that named one, and was kept as naming nothing, no longer holds.
  if (made !== madeBefore && !readersHold()) {
    shortCuts.plain++;
    return compute(original, manifest, log, previous, true);
  }
  // The tracks settled just now are out of it, and a multicam's clips are in.
  listMoving();
  // The elements that wait on another, or on the video's length: the only ones the passes below can change.
  const waiting = moving.filter((p) => p.anchorDep !== undefined || p.durationDep !== undefined);
  // Who each waits on, before the passes take the waiting away: what a track kept after them holds for.
  const readBy = new Map<Pending, Read[]>();
  const filling = new Set<Pending>();
  if (settling)
    for (const p of waiting) {
      const reads: Read[] = [];
      if (p.anchorDep && p.anchorDep.id !== "start")
        reads.push({ id: p.anchorDep.id, was: pending.get(p.anchorDep.id) });
      const length = p.durationDep;
      if (length?.kind === "fill") filling.add(p);
      else if (length) reads.push({ id: length.id, was: pending.get(length.id) });
      readBy.set(p, reads);
    }
  iterateDependencies(waiting, pending, manifest);
  const before = made;
  placeCaptions(root, pending, tracks, manifest, markers);
  if (made !== before) listMoving();

  let compositionEnd = Time.ZERO;
  for (const settled of settledTracks) compositionEnd = later(compositionEnd, settled.end);
  for (const waitingTrack of open.values())
    for (const p of waitingTrack.pendings) {
      const at = p.settled ? settledEnd(p) : null;
      if (at) compositionEnd = later(compositionEnd, at);
    }
  for (const p of moving) {
    const at = endOf(p);
    if (at) compositionEnd = later(compositionEnd, at);
  }
  for (const p of waiting) {
    if (p.durationDep?.kind === "fill" && p.start !== undefined) {
      p.duration = Time.max(Time.ZERO, compositionEnd.minus(p.start));
      if (p.source) {
        let out = p.source.in + sourceSpan(p.node, p.duration.toSeconds(), p.source.speed);
        // A file cannot fill more time than it holds: it plays to its end and stops there.
        const asset = lookupAsset(manifest, p.source.asset);
        // (A multicam's last generated clip is left as it is: its angles are cut to the multicam's own length.)
        const generated = pending.get(p.parent ?? "")?.node.kind === "multicam";
        if (asset && asset.kind !== "image" && !generated && out > asset.duration + 0.05) {
          const keys = speedKeysOf(p.node.children);
          const left = Math.max(0, asset.duration - p.source.in);
          const natural = keys.length > 0 ? rampInverse(keys, left) : left / p.source.speed;
          const length = natural + holdTotal(reachedHolds(freezeHoldsOf(p.node.children), natural));
          p.errors.push({
            code: "TRIM_PAST_SOURCE",
            id: p.node.id,
            prop: "duration",
            message: `${asset.id} is ${round3(asset.duration)}s long and cannot fill ${round3(p.duration.toSeconds())}s: it ends ${round3(p.duration.toSeconds() - length)}s before the video does`,
          });
          p.duration = T(length);
          out = asset.duration;
        }
        p.source = { ...p.source, out };
      }
      p.durationDep = undefined;
    }
  }
  // An element that matches a filling one could not take its length until now.
  settleMatches(waiting, pending, manifest);
  for (const p of moving) {
    if (p.start === undefined || p.duration === undefined) {
      p.errors.push({
        code: p.anchorDep ? "DANGLING_ANCHOR" : "MISSING_START",
        id: p.node.id,
        message: `could not place <${p.node.kind} id="${p.node.id}">`,
      });
      p.start ??= Time.ZERO;
      p.duration ??= Time.ZERO;
    }
  }

  // A track whose elements have all come to their places, some by waiting on others, is kept with who they waited
  // on: it holds for a later resolve where those are the same settled elements. One with an element that waited on
  // the video's length, or that is not placed, is not kept.
  if (settling)
    for (let i = 0; i < tracks.length; i++) {
      const trackNode = tree ? tree.byId.get((tracks[i] as ResolvedTrack).id) : trackNodes[i];
      if (!trackNode || done.has(trackNode)) continue;
      const waitingTrack = open.get(trackNode);
      const stood = waitingTrack?.stood ?? stoodBy.get(trackNode);
      if (!stood || trackNode.children.length === 0) continue;
      if (taken.has(trackNode) && !waitingTrack) continue;
      const pendings: Pending[] = [];
      for (const child of trackNode.children) {
        const p = pending.get(child.id);
        if (!p || p.node !== child || !(p.settled || (isFinal(p) && !filling.has(p)))) break;
        pendings.push(p);
      }
      if (pendings.length !== trackNode.children.length) continue;
      for (const p of pendings) if (!p.settled) freezeSettled(p, readBy.get(p));
      keep(trackNode, (tracks[i] as ResolvedTrack).layout, pendings, stood);
    }

  const items = new Map<string, Placement>();
  // The composition, its tracks and its markers are addressable too: the inspector edits them by id.
  const structural: Placement[] = [];
  const structuralTrack = (child: CollectedNode, parent: string): void => {
    const own: ResolveError[] = [];
    const props = parseProps(child, own, theme);
    structural.push({
      id: child.id,
      kind: "track",
      track: child.id,
      parent,
      children: childIds(child),
      range: TimeRange.EMPTY,
      props,
      editable: child.editable,
      lockedProps: child.lockedProps,
      boundProps: child.boundProps,
      errors: own,
      ...themedField(props),
    });
  };
  for (const child of root.children) {
    if (child.kind === "track") {
      structuralTrack(child, root.id);
    } else if (child.kind === "camera") {
      const own: ResolveError[] = [];
      const props = parseProps(child, own, theme);
      structural.push({
        id: child.id,
        kind: "camera",
        track: null,
        parent: root.id,
        children: childIds(child),
        range: TimeRange.EMPTY,
        props,
        editable: child.editable,
        lockedProps: child.lockedProps,
        boundProps: child.boundProps,
        errors: own,
        ...themedField(props),
      });
      for (const inner of child.children) {
        if (inner.kind === "track") structuralTrack(inner, child.id);
        else if (inner.kind === "keyframe") {
          // The camera's keys are on the video's clock: `at` is seconds from its start.
          const keyErrors: ResolveError[] = [];
          const keyProps = parseProps(inner, keyErrors, theme);
          const at = T(lengthOr(keyProps.at, 0));
          structural.push(place(inner, null, child.id, at, Time.ZERO, keyProps, keyErrors, undefined, undefined));
        } else if (inner.kind === "generator") {
          // A generator on a camera value runs for the whole video; its end is set with the camera's.
          const own: ResolveError[] = [];
          structural.push(
            place(
              inner,
              null,
              child.id,
              Time.ZERO,
              Time.ZERO,
              parseProps(inner, own, theme),
              own,
              undefined,
              undefined,
            ),
          );
        }
      }
    } else if (child.kind === "marker") {
      const own: ResolveError[] = [];
      const props = parseProps(child, own, theme);
      const at = T(markers.get(child.id) ?? 0);
      structural.push({
        id: child.id,
        kind: "marker",
        track: null,
        parent: root.id,
        children: [],
        range: rangeOf(at, Time.ZERO),
        props,
        editable: child.editable,
        lockedProps: child.lockedProps,
        boundProps: child.boundProps,
        errors: own,
        ...themedField(props),
      });
    }
  }
  let duration = Time.ZERO;
  // What the checks after placing find, gathered as each element is placed: an element's own run of placements says
  // all the checks read of it, so a settled element is checked once. It holds while every placement is a new id;
  // when one takes another's place (`fresh` below is then more than `items` has), the checks walk the items instead.
  const texture: ResolveError[] = [];
  const keys: ResolveError[] = [];
  const generators: ResolveError[] = [];
  const followers: Placement[] = [];
  const gather = (found: Found | null): void => {
    if (!found) return;
    if (found.texture.length > 0) texture.push(...found.texture);
    if (found.keys.length > 0) keys.push(...found.keys);
    if (found.generators.length > 0) generators.push(...found.generators);
    if (found.followers.length > 0) followers.push(...found.followers);
  };
  /** How many placements were put in `items`, each expected to be a new id. */
  let fresh = 0;
  for (const p of pending.values()) {
    const placed = p.settled?.placed;
    if (placed) {
      const size = items.size;
      items.set(placed.placement.id, placed.placement);
      for (const inner of placed.inside) items.set(inner.id, inner);
      // An id that was already there: the plain way says which of the two the file means.
      if (items.size !== size + 1 + placed.inside.length) {
        shortCuts.plain++;
        return compute(original, manifest, log, previous, true);
      }
      fresh += 1 + placed.inside.length;
      if (placed.found === undefined) placed.found = findIn(placed.placement, placed.inside, items, manifest);
      gather(placed.found);
      if (placed.errors.length > 0) errors.push(...placed.errors);
      if (placed.ends) duration = later(duration, placed.ends);
      continue;
    }
    const start = p.start ?? Time.ZERO;
    const length = p.duration ?? Time.ZERO;
    if (p.source && isScene(p.props.src)) {
      const played = placeScene(
        { id: p.node.id, start: start.toSeconds(), props: p.props, source: p.source },
        manifest,
        markers,
        p.errors,
      );
      if (played) {
        p.source = { ...p.source, asset: played.asset };
        scenes.set(played.asset, played.use);
      }
    }
    const placement = place(p.node, p.track, p.parent, start, length, p.props, p.errors, p.source, p.between);
    const said = errors.length;
    const size = items.size;
    items.set(p.node.id, placement);
    if (p.errors.length > 0) errors.push(...p.errors);
    if (p.node.kind !== "transition" && !placement.range.isEmpty()) duration = later(duration, placement.range.end);
    const inside: Placement[] = p.node.children.length > 0 ? [] : (NOTHING as unknown as Placement[]);
    duration = placeChildren(p.node, placement, items, errors, place, duration, theme, inside);
    fresh += 1 + inside.length;
    const found = findIn(placement, inside, items, manifest);
    gather(found);
    // Kept only when every placement was a new id: one that was not is placed the plain way each time.
    if (p.settled && items.size === size + 1 + inside.length) {
      let far = placement.range.end.ticks;
      for (const inner of inside) far = Math.max(far, inner.range.end.ticks);
      const ends = p.node.kind !== "transition" && !placement.range.isEmpty() ? placement.range.end : null;
      p.settled.placed = { placement, inside, errors: errors.slice(said), far, ends, found };
    }
  }
  /** The placements put in `items` after the elements': the tracks, the camera and its keys, the markers, the root. */
  const after: Placement[] = [];

  for (const s of structural) {
    const item = reuse(
      s.kind === "track" || s.kind === "camera" ? { ...s, range: rangeOf(s.range.start, duration) } : s,
    );
    items.set(s.id, item);
    after.push(item);
    errors.push(...s.errors);
  }
  // A camera's push becomes ordinary camera keys, made once everything it names has a start: the player, the export
  // and the tools then read a pushed camera as they read one keyed by hand.
  const pushed = camera ? items.get(camera.id) : undefined;
  const push = pushed?.props.push as PushSpec | undefined;
  if (camera && pushed && push) {
    const keyed = (["x", "y", "zoom"] as const).filter((f) =>
      pushed.children.some((c) => {
        const item = items.get(c);
        return item?.kind === "keyframe" && item.props.property === `camera.${f}`;
      }),
    );
    if (keyed.length > 0) {
      errors.push({
        code: "SCHEMA",
        id: camera.id,
        prop: "push",
        message: `push sets the camera's x, y and zoom, and ${keyed.join(" and ")} ${keyed.length > 1 ? "have" : "has"} keys of ${keyed.length > 1 ? "their" : "its"} own: write ${keyed.length > 1 ? "them" : "it"} as a number (where the view starts), or turn the push into keys with camera/bakePush`,
      });
    } else {
      const made = pushKeys(
        pushed,
        push,
        items,
        tracks,
        { width: Number(compParsed.width ?? 1920), height: Number(compParsed.height ?? 1080) },
        manifest,
      );
      for (const problem of made.problems)
        errors.push({ code: "UNKNOWN_REF", id: problem.id, prop: "push", message: problem.message });
      const count = { x: 0, y: 0, zoom: 0 };
      const ids: string[] = [];
      for (const key of made.keys) {
        const id = `${camera.id}.push.${key.field}.${count[key.field]++}`;
        const props = {
          id,
          property: `camera.${key.field}`,
          at: key.at,
          value: key.value,
          easing: key.easing ?? "linear",
        };
        const node: CollectedNode = {
          id,
          kind: "keyframe",
          props,
          children: [],
          parent: camera.id,
          editable: camera.editable,
          lockedProps: [],
          boundProps: {},
        };
        const item = place(node, null, camera.id, T(key.at), Time.ZERO, props, [], undefined, undefined);
        items.set(id, item);
        after.push(item);
        ids.push(id);
      }
      if (ids.length > 0) {
        // The camera, set again with its keys: the same id on purpose, in the place it has.
        const withKeys = reuse({ ...pushed, children: [...pushed.children, ...ids] });
        items.set(camera.id, withKeys);
        after[after.indexOf(pushed)] = withKeys;
      }
    }
  }
  const composition = reuse({
    id: root.id,
    kind: "composition",
    track: null,
    parent: null,
    children: childIds(root),
    range: rangeOf(Time.ZERO, duration),
    props: compParsed,
    editable: root.editable,
    lockedProps: root.lockedProps,
    boundProps: root.boundProps,
    errors: [],
    ...themedField(compParsed),
  });
  items.set(root.id, composition);
  after.push(composition);
  if (items.size === fresh + after.length && !cachesOff()) {
    // Every placement was a new id, so the items are in the order they were placed, as each was when it was read.
    gather(findIn(after[0] as Placement, after.slice(1), items, manifest));
    errors.push(...texture, ...keys, ...generators, ...followErrors(followers, items, tracks));
  } else {
    // One walk of the items sorts out the few each check reads; each check then says its errors in the items' order.
    const effects: Placement[] = [];
    const keyframes: Placement[] = [];
    const made: Placement[] = [];
    const following: Placement[] = [];
    for (const item of items.values()) {
      if (item.kind === "effect") effects.push(item);
      else if (item.kind === "keyframe") keyframes.push(item);
      else if (item.kind === "generator") made.push(item);
      if (FOLLOW_KINDS.has(item.kind) && followOf(item) !== undefined) following.push(item);
    }
    errors.push(...textureErrors(effects, manifest));
    errors.push(...keyframeErrors(keyframes, items));
    errors.push(...generatorErrors(made, items));
    errors.push(...followErrors(following, items, tracks));
  }
  const rate = rateOf(compParsed.fps, root.id, errors);
  // A time the file says past the limit is held at it (`T`, `plusClamped`), so a video that reaches it is too long.
  if (duration.toSeconds() > MAX_SECONDS)
    errors.push({
      code: "INVALID_TIME_RANGE",
      id: root.id,
      message: `the video is longer than ${MAX_SECONDS} s; times are exact up to ${MAX_SECONDS} s (about 9.85 hours)`,
    });
  const sampleProblem = sampleRateProblem(Number(compParsed.sampleRate ?? 48000));
  if (sampleProblem) errors.push({ code: "SCHEMA", id: root.id, prop: "sampleRate", message: sampleProblem });
  return {
    composition: {
      id: root.id,
      fps: rateValue(rate),
      rate,
      width: Number(compParsed.width ?? 1920),
      height: Number(compParsed.height ?? 1080),
      duration: duration.toSeconds(),
      length: duration,
    },
    tracks,
    items,
    errors: errors.map(onElement),
    tree: written,
    manifest,
    log,
    theme,
    fonts: withPickedFonts(original.fonts ?? [], root.props.$fonts),
    shaders: original.shaders ?? [],
    ...(scenes.size > 0 ? { scenes } : {}),
  };
}

/**
 * The composition's props without the values the editor holds for the fold to write (`$fonts`, `$defaults`): they
 * are not props of `<Composition>`, so its schema must not see them.
 */
function withoutPending(props: Record<string, unknown>): Record<string, unknown> {
  if (!Object.keys(props).some((k) => k.startsWith("$"))) return props;
  return Object.fromEntries(Object.entries(props).filter(([k]) => !k.startsWith("$")));
}

/**
 * The file's faces, and the Google faces an editor's font picker asked for (`font/use` keeps them on the composition
 * as `$fonts`, family to weights) until the fold writes their declaration: the preview loads them at once.
 */
function withPickedFonts(declared: readonly DeclaredFont[], picked: unknown): readonly DeclaredFont[] {
  if (typeof picked !== "object" || picked === null) return declared;
  const extra: DeclaredFont[] = [];
  for (const [family, weights] of Object.entries(picked as Record<string, unknown>)) {
    if (!Array.isArray(weights)) continue;
    for (const weight of weights) {
      if (typeof weight !== "number") continue;
      if (declared.some((f) => f.family === family && f.weight === weight && f.style === "normal")) continue;
      extra.push({ family, weight, style: "normal", source: { kind: "google" } });
    }
  }
  return extra.length > 0 ? [...declared, ...extra] : declared;
}

interface ParsedProps {
  readonly theme: ResolvedTheme;
  readonly unthemed: boolean;
  readonly data: Record<string, unknown>;
  readonly errors: readonly ResolveError[];
}

/**
 * Parsed props are cached per raw props object and theme: the overlay keeps
 * the props object of every node a patch did not touch, so a drag step
 * re-parses one node, not the whole tree. The cached `data` is shared, never
 * mutated, and is what `Placement.props` points at, so untouched placements
 * keep it across resolves and consumers can memoise on its identity.
 */
const parsedByProps = new Cache<object, ParsedProps>();
/** Which parsed props the theme supplied, keyed by the parsed `data`. */
const themedByData = new WeakMap<object, Readonly<Record<string, ThemeOrigin>>>();

/** The shaders of the file being resolved (`effect`, `transition`); set for the length of one `compute`. */
let fileShaders: readonly ShaderDefinition[] = [];

/**
 * An effect (built-in or the file's own) or a `<Transition>` the file declares: its params checked and filled by
 * its schema. An unknown type is an error naming the built-in ones; null for a built-in transition or another element.
 */
function declaredShader(
  node: CollectedNode,
  data: Record<string, unknown>,
  own: ResolveError[],
): Record<string, unknown> | null {
  if (node.kind !== "effect" && node.kind !== "transition") return null;
  const type = String(data.type);
  const builtIn = (node.kind === "effect" ? VIDEO_EFFECT_TYPES : TRANSITION_TYPES) as readonly string[];
  // Every built-in effect is checked by its registry schema; built-in transitions by TRANSITION_PARAMS, elsewhere.
  const kit = node.kind === "effect" ? effectEntry(type)?.params : undefined;
  if (builtIn.includes(type) && !kit) return null;
  const params = kit ?? shaderFor(fileShaders, node.kind, type)?.params;
  if (!params) {
    const moved = node.kind === "effect" && (type === "temperature" || type === "tint");
    own.push({
      code: "SCHEMA",
      id: node.id,
      prop: "type",
      message: moved
        ? `effect "${type}" is now whiteBalance: effects={[{ type: "whiteBalance", ${type}: … }]}`
        : `unknown ${node.kind} "${type}": use one of ${builtIn.join(", ")}, or declare it with ${node.kind === "effect" ? "effect" : "transition"}()`,
    });
    return null;
  }
  const result = params.safeParse(data.params ?? {});
  if (result.success) return { ...data, params: result.data };
  const given = (data.params ?? {}) as Readonly<Record<string, unknown>>;
  for (const issue of result.error.issues) {
    const renamed =
      issue.code === "unrecognized_keys" && issue.path.length === 0
        ? issue.keys.flatMap((k) => {
            const now = renamedParam(type, k, node.kind === "transition" ? "transition" : "effect");
            return now === undefined ? [] : [`param \`${k}\` of "${type}" is now \`${now}\``];
          })
        : [];
    own.push({
      code: "SCHEMA",
      id: node.id,
      prop: ["params", ...issue.path.map(String)].join("."),
      message:
        renamed.length > 0
          ? `${renamed.join(", ")}; uberscene lint --fix moves the file`
          : (movedKey(node.kind, issue, given) ?? issue.message),
    });
  }
  return null;
}

function parseProps(node: CollectedNode, errors: ResolveError[], theme: ResolvedTheme): Record<string, unknown> {
  const cached = parsedByProps.get(node.props);
  if (cached && cached.theme === theme) {
    errors.push(...cached.errors);
    return cached.data;
  }
  const themed = applyTheme(node.kind, node.props, theme);
  // A theme change keeps the parse of an element the theme touches under neither theme.
  if (cached?.unthemed && themed.props === node.props) {
    parsedByProps.set(node.props, { ...cached, theme });
    errors.push(...cached.errors);
    return cached.data;
  }
  const own: ResolveError[] = themed.issues.map((issue) => ({
    code: issue.code,
    id: node.id,
    prop: issue.prop,
    message: issue.message,
  }));
  const engine = node.kind === "layer" && typeof node.props.engine === "string" ? node.props.engine : null;
  const schema = (engine ? ENGINE_SCHEMAS[engine] : SCHEMAS_BY_KIND[node.kind]) as z.ZodType | undefined;
  let data: Record<string, unknown>;
  if (!schema) data = { ...themed.props };
  else {
    const result = schema.safeParse(node.kind === "composition" ? withoutPending(themed.props) : themed.props);
    if (result.success) {
      data = result.data as Record<string, unknown>;
      const declared = declaredShader(node, data, own);
      if (declared) data = declared;
      // A built-in transition's params are validated per type but not filled by its schema; fill them here.
      else if (node.kind === "transition" && isBuiltInTransition(String(data.type)))
        data = {
          ...data,
          params: {
            ...defaultTransitionParams(data.type as TransitionType),
            ...(data.params as Record<string, unknown>),
          },
        };
    } else {
      // A value the schema refuses is reported and then left out, so the element is placed as if the prop was not
      // written: a speed of 0 or a negative duration must not reach the arithmetic and place something for ever, or
      // backwards. Without the refused props the rest usually parses, and takes its defaults.
      const kept: Record<string, unknown> = { ...themed.props };
      for (const issue of result.error.issues) {
        if (issue.path.length === 1) delete kept[String(issue.path[0])];
        // A prop the element does not take at all.
        else if (issue.path.length === 0 && issue.code === "unrecognized_keys")
          for (const k of issue.keys) delete kept[k];
      }
      const again = schema.safeParse(kept);
      data = again.success ? (again.data as Record<string, unknown>) : kept;
      own.push(
        ...result.error.issues.map(
          (issue) =>
            ({
              code: "SCHEMA",
              id: node.id,
              prop: issue.path.map(String).join(".") || undefined,
              message: movedKey(node.kind, issue, themed.props) ?? issue.message,
            }) as ResolveError,
        ),
      );
    }
  }
  if (Object.keys(themed.from).length > 0) themedByData.set(data, themed.from);
  const parsed: ParsedProps = { theme, unthemed: themed.props === node.props, data, errors: own };
  parsedByProps.set(node.props, parsed);
  errors.push(...own);
  return data;
}

/** A title's look, flat props before 0.6 and fields of its `style` since. */
const TITLE_LOOK_KEYS = [
  "font",
  "size",
  "weight",
  "italic",
  "color",
  "background",
  "stroke",
  "shadow",
  "align",
  "valign",
  "lineHeight",
  "letterSpacing",
  "decoration",
];

/** Keys renamed in 0.6, by element kind and the object they are in (`""` for the element's own props): old to new. */
const RENAMED_KEYS: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>> = {
  shape: { "": { shape: "type" }, stroke: { width: "thickness" } },
  title: { animation: { preset: "type" }, "style.stroke": { width: "thickness" } },
  captions: { "style.stroke": { width: "thickness" } },
  svg: { color: { mode: "type" } },
  composition: { background: { mode: "type" } },
  marker: { "": { at: "start" } },
};

/** The value at a path into props, for a message about it. */
function valueAt(props: Readonly<Record<string, unknown>>, path: readonly PropertyKey[]): unknown {
  let value: unknown = props;
  for (const key of path) {
    if (typeof value !== "object" || value === null) return undefined;
    value = (value as Record<PropertyKey, unknown>)[key];
  }
  return value;
}

/**
 * Where a key a file may still write has moved to, said in place of the schema's "Unrecognized key", and the new
 * spelling of a value spelled the old way (`"ease-in-out"`), in place of "Invalid option".
 */
function movedKey(kind: string, issue: z.core.$ZodIssue, props: Readonly<Record<string, unknown>>): string | undefined {
  const fix = "uberscene lint --fix moves the file";
  if (issue.code === "invalid_union") {
    // A prop that is one of several shapes (a title's `style`, a preset name or an object): what a branch says.
    for (const branch of issue.errors)
      for (const inner of branch) {
        const said = movedKey(kind, { ...inner, path: [...issue.path, ...inner.path] } as z.core.$ZodIssue, props);
        if (said !== undefined) return said;
      }
    return undefined;
  }
  if (issue.code === "invalid_value") {
    const value = valueAt(props, issue.path);
    const now =
      typeof value === "string" && Object.hasOwn(RESPELLED_VALUES, value) ? RESPELLED_VALUES[value] : undefined;
    return now !== undefined && issue.values.includes(now) ? `"${value}" is now "${now}"; ${fix}` : undefined;
  }
  if (issue.code !== "unrecognized_keys") return undefined;
  const at = issue.path.map(String).join(".");
  if (at === "" && issue.keys.includes("automation"))
    return `automation moved into volume and pan, as keys: volume={[{ at, value }]} pan={[{ at, value }]}; ${fix}`;
  const renamed = RENAMED_KEYS[kind]?.[at];
  const respelled = renamed ? issue.keys.filter((k) => Object.hasOwn(renamed, k)) : [];
  if (renamed && respelled.length > 0) {
    const path = (k: string) => (at ? `${at}.${k}` : k);
    return `${respelled.map((k) => `\`${path(k)}\` is now \`${path(renamed[k] as string)}\``).join(", ")}; ${fix}`;
  }
  if (at === "transform" && issue.keys.includes("position"))
    return `transform.position moved to box, in pixels from the frame's top left: box={{ x, y, origin: "center" }} draws what it did with x and y each plus half the frame; ${fix}`;
  const keys = (names: readonly string[]) => issue.keys.filter((k) => names.includes(k));
  const listed = (moved: readonly string[], into: string) =>
    moved.map((k) => `\`${k}\` is now \`${into}.${k}\``).join(", ");
  if (kind === "title") {
    const look = keys(TITLE_LOOK_KEYS);
    const size = keys(["width", "height"]);
    const said = [
      ...(at === "" && look.length > 0 ? [listed(look, "style")] : []),
      ...((at === "" || at === "style") && size.length > 0 ? [listed(size, "box")] : []),
    ];
    return said.length > 0 ? `${said.join(", ")}; ${fix}` : undefined;
  }
  if (kind !== "captions") return undefined;
  if (at === "" && issue.keys.includes("align")) return `${listed(["align"], "style")}; ${fix}`;
  if (at === "style" && issue.keys.includes("position"))
    return `style.position moved to box: the captions sit in the lower safe area unless their box says otherwise, as box={{ y, origin: "top" | "center" }}; ${fix}`;
  const flat = issue.keys.filter((k) => k === "x" || k === "y" || k === "width");
  if (at === "" && flat.length > 0)
    return `${flat.join(", ")} moved to box, in pixels from the frame's top left; ${fix}`;
  return undefined;
}

function themedField(props: Record<string, unknown>): { themed?: Readonly<Record<string, ThemeOrigin>> } {
  const themed = themedByData.get(props);
  return themed ? { themed } : {};
}

/** What `intrinsic` derives for a node; cached per node object and copied into a fresh Pending each resolve. */
interface IntrinsicEntry {
  readonly manifest: AssetManifest;
  readonly markersKey: string;
  readonly theme: ResolvedTheme;
  /** The parent's parsed props a caption's transcript references were resolved against. */
  readonly parentProps: Record<string, unknown> | undefined;
  readonly template: Readonly<
    Pick<Pending, "props" | "errors"> &
      Partial<Pick<Pending, "source" | "start" | "duration" | "durationDep" | "anchorDep">>
  >;
}
const intrinsicByNode = new Cache<CollectedNode, IntrinsicEntry>();

function markersSignature(markers: ReadonlyMap<string, number>): string {
  let key = "";
  for (const [id, at] of markers) key += `${id}:${at};`;
  return key;
}

/**
 * Everything about an element that does not depend on where other elements
 * are. Depends only on the node, the manifest and the markers, so the result
 * is cached per node object: the overlay keeps untouched nodes, and a drag
 * step re-derives one element's trim.
 */
function intrinsic(
  node: CollectedNode,
  track: string | null,
  pending: Map<string, Pending>,
  manifest: AssetManifest,
  markers: ReadonlyMap<string, number>,
  markersKey: string,
  theme: ResolvedTheme,
  errors: ResolveError[],
  /** False for a node the log made again, which the next patch makes again: what it derives is not kept. */
  keep = true,
): void {
  const parentProps = node.kind === "caption" && node.parent ? pending.get(node.parent)?.props : undefined;
  const hit = intrinsicByNode.get(node);
  if (
    hit &&
    hit.manifest === manifest &&
    hit.markersKey === markersKey &&
    hit.theme === theme &&
    hit.parentProps === parentProps
  ) {
    const t = hit.template;
    entered++;
    const p = pendingOf(node, track, node.parent, t.props, t.errors.length > 0 ? [...t.errors] : []);
    if (t.source) p.source = t.source;
    if (t.start !== undefined) p.start = t.start;
    if (t.duration !== undefined) p.duration = t.duration;
    if (t.durationDep) p.durationDep = { ...t.durationDep };
    if (t.anchorDep) p.anchorDep = { ...t.anchorDep };
    pending.set(node.id, p);
    if (node.kind === "captions")
      for (const child of node.children)
        if (child.kind === "caption") intrinsic(child, track, pending, manifest, markers, markersKey, theme, errors);
    return;
  }
  entered++;
  const p = intrinsicCompute(node, track, pending, manifest, markers, markersKey, theme, errors);
  if (!keep) return;
  intrinsicByNode.set(node, {
    manifest,
    markersKey,
    theme,
    parentProps,
    template: {
      props: p.props,
      errors: [...p.errors],
      ...(p.source ? { source: p.source } : {}),
      ...(p.start !== undefined ? { start: p.start } : {}),
      ...(p.duration !== undefined ? { duration: p.duration } : {}),
      ...(p.durationDep ? { durationDep: { ...p.durationDep } } : {}),
      ...(p.anchorDep ? { anchorDep: { ...p.anchorDep } } : {}),
    },
  });
}

function intrinsicCompute(
  node: CollectedNode,
  track: string | null,
  pending: Map<string, Pending>,
  manifest: AssetManifest,
  markers: ReadonlyMap<string, number>,
  markersKey: string,
  theme: ResolvedTheme,
  errors: ResolveError[],
): Pending {
  const caps = capabilitiesOf(node.kind);
  const own: ResolveError[] = [];
  const props = parseProps(node, own, theme);
  // A title's <Mark> colours are theme tokens too, but live in its text, not its props.
  if (node.runs)
    for (const token of themedRuns(node.runs, theme).unknown)
      own.push({
        code: "UNKNOWN_TOKEN",
        id: node.id,
        prop: "children",
        message: `unknown theme token ${token} in a <Mark>`,
      });
  const p = pendingOf(node, track, node.parent, props, own);
  pending.set(node.id, p);

  const dur = props.duration;
  if (typeof props.anchor === "string") {
    const end = props.anchor.endsWith(".end");
    p.anchorDep = {
      id: end ? props.anchor.slice(0, -4) : props.anchor,
      offset: T(Number(props.offset ?? 0)),
      ...(end ? { edge: "end" as const } : {}),
    };
  }
  if (typeof props.at === "string") {
    // `at` names a moment of the anchor's own footage, so it needs a plain anchor: an element, not the start or an end.
    if (!p.anchorDep || p.anchorDep.id === "start" || p.anchorDep.edge === "end") {
      own.push({
        code: "SCHEMA",
        id: node.id,
        prop: "at",
        message: `at="${props.at}" needs anchor set to the clip that plays it (not "start" or an ".end")`,
      });
    } else {
      p.anchorDep.at = props.at;
    }
  }

  const scene = isScene(props.src);
  if (caps.trimSource && (typeof props.src === "string" || scene)) {
    const ref = scene ? sceneAssetId(node.id) : (props.src as string);
    const asset = lookupAsset(manifest, ref);
    if (!asset) {
      own.push({
        code: "MISSING_ASSET",
        id: node.id,
        prop: "src",
        message: `asset ${props.src} is not in the manifest`,
      });
      p.duration = T(typeof dur === "number" ? dur : 0);
    } else if (asset.kind === "lut") {
      own.push({
        code: "SCHEMA",
        id: node.id,
        prop: "src",
        message: `asset ${props.src} is a LUT, which plays nothing; grade with it: effects={[{ type: "lut", src: "${props.src}" }]}`,
      });
      p.duration = T(typeof dur === "number" ? dur : 0);
    } else {
      sourceRange(p, asset, markers);
      if (props.cutout !== undefined && props.cutout !== false)
        own.push(...cutoutErrors(node.id, asset, manifest, scene));
    }
  } else if (node.kind === "transition") {
    p.duration = T(lengthOr(props.duration, 0.5));
  } else if (node.kind === "gap") {
    // A gap whose duration the schema refused holds no time.
    p.duration = T(lengthOr(props.duration, 0));
  } else if (node.kind === "caption") {
    // Timed in the captions pass, once the clips that play the asset are placed.
  } else if (node.kind === "captions") {
    p.start = Time.ZERO;
    p.durationDep = { kind: "fill" };
    for (const child of node.children)
      if (child.kind === "caption") intrinsic(child, track, pending, manifest, markers, markersKey, theme, errors);
    return p;
  } else if (node.kind === "multicam") {
    p.start = Time.ZERO;
    p.durationDep = { kind: "fill" };
  } else if (caps.timed) {
    if (dur === undefined) p.duration = T(DEFAULT_OVERLAY_DURATION);
    else if (typeof dur === "number") p.duration = T(dur);
    else if (dur === "fill") p.durationDep = { kind: "fill" };
    else if (dur === "source") {
      own.push({
        code: "AMBIGUOUS_DURATION",
        id: node.id,
        prop: "duration",
        message: `<${node.kind}> has no source to take a duration from`,
      });
      p.duration = T(DEFAULT_OVERLAY_DURATION);
    } else if (typeof dur === "object" && dur) p.durationDep = otherDep(dur);
  }
  return p;
}

const framedByProps = new Cache<Record<string, unknown>, { key: string; props: Record<string, unknown> }>();

/** `frame` as a `transform.crop`: a window of the composition's aspect over the source, slid to the focus. A written crop wins. Memoised so an unchanged clip keeps its placement. */
function framed(
  props: Record<string, unknown>,
  asset: AssetEntry | undefined,
  comp: Record<string, unknown>,
): Record<string, unknown> {
  const transform = (props.transform ?? {}) as Record<string, unknown>;
  if (transform.crop || !asset?.width || !asset.height) return props;
  const key = `${comp.width}x${comp.height}`;
  const cached = framedByProps.get(props);
  if (cached?.key === key) return cached.props;
  const { focus } = props.frame as { focus: "left" | "center" | "right" | { x: number; y?: number } };
  const fx = focus === "left" ? 0 : focus === "right" ? 1 : typeof focus === "object" ? focus.x : 0.5;
  const fy = typeof focus === "object" ? (focus.y ?? 0.5) : 0.5;
  const ratio = Number(comp.width) / Number(comp.height) / (asset.width / asset.height);
  const width = Math.min(1, ratio),
    height = Math.min(1, 1 / ratio);
  const out = {
    ...props,
    transform: { ...transform, crop: { x: fx * (1 - width), y: fy * (1 - height), width, height } },
  };
  framedByProps.set(props, { key, props: out });
  return out;
}

/** Keys on an effect's params: each value one that param's schema takes. */
/** A wobble or a drift on `box.x` or `box.y` needs a place to be added to: with none, the element is centred. */
function generatorErrors(generators: readonly Placement[], items: ReadonlyMap<string, Placement>): ResolveError[] {
  const out: ResolveError[] = [];
  for (const g of generators) {
    if (g.kind !== "generator" || g.props.type === "loop") continue;
    const axis = g.props.property === "box.x" ? "x" : g.props.property === "box.y" ? "y" : null;
    const parent = g.parent ? items.get(g.parent) : undefined;
    if (!axis || !parent) continue;
    const written = (parent.props.box as Record<string, unknown> | undefined)?.[axis];
    const keyed = parent.children.some((c) => {
      const k = items.get(c);
      return k?.kind === "keyframe" && k.props.property === g.props.property;
    });
    if (written === undefined && !keyed)
      out.push({
        code: "SCHEMA",
        id: parent.id,
        prop: `box.${axis}`,
        message: `a ${String(g.props.type)} on box.${axis} is added to where the element sits: give it a \`base\` (a number of pixels, or keys)`,
      });
  }
  return out;
}

/**
 * A `follow` names another overlay in the file, on the same side of the camera, whose size is known before it is
 * drawn, and no chain comes back to where it started.
 */
function followErrors(
  followers: readonly Placement[],
  items: ReadonlyMap<string, Placement>,
  tracks: readonly ResolvedTrack[],
): ResolveError[] {
  const out: ResolveError[] = [];
  const cameraOf = (p: Placement): string | undefined => tracks.find((t) => t.id === p.track)?.camera;
  const problem = (id: string, code: ResolveError["code"], message: string): void => {
    out.push({ code, id, prop: "follow", message });
  };
  const inCycle = new Set<string>();
  for (const child of followers) {
    const ref = followOf(child);
    if (ref === undefined || !FOLLOW_KINDS.has(child.kind)) continue;
    const leader = items.get(ref);
    if (!leader) {
      problem(child.id, "UNKNOWN_REF", `follow names "${ref}", which does not exist`);
      continue;
    }
    if (!FOLLOW_KINDS.has(leader.kind)) {
      problem(
        child.id,
        "SCHEMA",
        `follow names "${ref}", a ${leader.kind}: an element follows a title, shape, svg, sticker or layer`,
      );
      continue;
    }
    if (leader.kind === "svg" && typeof leader.props.content !== "string") {
      problem(
        child.id,
        "SCHEMA",
        `follow names "${ref}", an SVG read from a file: its size is only known once it is drawn, so it can't be followed yet; write its markup in \`content\`, or follow a shape`,
      );
      continue;
    }
    if (cameraOf(child) !== cameraOf(leader)) {
      const inside = cameraOf(child) !== undefined ? child.id : leader.id;
      problem(
        child.id,
        "SCHEMA",
        `"${inside}" is under the camera and the other is not: put "${child.id}" and "${ref}", which it follows, on tracks on the same side of the camera`,
      );
      continue;
    }
    if (inCycle.has(child.id)) continue;
    const chain = [child.id];
    for (let at = items.get(ref); at && !inCycle.has(at.id); at = items.get(followOf(at) ?? "")) {
      const i = chain.indexOf(at.id);
      if (i >= 0) {
        const loop = chain.slice(i);
        for (const id of loop) inCycle.add(id);
        problem(
          loop[0]!,
          "CYCLE",
          `follows go round in a circle: ${[...loop, loop[0]].map((id) => `"${id}"`).join(" → ")}; remove one of these follows`,
        );
        break;
      }
      chain.push(at.id);
      if (followOf(at) === undefined) break;
    }
  }
  return out;
}

function keyframeErrors(keyframes: readonly Placement[], items: ReadonlyMap<string, Placement>): ResolveError[] {
  const out: ResolveError[] = [];
  for (const k of keyframes) {
    if (k.kind !== "keyframe") continue;
    const parent = k.parent ? items.get(k.parent) : undefined;
    const property = k.props.property;
    if (typeof property === "string" && property.startsWith("shape.")) {
      const problem = shapeKeyProblem(property, k.props.value);
      if (problem) out.push({ code: "SCHEMA", id: k.id, prop: "value", message: problem });
      continue;
    }
    const param = k.props.param;
    if (typeof param !== "string" || parent?.kind !== "effect") continue;
    const problem = effectParamProblem(parent.props.type, fileShaders, param, k.props.value);
    // A param the effect does not have is the list's; a value it does not take is the key's.
    if (problem)
      out.push({
        code: "SCHEMA",
        id: problem.prop === "value" ? k.id : (k.parent ?? k.id),
        ...(problem.prop === "value" ? { prop: "value" } : { prop: param }),
        message: problem.message,
      });
  }
  return out;
}

/**
 * An error found on an item the resolver made from a prop (a key, an effect, a speed key, a hold) is the element's,
 * at the prop that wrote it: `pour.effects.1` with `params.radius` is `pour` at `effects.1.radius`.
 */
function onElement(error: ResolveError): ResolveError {
  const origin = error.id ? derivedOrigin(error.id) : null;
  if (!origin) return error;
  if (origin.path.endsWith(".generator")) {
    // A generator's fields are written inside the value it stands for: `transform.rotation.amount`.
    const { prop, ...rest } = error;
    const at = origin.path.slice(0, -".generator".length);
    return { ...rest, id: origin.id, prop: prop ? `${at}.${prop}` : at };
  }
  const field = error.prop
    ?.replace(/^params(\.|$)/, "")
    .replace(/^speed$/, "value")
    .replace(/^at$/, origin.path.startsWith("freezes.") ? "source" : "at");
  const { prop: _, ...rest } = error;
  return { ...rest, id: origin.id, prop: field ? `${origin.path}.${field}` : origin.path };
}

/**
 * Effect params that name an asset (`"asset:ID"`, a texture the shader reads): the asset must be in the manifest, a
 * LUT for a `lut` effect, and an image or a LUT for an effect the file declares.
 */
function textureErrors(effects: readonly Placement[], manifest: AssetManifest): ResolveError[] {
  const out: ResolveError[] = [];
  for (const p of effects) {
    if (p.kind !== "effect") continue;
    const params = (p.props.params ?? {}) as Readonly<Record<string, unknown>>;
    for (const [name, value] of Object.entries(params)) {
      if (typeof value !== "string" || !value.startsWith("asset:")) continue;
      const asset = lookupAsset(manifest, value);
      const prop = `params.${name}`;
      if (!asset) out.push({ code: "MISSING_ASSET", id: p.id, prop, message: `asset ${value} is not in the manifest` });
      else if (p.props.type === "lut" ? asset.kind !== "lut" : asset.kind !== "image" && asset.kind !== "lut")
        out.push({
          code: "SCHEMA",
          id: p.id,
          prop,
          message: `asset ${value} is ${asset.kind === "image" ? "an image" : `a ${asset.kind}`}; ${p.props.type === "lut" ? "a lut effect reads a .cube file (kind lut)" : "a shader reads an image or a LUT"}`,
        });
    }
  }
  return out;
}

/** The seconds a time reference resolved to, or `fallback` with its error recorded. */
/** A length in seconds as written, or `fallback` for one that is missing or is not a finite, non-negative number. */
function lengthOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function secondsOr(p: Pending, resolved: ReturnType<typeof resolveTimeRef>, fallback: number): number {
  if (typeof resolved === "number") return resolved;
  p.errors.push(resolved);
  return fallback;
}

function sourceRange(p: Pending, asset: AssetEntry, markers: ReadonlyMap<string, number>): void {
  const { node, props } = p;
  const speed = Number(props.speed ?? 1);
  const inRaw = props.in ?? 0;
  const inT = resolveTimeRef(inRaw, asset, markers, { id: node.id, prop: "in" });
  const inSec = secondsOr(p, inT, 0);
  const dur = props.duration;
  const keys = speedKeysOf(node.children);
  const allHolds = freezeHoldsOf(node.children);
  let outSec: number;
  /** Timeline seconds the source plays, when `duration` gave them exactly. */
  let played: number | undefined;
  if (props.out !== undefined && dur !== undefined) {
    p.errors.push({
      code: "AMBIGUOUS_DURATION",
      id: node.id,
      prop: "duration",
      message: "give either out or duration, not both",
    });
  }
  if (props.out !== undefined) {
    const o = resolveTimeRef(props.out, asset, markers, { id: node.id, prop: "out" });
    outSec = secondsOr(p, o, inSec);
  } else if (typeof dur === "number") {
    played = dur;
    outSec = inSec + (keys.length > 0 ? rampAdvance(keys, dur) : dur * speed);
  } else if (dur === "fill" || (typeof dur === "object" && dur !== null)) {
    p.durationDep = dur === "fill" ? { kind: "fill" } : otherDep(dur);
    p.source = { in: inSec, out: inSec, speed, asset: asset.id };
    return;
  } else {
    outSec = asset.kind === "image" ? inSec + IMAGE_DEFAULT_DURATION * speed : asset.duration;
  }
  if (asset.kind !== "image" && outSec > asset.duration + 0.05) {
    p.errors.push({
      code: "TRIM_PAST_SOURCE",
      id: node.id,
      prop: "out",
      message: `out ${round3(outSec)}s is past the end of ${asset.id} (${round3(asset.duration)}s)`,
    });
    outSec = asset.duration;
    played = undefined;
  }
  if (outSec <= inSec) {
    p.errors.push({ code: "TRIM_PAST_SOURCE", id: node.id, prop: "out", message: "out must be after in" });
    outSec = inSec;
    played = undefined;
  }
  p.source = { in: inSec, out: outSec, speed, asset: asset.id };
  // Speed keys replace `speed`; freeze holds are inserted, so they lengthen the clip.
  const natural = played ?? (keys.length > 0 ? rampInverse(keys, outSec - inSec) : (outSec - inSec) / speed);
  const holds = reachedHolds(allHolds, natural);
  for (const child of node.children) {
    if (child.kind !== "freeze" || !allHolds.some((h) => h.start === Number(child.props.start))) continue;
    if (holds.some((h) => h.start === Number(child.props.start))) continue;
    p.errors.push({
      code: "INVALID_TIME_RANGE",
      id: child.id,
      prop: "start",
      message: `the freeze starts ${Number(child.props.start)}s into "${node.id}", after the clip has ended, so it never holds`,
    });
  }
  p.duration = T(natural).plusClamped(T(holdTotal(holds)));
}

/** Source seconds a clip plays over `length` timeline seconds: its freeze holds play none, its speed keys replace `speed`. */
function sourceSpan(node: CollectedNode, length: number, speed: number): number {
  const keys = speedKeysOf(node.children);
  const rel = Math.max(0, length - heldWithin(freezeHoldsOf(node.children), length));
  return keys.length > 0 ? rampAdvance(keys, rel) : rel * speed;
}

/** Where a track's placing stands between two of its children. */
interface TrackCursor {
  /** Where the next element of a sequence starts. */
  readonly cursor: Time;
  /** The last clip placed, which a transition after it leads out of; none after a gap. */
  readonly prevClip: Pending | null;
  /** The length of the transition that leads into `prevClip`, to see that two transitions do not meet inside it. */
  readonly intoPrev: Time;
  /** Whether a transition is waiting for the clip after it. */
  readonly open: boolean;
}

/** Where a track's placing starts. */
const STARTING: TrackCursor = { cursor: Time.ZERO, prevClip: null, intoPrev: Time.ZERO, open: false };

/** Whether a placing stands where `before` did: the same cursor, the same clip behind it, no transition waiting. */
function standsAs(at: TrackCursor, before: TrackCursor): boolean {
  return (
    !at.open &&
    at.cursor.equals(before.cursor) &&
    at.prevClip === before.prevClip &&
    at.intoPrev.equals(before.intoPrev)
  );
}

/** Places a track's children one at a time, in order: `step` for each, then `finish`. */
class TrackPlacer {
  private cursor = Time.ZERO;
  private prevClip: Pending | null = null;
  private pendingTransition: Pending | null = null;
  /** The length of the transition that leads into `prevClip`, to see that two transitions do not meet inside it. */
  private intoPrev = Time.ZERO;

  constructor(
    private readonly track: ResolvedTrack,
    private readonly pending: Map<string, Pending>,
    private readonly theme: ResolvedTheme,
    private readonly errors: ResolveError[],
  ) {}

  step(child: CollectedNode): void {
    const p = this.pending.get(child.id);
    if (!p) return;
    const caps = capabilitiesOf(child.kind);
    if (child.kind === "multicam") {
      placeMulticam(child, p, this.track, this.pending, this.theme, this.errors);
      return;
    }
    if (child.kind === "transition") {
      if (typeof p.props.on === "string") {
        p.anchorDep = { id: p.props.on, offset: Time.ZERO };
        // Edge transitions attach to a clip edge; resolved in iterateDependencies with edge logic.
        return;
      }
      if (this.track.layout !== "sequence") {
        p.errors.push({
          code: "NOT_ADJACENT",
          id: child.id,
          message: "a transition between siblings needs a sequence track; use on/edge on free tracks",
        });
        p.start = Time.ZERO;
        return;
      }
      if (this.pendingTransition) {
        this.pendingTransition.errors.push({
          code: "NOT_ADJACENT",
          id: this.pendingTransition.node.id,
          message: "a transition needs a clip on each side, not another transition",
        });
        this.pendingTransition.start = this.cursor;
      }
      this.pendingTransition = p;
      return;
    }
    if (p.anchorDep) {
      if (typeof p.props.start === "number")
        p.errors.push({
          code: "SCHEMA",
          id: child.id,
          prop: "start",
          message: "anchored elements take offset, not start",
        });
      return;
    }
    if (!caps.timed) return;
    if (this.track.layout === "free") {
      // A start the schema refused is already reported; it is not also missing.
      if (typeof p.props.start !== "number" && child.props.start === undefined)
        p.errors.push({
          code: "MISSING_START",
          id: child.id,
          prop: "start",
          message: "elements on a free track need start",
        });
      p.start = T(lengthOr(p.props.start, 0));
      return;
    }
    if (typeof p.props.start === "number") {
      p.errors.push({
        code: "START_ON_SEQUENCE",
        id: child.id,
        prop: "start",
        message: "sequence tracks derive start from order; remove start or use a free track",
      });
    }
    if (p.durationDep?.kind === "fill") {
      p.errors.push({
        code: "AMBIGUOUS_DURATION",
        id: child.id,
        prop: "duration",
        message: '"fill" is not meaningful inside a sequence',
      });
      p.duration = Time.ZERO;
      p.durationDep = undefined;
    }
    if (this.pendingTransition && child.kind === "gap") {
      this.pendingTransition.errors.push({
        code: "NOT_ADJACENT",
        id: this.pendingTransition.node.id,
        message: "a transition needs a clip on each side, not a gap",
      });
      this.pendingTransition.start = this.cursor;
      this.pendingTransition = null;
    }
    let into = Time.ZERO;
    if (this.pendingTransition && this.prevClip) {
      const d = this.pendingTransition.duration ?? Time.ZERO;
      const outgoing = this.prevClip.duration ?? Time.ZERO;
      // Lengths are ticks, so they compare exactly: a clip from 1.1 to 1.3 is 0.2 s long, and a 0.2 s transition fits it.
      if (d.isAfter(outgoing) || (p.duration !== undefined && d.isAfter(p.duration))) {
        this.pendingTransition.errors.push({
          code: "INSUFFICIENT_HANDLES",
          id: this.pendingTransition.node.id,
          message: "transition is longer than one of its clips",
        });
      } else if (this.intoPrev.plusClamped(d).isAfter(outgoing)) {
        this.pendingTransition.errors.push({
          code: "INSUFFICIENT_HANDLES",
          id: this.pendingTransition.node.id,
          message: `"${this.prevClip.node.id}" is shorter than the transitions on its two sides together, so they would overlap`,
        });
      }
      // A transition that does not fit is told above and held to what its clips have: the part of the outgoing clip
      // that the transition before has not used, and the whole of the incoming one. Longer, the incoming clip would
      // start before the outgoing one does.
      const room = outgoing.minus(this.intoPrev);
      const fit = Time.max(Time.ZERO, Time.min(Time.min(d, room), p.duration ?? d));
      if (fit.isBefore(d)) this.pendingTransition.duration = fit;
      into = fit;
      const start = this.cursor.minus(fit);
      this.pendingTransition.start = start;
      this.pendingTransition.between = [this.prevClip.node.id, child.id];
      this.cursor = start;
    } else if (this.pendingTransition) {
      this.pendingTransition.errors.push({
        code: "NOT_ADJACENT",
        id: this.pendingTransition.node.id,
        message: "a transition needs a clip on each side",
      });
      this.pendingTransition.start = this.cursor;
    }
    this.pendingTransition = null;
    this.intoPrev = into;
    p.start = this.cursor;
    if (p.duration !== undefined) this.cursor = this.cursor.plusClamped(p.duration);
    else p.durationDep ??= { kind: "fill" }; // match deps settle later; cursor cannot advance past an unknown length
    if (p.durationDep?.kind === "match" || p.durationDep?.kind === "until") {
      p.errors.push({
        code: "AMBIGUOUS_DURATION",
        id: child.id,
        prop: "duration",
        message: `${p.durationDep.kind} durations are not allowed inside a sequence`,
      });
      p.duration = Time.ZERO;
      p.durationDep = undefined;
    }
    this.prevClip = child.kind === "gap" ? null : p;
  }

  finish(): void {
    if (this.pendingTransition) {
      this.pendingTransition.errors.push({
        code: "NOT_ADJACENT",
        id: this.pendingTransition.node.id,
        message: "a transition needs a clip on each side",
      });
      this.pendingTransition.start = this.cursor;
    }
  }

  /** Where the placing stands. */
  at(): TrackCursor {
    return {
      cursor: this.cursor,
      prevClip: this.prevClip,
      intoPrev: this.intoPrev,
      open: this.pendingTransition !== null,
    };
  }

  /** Carries on from where an earlier placing of the same children stood (with no transition waiting). */
  resume(from: TrackCursor): void {
    this.cursor = from.cursor;
    this.prevClip = from.prevClip;
    this.intoPrev = from.intoPrev;
    this.pendingTransition = null;
  }
}

function placeTrack(
  trackNode: CollectedNode,
  track: ResolvedTrack,
  pending: Map<string, Pending>,
  theme: ResolvedTheme,
  errors: ResolveError[],
  /** When given, where the placing stood after each child is added to it. */
  stood?: TrackCursor[],
): void {
  const placer = new TrackPlacer(track, pending, theme, errors);
  for (const child of trackNode.children) {
    placer.step(child);
    stood?.push(placer.at());
  }
  placer.finish();
}

function placeMulticam(
  node: CollectedNode,
  p: Pending,
  track: ResolvedTrack,
  pending: Map<string, Pending>,
  theme: ResolvedTheme,
  errors: ResolveError[],
): void {
  const angles = new Map<string, Record<string, unknown>>();
  const cuts: { node: CollectedNode; at: number; angle: string }[] = [];
  for (const child of node.children) {
    const cp = parseProps(child, errors, theme);
    if (child.kind === "angle") angles.set(child.id, cp);
    else if (child.kind === "cut" && typeof cp.at === "number")
      cuts.push({ node: child, at: cp.at, angle: String(cp.angle) });
  }
  cuts.sort((a, b) => a.at - b.at);
  const sync = Number(p.props.sync ?? 0);
  p.start = T(cuts[0]?.at ?? 0);
  cuts.forEach((cut, i) => {
    const next = cuts[i + 1];
    const angle = angles.get(cut.angle);
    if (!angle) {
      errors.push({
        code: "DANGLING_ANCHOR",
        id: cut.node.id,
        prop: "angle",
        message: `angle "${cut.angle}" is not in this multicam`,
      });
      return;
    }
    const id = `${node.id}.${cut.node.id}`;
    const inSec = Math.max(0, cut.at - sync + Number(angle.offset ?? 0));
    const generated: CollectedNode = {
      id,
      kind: "clip",
      parent: node.id,
      children: [],
      editable: "generated",
      lockedProps: [],
      boundProps: {},
      props: { id, src: angle.src, in: inSec },
      origin: { helper: "multicam", callerId: node.id, callIndex: 0 },
    };
    const gp = pendingOf(generated, track.id, node.id, generated.props as Record<string, unknown>, []);
    gp.start = T(cut.at);
    gp.source = { in: inSec, out: inSec, speed: 1, asset: assetIdOf(String(angle.src)) };
    if (next) {
      gp.duration = T(next.at).minus(T(cut.at));
      gp.source = { ...gp.source, out: inSec + gp.duration.toSeconds() };
    } else {
      gp.durationDep = { kind: "fill" };
    }
    pending.set(id, gp);
    made++;
  });
  p.durationDep = { kind: "fill" };
}

/**
 * Gives each element that waits on another its start and its length. `waiting` are those elements, in the order
 * `pending` holds them; `pending` is every element, to find the one each waits on.
 */
function iterateDependencies(
  waiting: readonly Pending[],
  pending: Map<string, Pending>,
  manifest: AssetManifest,
): void {
  // A pass that places nothing ends the loop, so a cycle still stops; a pass that places something places at least one
  // element, so a chain of any length, in any order, is placed within one pass per element.
  for (let pass = 0; pass <= pending.size; pass++) {
    let progressed = false;
    for (const p of waiting) {
      if (p.anchorDep && p.start === undefined) {
        const dep = p.anchorDep;
        if (dep.id === "start") {
          p.start = Time.max(Time.ZERO, dep.offset);
          progressed = true;
          continue;
        }
        const target = pending.get(dep.id);
        if (!target) {
          p.errors.push({
            code: "DANGLING_ANCHOR",
            id: p.node.id,
            prop: p.node.kind === "transition" ? "on" : "anchor",
            message: `anchor "${dep.id}" does not exist`,
          });
          p.start = Time.ZERO;
          p.anchorDep = undefined;
          progressed = true;
          continue;
        }
        if (
          target.start !== undefined &&
          (target.duration !== undefined || (p.node.kind !== "transition" && dep.edge !== "end"))
        ) {
          if (p.node.kind === "transition") {
            const edge = p.props.edge === "in" ? "in" : "out";
            const d = p.duration ?? Time.ZERO;
            p.start = edge === "in" ? target.start : target.start.plusClamped(target.duration ?? Time.ZERO).minus(d);
          } else {
            const base =
              dep.at !== undefined
                ? T(playedAt(p, target, dep.at, manifest))
                : dep.edge === "end"
                  ? (target.duration ?? Time.ZERO)
                  : Time.ZERO;
            p.start = Time.max(Time.ZERO, target.start.plusClamped(base).plusClamped(dep.offset));
          }
          progressed = true;
        }
      }
      if (follows(p) && p.duration === undefined) {
        const target = pending.get(p.durationDep.id);
        if (!target) {
          p.errors.push({
            code: "DANGLING_ANCHOR",
            id: p.node.id,
            prop: "duration",
            message: `${p.durationDep.kind} target "${p.durationDep.id}" does not exist`,
          });
          p.duration = Time.ZERO;
          (p as Pending).durationDep = undefined;
          progressed = true;
        } else if (takeLength(p, target, manifest)) progressed = true;
      }
    }
    if (!progressed) break;
  }
  for (const p of waiting) {
    // A match on an element that fills the video is settled after the fill, not a cycle.
    if (!p.anchorDep && follows(p) && waitsForFill(p, pending)) continue;
    if ((p.anchorDep && p.start === undefined) || (follows(p) && p.duration === undefined)) {
      p.errors.push({
        code: "CYCLE",
        id: p.node.id,
        message: `"${p.node.id}" depends on itself through anchors or match durations`,
      });
      p.start ??= Time.ZERO;
      p.duration ??= Time.ZERO;
      p.anchorDep = undefined;
      p.durationDep = undefined;
    }
  }
}

/** The dependency a `duration={{ match }}` or `duration={{ until }}` names, with the moment an until ends on. */
function otherDep(dur: object): { kind: "match" | "until"; id: string; at?: string } {
  if (!("until" in dur)) return { kind: "match", id: String((dur as { match: string }).match) };
  const { until, at } = dur as { until: string; at?: string };
  return { kind: "until", id: String(until), ...(at !== undefined ? { at } : {}) };
}

type Following = Pending & { durationDep: { kind: "match" | "until"; id: string; at?: string } };

/** Whether `p`'s length comes from another element: as long as it (`match`), or until it ends (`until`). */
function follows(p: Pending): p is Following {
  return p.durationDep?.kind === "match" || p.durationDep?.kind === "until";
}

/**
 * Gives `p` its length from `target` once enough is known: the target's length for a match; for an until, the time
 * from `p`'s own start to the target's end, or to where the target plays the moment `at` names. An element that
 * starts after that end has no length, and says so. False while it has to wait.
 */
function takeLength(p: Following, target: Pending, manifest: AssetManifest): boolean {
  if (target.duration === undefined) return false;
  if (p.durationDep.kind === "match") p.duration = target.duration;
  else {
    if (p.start === undefined || target.start === undefined) return false;
    const { at, id } = p.durationDep;
    // A moment it cannot find (reported) ends it where the target ends, as an until without one does.
    const said = p.errors.length;
    const moment = at !== undefined ? T(playedAt(p, target, at, manifest, "duration")) : target.duration;
    const end = target.start.plusClamped(p.errors.length > said && moment.isZero() ? target.duration : moment);
    // Exact in ticks: a target that ends off the ms grid (121 frames at 24 fps is 5.0416667 s) is not outlived by a frame.
    const left = end.minus(p.start);
    // Under half a millisecond left is no length, as when lengths were rounded to the ms.
    const none = round3(left.toSeconds()) <= 0;
    if (none)
      p.errors.push({
        code: "INVALID_TIME_RANGE",
        id: p.node.id,
        prop: "duration",
        message:
          at !== undefined
            ? `"${p.node.id}" starts at ${round3(p.start.toSeconds())} s, after "${id}" plays ${at} (${round3(end.toSeconds())} s), so it has no length`
            : `"${p.node.id}" starts at ${round3(p.start.toSeconds())} s, after "${id}" has ended (${round3(end.toSeconds())} s), so it has no length`,
      });
    p.duration = none ? Time.ZERO : left;
  }
  if (p.source)
    p.source = {
      ...p.source,
      out: p.source.in + sourceSpan(p.node, p.duration.toSeconds(), p.source.speed),
    };
  (p as Pending).durationDep = undefined;
  return true;
}

/** Whether `p`'s match leads, through other matches, to an element whose length is the video's. */
function waitsForFill(p: Pending, pending: Map<string, Pending>): boolean {
  const seen = new Set<Pending>();
  for (let at: Pending | undefined = p; at && !seen.has(at); ) {
    seen.add(at);
    if (at.durationDep?.kind === "fill") return true;
    if (!follows(at)) return false;
    at = pending.get(at.durationDep.id);
  }
  return false;
}

/** Gives each element still waiting on a match its target's length, now that fills have theirs. */
function settleMatches(waiting: readonly Pending[], pending: Map<string, Pending>, manifest: AssetManifest): void {
  for (let pass = 0; pass <= pending.size; pass++) {
    let progressed = false;
    for (const p of waiting) {
      if (!follows(p) || p.duration !== undefined) continue;
      const target = pending.get(p.durationDep.id);
      if (target && takeLength(p, target, manifest)) progressed = true;
    }
    if (!progressed) break;
  }
  for (const p of waiting) {
    if (!follows(p) || p.duration !== undefined) continue;
    p.errors.push({
      code: "CYCLE",
      id: p.node.id,
      message: `"${p.node.id}" depends on itself through anchors or match durations`,
    });
    p.duration = Time.ZERO;
    (p as Pending).durationDep = undefined;
  }
}

/** What stands between a clip's `cutout` and a matte to cut with: none, or the error that says what is missing. */
function cutoutErrors(id: string, asset: AssetEntry, manifest: AssetManifest, scene: boolean): ResolveError[] {
  const fail = (code: "SCHEMA" | "MISSING_ASSET", message: string): ResolveError[] => [
    { code, id, prop: "cutout", message },
  ];
  if (scene || asset.kind !== "video")
    return fail(
      "SCHEMA",
      `cutout needs footage with a matte; ${asset.id} is ${scene ? "a 3D scene" : `an ${asset.kind} asset`}`,
    );
  if (asset.matte === undefined)
    return fail(
      "SCHEMA",
      `cutout needs a matte for ${asset.id}: a greyscale video of the same frames, white where the subject is. Add it (npx uberscene add ${asset.id}.matte.webm) and set "matte": "${asset.id}.matte" on ${asset.id} in the manifest`,
    );
  const matte = lookupAsset(manifest, asset.matte);
  if (!matte)
    return fail(
      "MISSING_ASSET",
      `the matte of ${asset.id}, asset ${asset.matte}, is not in the manifest; add it with npx uberscene add`,
    );
  if (matte.kind !== "video")
    return fail(
      "SCHEMA",
      `the matte of ${asset.id}, asset ${asset.matte}, is an ${matte.kind}; a matte is a video of the same frames`,
    );
  return [];
}

/**
 * Seconds after `target` starts at which it plays `at`, a word, shot or silence of its source:
 * (source time − source in) / speed. A target that is not footage, plays the moment reversed or through a speed ramp,
 * or has trimmed it out is reported on `p`; then the moment is held to the nearest part the target plays.
 */
function playedAt(
  p: Pending,
  target: Pending,
  at: string,
  manifest: AssetManifest,
  /** The prop that names the moment: `at` on an anchor, `duration` on an until. */
  prop: "at" | "duration" = "at",
): number {
  const src = target.source;
  const fail = (code: "INVALID_ANCHOR" | "UNSUPPORTED_ANCHOR", message: string): number => {
    p.errors.push({ code, id: p.node.id, prop, message });
    return 0;
  };
  if (!src)
    return fail(
      "INVALID_ANCHOR",
      `at="${at}" needs anchor "${target.node.id}" to be a clip or audio cut from an asset`,
    );
  if (target.props.reverse === true)
    return fail("UNSUPPORTED_ANCHOR", `at="${at}" on reversed "${target.node.id}" is not supported yet; use offset`);
  if (target.node.children.some((c) => c.kind === "speedKey" || c.kind === "freeze")) {
    return fail(
      "UNSUPPORTED_ANCHOR",
      `at="${at}" on "${target.node.id}", which has speed keys or freezes, is not supported yet; use offset`,
    );
  }
  const t = resolveTimeRef(at, lookupAsset(manifest, src.asset), new Map(), { id: p.node.id, prop });
  if (typeof t !== "number") {
    p.errors.push(t);
    return 0;
  }
  const EPS = 1e-6;
  if (t < src.in - EPS || t > src.out + EPS) {
    p.errors.push({
      code: "INVALID_ANCHOR",
      id: p.node.id,
      prop,
      message: `${at} (${t.toFixed(2)} s) is not in what "${target.node.id}" plays (${src.in.toFixed(2)}–${src.out.toFixed(2)} s of ${src.asset}): it was trimmed out`,
    });
  }
  return (Math.max(src.in, Math.min(src.out, t)) - src.in) / src.speed;
}

/** Whether two placements would render and edit the same; used to hand back the previous object. */
export function samePlacement(a: Placement, b: Placement): boolean {
  if (a === b) return true;
  if (a.id !== b.id || a.kind !== b.kind || a.track !== b.track || a.parent !== b.parent) return false;
  if (!a.range.equals(b.range)) return false;
  if (
    a.props !== b.props ||
    a.editable !== b.editable ||
    a.lockedProps !== b.lockedProps ||
    a.boundProps !== b.boundProps
  )
    return false;
  if (!sameSource(a.source, b.source) || !sameBetween(a.between, b.between) || a.interior !== b.interior) return false;
  if (a.children.length !== b.children.length || a.children.some((id, i) => id !== b.children[i])) return false;
  return sameErrors(a.errors, b.errors);
}

function sameSource(a: PendingSource | undefined, b: PendingSource | undefined): boolean {
  if (!a || !b) return a === b;
  return a.asset === b.asset && a.in === b.in && a.out === b.out && a.speed === b.speed;
}

function sameBetween(a: Placement["between"], b: Placement["between"]): boolean {
  if (!a || !b) return a === b;
  return a[0] === b[0] && a[1] === b[1];
}

function sameChildIds(ids: readonly string[], children: readonly CollectedNode[]): boolean {
  if (ids.length !== children.length) return false;
  for (let i = 0; i < ids.length; i++) if (ids[i] !== children[i]!.id) return false;
  return true;
}

function sameErrors(a: readonly ResolveError[], b: readonly ResolveError[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!,
      y = b[i]!;
    if (x.code !== y.code || x.prop !== y.prop || x.message !== y.message) return false;
  }
  return true;
}

type Place = (
  node: CollectedNode,
  track: string | null,
  parent: string | null,
  start: Time,
  length: Time,
  props: Record<string, unknown>,
  errors: readonly ResolveError[],
  source: PendingSource | undefined,
  between: Placement["between"],
) => Placement;

/** Non-timed children get the parent's range so the editor can address them; keyframes sit at their `at`. Returns the running composition end. */
function placeChildren(
  node: CollectedNode,
  parent: Placement,
  items: Map<string, Placement>,
  errors: ResolveError[],
  place: Place,
  end: Time,
  theme: ResolvedTheme,
  /** When given, every placement made is added to it, in order. */
  inside?: Placement[],
): Time {
  for (const child of node.children) {
    if (items.has(child.id)) continue;
    const own: ResolveError[] = [];
    const props = parseProps(child, own, theme);
    const caps = capabilitiesOf(child.kind);
    if (caps.placementScope !== "child") {
      own.push({ code: "INVALID_CHILD", id: child.id, message: `<${child.kind}> cannot be a child of <${node.kind}>` });
    }
    let start = parent.range.start;
    let duration = parent.range.duration;
    if (child.kind === "keyframe" || child.kind === "speedKey") {
      start = parent.range.start.plusClamped(T(lengthOr(props.at, 0)));
      duration = Time.ZERO;
    }
    if (child.kind === "freeze") {
      start = parent.range.start.plusClamped(T(lengthOr(props.start, 0)));
      duration = T(lengthOr(props.duration, 0));
    }
    const placement = place(child, parent.track, node.id, start, duration, props, own, undefined, undefined);
    items.set(child.id, placement);
    inside?.push(placement);
    if (own.length > 0) errors.push(...own);
    // What is inside an element does not make the video longer: a key or a hold written past its element's end is
    // still that element's.
    end = placeChildren(child, placement, items, errors, place, end, theme, inside);
  }
  return end;
}

interface CueMemo {
  readonly key: string;
  /** Characters to a line: from the cue's own props, or from the composition's size. */
  readonly maxChars: number;
  readonly manifest: AssetManifest;
  readonly props: Record<string, unknown>;
  readonly nodes: readonly CollectedNode[];
}
const cuesByCaptions = new Cache<CollectedNode, CueMemo>();

/**
 * Captions follow the clips: a word reference on a literal <Caption> means
 * the composition time at which that word plays, and <Captions src> with no
 * literal cues generates them from the asset's transcript along the timeline.
 */
function placeCaptions(
  root: CollectedNode,
  pending: Map<string, Pending>,
  tracks: readonly ResolvedTrack[],
  manifest: AssetManifest,
  markers: ReadonlyMap<string, number>,
): void {
  for (const node of root.children) {
    if (node.kind !== "captions") continue;
    const cp = pending.get(node.id);
    if (!cp) continue;
    const src = typeof cp.props.src === "string" ? cp.props.src : null;
    const asset = src ? lookupAsset(manifest, src) : null;
    const plays = src ? assetPlays(src, pending, tracks) : [];
    const literal = node.children.filter((c) => c.kind === "caption");
    if (literal.length > 0) {
      for (const child of literal) {
        const p = pending.get(child.id);
        if (!p) continue;
        const s = captionTime(p.props.start, asset, plays, markers, { id: child.id, prop: "start", src });
        const e = captionTime(p.props.end, asset, plays, markers, { id: child.id, prop: "end", src });
        if (typeof s !== "number") p.errors.push(s);
        if (typeof e !== "number") p.errors.push(e);
        p.start = T(typeof s === "number" ? s : 0);
        p.duration = typeof s === "number" && typeof e === "number" ? Time.max(Time.ZERO, T(e).minus(T(s))) : Time.ZERO;
      }
      continue;
    }
    if (!asset?.transcript) continue;
    const key = playsKey(plays);
    const hit = cuesByCaptions.get(node);
    const maxChars = Number(cp.props.maxChars ?? lineChars(root, cp.props.style));
    let nodes: readonly CollectedNode[];
    if (hit && hit.key === key && hit.manifest === manifest && hit.props === cp.props && hit.maxChars === maxChars)
      nodes = hit.nodes;
    else {
      const options: CueOptions = {
        maxChars,
        maxDuration: Number(cp.props.maxDuration ?? 5),
        maxGap: Number(cp.props.maxGap ?? 0.8),
        ...(Array.isArray(cp.props.breakAfter)
          ? { breakAfter: new Set((cp.props.breakAfter as string[]).map((ref) => Number(ref.slice("word:".length)))) }
          : {}),
      };
      nodes = cueNodes(node, planCues(timelineWords(asset, plays), options), (id) => pending.has(id));
      cuesByCaptions.set(node, { key, maxChars, manifest, props: cp.props, nodes });
    }
    for (const cue of nodes) {
      made++;
      const timed = pendingOf(cue, null, node.id, cue.props as Record<string, unknown>, []);
      timed.start = T(Number(cue.props.start));
      timed.duration = T(Number(cue.props.end)).minus(T(Number(cue.props.start)));
      pending.set(cue.id, timed);
    }
  }
}

/**
 * How many characters fit on one caption line: the player's side margins (12% a side on vertical video, 8% otherwise)
 * and cue padding (1 em), at about 0.55 em a character. Never more than the old fixed 42.
 */
function lineChars(root: CollectedNode, style: unknown): number {
  const width = Number(root.props.width ?? 1920),
    height = Number(root.props.height ?? 1080);
  const size = Number(
    (typeof style === "object" && style !== null ? (style as { size?: unknown }).size : undefined) ??
      Math.round(height / 24),
  );
  return Math.max(8, Math.min(42, Math.floor((width * (height > width ? 0.76 : 0.84) - size) / (size * 0.55))));
}

/** Where an asset plays: media placements on visible tracks that draw from it, in start order. */
function assetPlays(src: string, pending: Map<string, Pending>, tracks: readonly ResolvedTrack[]): AssetPlay[] {
  const hidden = new Set(tracks.filter((t) => t.hidden).map((t) => t.id));
  const plays: AssetPlay[] = [];
  for (const p of pending.values()) {
    if (!p.source || p.start === undefined || !sameAsset(p.source.asset, src)) continue;
    if (p.track && hidden.has(p.track)) continue;
    if (p.node.kind !== "clip" && p.node.kind !== "audio") continue;
    plays.push(
      assetPlay({
        id: p.node.id,
        start: p.start.toSeconds(),
        source: p.source,
        open: p.duration === undefined,
        children: p.node.children,
      }),
    );
  }
  return plays.sort((a, b) => a.start - b.start);
}

function captionTime(
  ref: unknown,
  asset: AssetEntry | null,
  plays: readonly AssetPlay[],
  markers: ReadonlyMap<string, number>,
  ctx: { id: string; prop: string; src: string | null },
): number | ResolveError {
  const parsed = parseTimeRef(ref);
  if (parsed.kind === "seconds" || parsed.kind === "marker" || parsed.kind === "invalid")
    return resolveTimeRef(ref as never, asset, markers, ctx);
  const sec = resolveTimeRef(ref as never, asset, markers, ctx);
  if (typeof sec !== "number") return sec;
  const at = onTimeline(sec, plays);
  if (at === null)
    return {
      code: "UNKNOWN_REF",
      id: ctx.id,
      prop: ctx.prop,
      message: `${String(ref)} of ${ctx.src ?? "the asset"} is not on the timeline`,
    };
  return at;
}

/** The composition's frame rate as an exact fraction; an unusable rate is an error, and 30 stands in for it. */
function rateOf(fps: unknown, id: string, errors: ResolveError[]): Rate {
  if (fps === undefined) return { num: 30, den: 1 };
  try {
    return parseRate(fps as FrameRate);
  } catch (error) {
    errors.push({ code: "SCHEMA", id, prop: "fps", message: (error as Error).message });
    return { num: 30, den: 1 };
  }
}
