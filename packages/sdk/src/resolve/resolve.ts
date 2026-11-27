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
  type Kind,
  keyPathOfProperty,
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
  type TextRun,
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

import { sdkElement } from "../elements";
import { parseTimeRef, resolveTimeRef } from "../manifest/timeref";
import { type AssetEntry, type AssetManifest, assetIdOf, lookupAsset } from "../manifest/types";
import type { PatchLog } from "../patches/types";
import { T } from "../time";
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
import { derivedOrigin, expandKeys } from "./expand";
import { lowerLinks } from "./link";
import { overlay } from "./overlay";
import { type PushSpec, pushKeys } from "./push";
import { buildRefGraph, type RefGraph } from "./refs";
import { placeScene, type SceneUse, sceneAssetId, withSceneAssets } from "./scene3d";
import { freezeHoldsOf, heldWithin, holdTotal, rampAdvance, rampInverse, reachedHolds, speedKeysOf } from "./speed";
import type { CollectedNode, CollectedTree, Editable, LayerInterior } from "./tree";

export interface Placement {
  readonly id: string;
  readonly kind: Kind;
  readonly track: string | null;
  readonly parent: string | null;
  readonly children: readonly string[];
  /** Where it plays on the timeline, as exact `Time`s (decisions 0044, 0045). For seconds, `range.start.toSeconds()`. */
  readonly range: TimeRange;
  readonly source?: PlacementSource;
  /**
   * Whether `props` are what the kind's schema parsed: every prop of its type, every default filled. A prop the
   * schema refuses is reported and left out, a refused key inside an object first (`style.size`) and the whole prop
   * if that is not enough, so this is false only when what is left still does not parse: a prop the element cannot
   * do without is missing or wrong. Such an element keeps its row and its errors and is not drawn.
   */
  readonly parsed: boolean;
  /** Schema-parsed props with defaults applied, after patches. The props as written when `parsed` is false. */
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
  /** The words written inside it, for a kind whose content is words (a title); absent on every other. */
  readonly text?: string;
  /** The stretches of `text` its `<Mark>`s draw their own way, where there is `text`. */
  readonly runs?: readonly TextRun[];
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
  /** Every reference between elements: what names what, and the order to work them out in. */
  readonly refs: RefGraph;
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
  source?: PendingSource;
  /** Intrinsic length, when it does not depend on other elements. */
  duration?: Time;
  durationDep?: { kind: "match"; id: string } | { kind: "until"; id: string; at?: string } | { kind: "fill" };
  start?: Time;
  /** `at` is a word, shot or silence of the anchor's source: the start is where the anchor plays it, plus `offset`. */
  anchorDep?: { id: string | "start"; offset: Time; edge?: "end"; at?: string };
  between?: readonly [string, string];
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
): ResolvedState {
  // The tree as written, with the log over it: what the editor reads and writes. Its key lists, effects, speed keys
  // and holds are expanded into items for placing.
  const written = overlay(original, log);
  const tree = expandKeys(written);
  fileShaders = original.shaders ?? [];
  const errors: ResolveError[] = [...tree.errors];
  const root = tree.root;
  const theme = resolveTheme(root.props.theme);
  const compParsed = parseProps(root, errors, theme);
  // A clip that plays a 3D scene reads its length from an asset made for it (`withSceneAssets`).
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
    // What the kind's placement holds from the file besides its props: a title's words.
    const facts = sdkElement(node.kind)?.facts?.(node);
    if (
      prev &&
      prev.kind === node.kind &&
      prev.text === facts?.text &&
      prev.runs === facts?.runs &&
      prev.track === track &&
      prev.parent === parent &&
      prev.range.equals(range) &&
      prev.props === props &&
      prev.editable === node.editable &&
      prev.lockedProps === node.lockedProps &&
      prev.boundProps === node.boundProps &&
      sameSource(prev.source, pendingSource) &&
      sameBetween(prev.between, between) &&
      prev.interior === node.interior &&
      sameChildIds(prev.children, node.children) &&
      sameErrors(prev.errors, errors)
    )
      return prev;
    // Only a placement that changed works out its source's range.
    const source = withRange(pendingSource);
    const placement: Placement = {
      id: node.id,
      kind: node.kind,
      track,
      parent,
      children: node.children.map((c) => c.id),
      range,
      props,
      editable: node.editable,
      lockedProps: node.lockedProps,
      boundProps: node.boundProps,
      errors,
      ...(source ? { source } : {}),
      ...(between ? { between } : {}),
      ...(node.interior ? { interior: node.interior } : {}),
      ...propsFields(props),
      ...facts,
    };
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
  let order = 0;
  // A camera's tracks are numbered in place, so the file's order is the drawing order across the camera's edge.
  const addTrack = (child: CollectedNode, camera: string | undefined): void => {
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
      items: child.children.map((c) => c.id),
    });
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

  // Every reference between elements, read once the tracks are known: who is on which, and under the camera.
  const refs = buildRefGraph(tree, {
    kindOf: (id) => tree.byId.get(id)?.kind,
    trackOf: (id) => pending.get(id)?.track ?? null,
    cameraOfTrack: (track) => (track === null ? undefined : tracks.find((t) => t.id === track)?.camera),
    propsOf: (id) => pending.get(id)?.props ?? tree.byId.get(id)?.props ?? {},
    tracks,
  });

  for (const error of refs.errors.get("duck") ?? []) pending.get(error.id)?.errors.push(error);
  for (const p of pending.values()) {
    if (p.props.frame && p.source) p.props = framed(p.props, manifest.assets[p.source.asset], compParsed);
  }

  // Place track children: sequence cursors, free starts; anchors and dependent durations by iteration.
  for (const track of tracks) {
    const trackNode = tree.byId.get(track.id);
    if (!trackNode) continue;
    placeTrack(trackNode, track, pending, theme, errors);
  }
  iterateDependencies(pending, manifest);
  placeCaptions(root, pending, tracks, manifest, markers);

  let compositionEnd = Time.ZERO;
  for (const p of pending.values()) {
    // Something with no length shows and sounds nothing, so it does not make the video longer.
    if (p.start !== undefined && p.duration?.isAfter(Time.ZERO) && p.node.kind !== "transition")
      compositionEnd = Time.max(compositionEnd, p.start.plusClamped(p.duration));
  }
  for (const p of pending.values()) {
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
      delete p.durationDep;
    }
  }
  // An element that matches a filling one could not take its length until now.
  settleMatches(pending, manifest);
  for (const p of pending.values()) {
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
      children: child.children.map((c) => c.id),
      range: TimeRange.EMPTY,
      props,
      editable: child.editable,
      lockedProps: child.lockedProps,
      boundProps: child.boundProps,
      errors: own,
      ...propsFields(props),
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
        children: child.children.map((c) => c.id),
        range: TimeRange.EMPTY,
        props,
        editable: child.editable,
        lockedProps: child.lockedProps,
        boundProps: child.boundProps,
        errors: own,
        ...propsFields(props),
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
        ...propsFields(props),
      });
    }
  }
  let duration = Time.ZERO;
  for (const p of pending.values()) {
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
    items.set(p.node.id, placement);
    if (p.errors.length > 0) errors.push(...p.errors);
    if (p.node.kind !== "transition" && !placement.range.isEmpty()) duration = Time.max(duration, placement.range.end);
    duration = placeChildren(p.node, placement, items, errors, place, duration, theme);
  }

  for (const s of structural) {
    items.set(
      s.id,
      reuse(s.kind === "track" || s.kind === "camera" ? { ...s, range: rangeOf(s.range.start, duration) } : s),
    );
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
        refs.graph,
      );
      errors.push(...(refs.errors.get("push") ?? []));
      const count = { x: 0, y: 0, zoom: 0 };
      const ids: string[] = [];
      for (const key of made) {
        const id = `${camera.id}.push.${key.field}.${count[key.field]++}`;
        // A key's props, as a key written in the file resolves to: what it sets, when and how. Its id is the item's.
        const props = {
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
        items.set(id, place(node, null, camera.id, T(key.at), Time.ZERO, props, [], undefined, undefined));
        ids.push(id);
      }
      if (ids.length > 0) items.set(camera.id, reuse({ ...pushed, children: [...pushed.children, ...ids] }));
    }
  }
  // A value linked to another's becomes that value's keys, once the push has made the camera's: so a link reads a
  // pushed camera too, and everything after this reads a link as keys.
  const linkErrors = refs.errors.get("link") ?? [];
  if (linkErrors.length > 0 || refs.graph.edges.some((e) => e.type === "link")) {
    errors.push(...linkErrors);
    errors.push(
      ...lowerLinks(refs.graph, {
        items,
        add: (owner, parent, id, kind, props, at) => {
          const node: CollectedNode = {
            id,
            kind,
            props,
            children: [],
            parent,
            editable: owner.editable,
            lockedProps: [],
            boundProps: {},
          };
          // A key before its element starts (the linked value moved earlier) still stands at the video's start or after.
          const start = at === null ? owner.range.start : Time.max(Time.ZERO, owner.range.start.plusClamped(T(at)));
          const length = at === null ? owner.range.duration : Time.ZERO;
          items.set(id, place(node, owner.track, parent, start, length, props, [], undefined, undefined));
        },
        setChildren: (id, children) => {
          const held = items.get(id);
          if (held) items.set(id, reuse({ ...held, children }));
        },
      }),
    );
  }
  items.set(
    root.id,
    reuse({
      id: root.id,
      kind: "composition",
      track: null,
      parent: null,
      children: root.children.map((c) => c.id),
      range: rangeOf(Time.ZERO, duration),
      props: compParsed,
      editable: root.editable,
      lockedProps: root.lockedProps,
      boundProps: root.boundProps,
      errors: [],
      ...propsFields(compParsed),
    }),
  );
  errors.push(...textureErrors(items, manifest));
  errors.push(...keyframeErrors(items));
  errors.push(...generatorErrors(items));
  errors.push(...(refs.errors.get("follow") ?? []));
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
    refs: refs.graph,
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
const parsedByProps = new WeakMap<object, ParsedProps>();
/** Which parsed props the theme supplied, keyed by the parsed `data`. */
const themedByData = new WeakMap<object, Readonly<Record<string, ThemeOrigin>>>();
/** The `data` the schema did not parse, even with what it refused left out: the props as written. */
const unparsedData = new WeakSet<object>();

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

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Raw props without what the schema refused. `deepest` leaves out the key each issue is at, as deep as objects go: a
 * key inside an object prop, the prop itself where the path goes into a list. `prop` leaves out the whole prop.
 */
function without(
  props: Readonly<Record<string, unknown>>,
  issues: readonly z.core.$ZodIssue[],
  how: "deepest" | "prop",
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...props };
  /** The object at `path` in `out`, each level copied on the way so the given props are not changed; null past a list. */
  const reach = (path: readonly PropertyKey[]): Record<string, unknown> | null => {
    let at = out;
    for (const key of path) {
      const next = at[String(key)];
      if (!isObject(next)) return null;
      const copy = { ...next };
      at[String(key)] = copy;
      at = copy;
    }
    return at;
  };
  for (const issue of issues) {
    const path = issue.path;
    // A key the element, or an object inside it, does not take at all.
    if (issue.code === "unrecognized_keys") {
      const holder = how === "deepest" || path.length === 0 ? reach(path) : null;
      if (holder) for (const k of issue.keys) delete holder[k];
      else if (path.length > 0) delete out[String(path[0])];
      continue;
    }
    if (path.length === 0) continue;
    if (how === "prop") {
      delete out[String(path[0])];
      continue;
    }
    // As deep as the path stays in objects: the key that holds a list goes whole.
    let depth = path.length - 1;
    let holder = reach(path.slice(0, depth));
    while (!holder && depth > 0) {
      depth -= 1;
      holder = reach(path.slice(0, depth));
    }
    if (holder) delete holder[String(path[depth])];
  }
  return out;
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
    const given = node.kind === "composition" ? withoutPending(themed.props) : themed.props;
    const result = schema.safeParse(given);
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
      // A value the schema refuses is reported and then left out, so the element is placed as if it was not written:
      // a speed of 0 or a negative duration must not reach the arithmetic and place something for ever, or backwards.
      // First only what is refused goes, a key inside an object where that is where the fault is (`style.size`), so
      // the rest of the prop stays; then the whole prop. Without them the rest usually parses, and takes its defaults.
      const narrowly = schema.safeParse(without(given, result.error.issues, "deepest"));
      const kept = narrowly.success ? given : without(given, result.error.issues, "prop");
      const again = narrowly.success ? narrowly : schema.safeParse(kept);
      if (again.success) data = again.data as Record<string, unknown>;
      else {
        data = kept;
        unparsedData.add(data);
      }
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

/**
 * Keys renamed in 0.6, by element kind and the object they are in (`""` for the element's own props): old to new. A
 * kind with a folder of its own says its renames there (`SdkElement.renamed`).
 */
const RENAMED_KEYS: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>> = {
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
function movedKey(kind: Kind, issue: z.core.$ZodIssue, props: Readonly<Record<string, unknown>>): string | undefined {
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
  const element = sdkElement(kind);
  const renamed = (element?.renamed ?? RENAMED_KEYS[kind])?.[at];
  const respelled = renamed ? issue.keys.filter((k) => Object.hasOwn(renamed, k)) : [];
  if (renamed && respelled.length > 0) {
    const path = (k: string) => (at ? `${at}.${k}` : k);
    return `${respelled.map((k) => `\`${path(k)}\` is now \`${path(renamed[k] as string)}\``).join(", ")}; ${fix}`;
  }
  if (at === "transform" && issue.keys.includes("position"))
    return `transform.position moved to box, in pixels from the frame's top left: box={{ x, y, origin: "center" }} draws what it did with x and y each plus half the frame; ${fix}`;
  // What the kind itself says of keys it moved (a title's look into `style`).
  if (element?.moved) {
    const said = element.moved(at, issue.keys);
    return said.length > 0 ? `${said.join(", ")}; ${fix}` : undefined;
  }
  const listed = (moved: readonly string[], into: string) =>
    moved.map((k) => `\`${k}\` is now \`${into}.${k}\``).join(", ");
  if (kind !== "captions") return undefined;
  if (at === "" && issue.keys.includes("align")) return `${listed(["align"], "style")}; ${fix}`;
  if (at === "style" && issue.keys.includes("position"))
    return `style.position moved to box: the captions sit in the lower safe area unless their box says otherwise, as box={{ y, origin: "top" | "center" }}; ${fix}`;
  const flat = issue.keys.filter((k) => k === "x" || k === "y" || k === "width");
  if (at === "" && flat.length > 0)
    return `${flat.join(", ")} moved to box, in pixels from the frame's top left; ${fix}`;
  return undefined;
}

/** What a placement says about its props besides holding them: whether they parsed, and what the theme supplied. */
function propsFields(props: Record<string, unknown>): Pick<Placement, "parsed" | "themed"> {
  const themed = themedByData.get(props);
  return { parsed: !unparsedData.has(props), ...(themed ? { themed } : {}) };
}

/** What `intrinsic` derives for a node; cached per node object and copied into a fresh Pending each resolve. */
interface IntrinsicEntry {
  readonly manifest: AssetManifest;
  readonly markersKey: string;
  readonly theme: ResolvedTheme;
  /** The parent's parsed props a caption's transcript references were resolved against. */
  readonly parentProps: Record<string, unknown> | undefined;
  readonly template: Readonly<
    Pick<Pending, "props" | "errors" | "source" | "start" | "duration" | "durationDep" | "anchorDep">
  >;
}
const intrinsicByNode = new WeakMap<CollectedNode, IntrinsicEntry>();

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
    const p: Pending = { node, track, parent: node.parent, props: t.props, errors: [...t.errors] };
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
  const p = intrinsicCompute(node, track, pending, manifest, markers, markersKey, theme, errors);
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
  const p: Pending = { node, track, parent: node.parent, props, errors: own };
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

const framedByProps = new WeakMap<Record<string, unknown>, { key: string; props: Record<string, unknown> }>();

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
  if (unparsedData.has(props)) unparsedData.add(out);
  framedByProps.set(props, { key, props: out });
  return out;
}

/** Keys on an effect's params: each value one that param's schema takes. */
/** A wobble or a drift on `box.x` or `box.y` needs a place to be added to: with none, the element is centred. */
function generatorErrors(items: ReadonlyMap<string, Placement>): ResolveError[] {
  const out: ResolveError[] = [];
  for (const g of items.values()) {
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

function keyframeErrors(items: ReadonlyMap<string, Placement>): ResolveError[] {
  const out: ResolveError[] = [];
  for (const k of items.values()) {
    if (k.kind !== "keyframe") continue;
    const parent = k.parent ? items.get(k.parent) : undefined;
    const property = k.props.property;
    const check = typeof property === "string" ? keyPathOfProperty(property)?.check : undefined;
    if (check) {
      const problem = check(k.props.value);
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
  const computed = [".generator", ".link"].find((suffix) => origin.path.endsWith(suffix));
  if (computed) {
    // A generator's fields, and a link's, are written inside the value it stands for: `transform.rotation.amount`.
    const { prop, ...rest } = error;
    const at = origin.path.slice(0, -computed.length);
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
function textureErrors(items: ReadonlyMap<string, Placement>, manifest: AssetManifest): ResolveError[] {
  const out: ResolveError[] = [];
  for (const p of items.values()) {
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

function placeTrack(
  trackNode: CollectedNode,
  track: ResolvedTrack,
  pending: Map<string, Pending>,
  theme: ResolvedTheme,
  errors: ResolveError[],
): void {
  let cursor = Time.ZERO;
  let prevClip: Pending | null = null;
  let pendingTransition: Pending | null = null;
  /** The length of the transition that leads into `prevClip`, to see that two transitions do not meet inside it. */
  let intoPrev = Time.ZERO;
  for (const child of trackNode.children) {
    const p = pending.get(child.id);
    if (!p) continue;
    const caps = capabilitiesOf(child.kind);
    if (child.kind === "multicam") {
      placeMulticam(child, p, track, pending, theme, errors);
      continue;
    }
    if (child.kind === "transition") {
      if (typeof p.props.on === "string") {
        p.anchorDep = { id: p.props.on, offset: Time.ZERO };
        // Edge transitions attach to a clip edge; resolved in iterateDependencies with edge logic.
        continue;
      }
      if (track.layout !== "sequence") {
        p.errors.push({
          code: "NOT_ADJACENT",
          id: child.id,
          message: "a transition between siblings needs a sequence track; use on/edge on free tracks",
        });
        p.start = Time.ZERO;
        continue;
      }
      if (pendingTransition) {
        pendingTransition.errors.push({
          code: "NOT_ADJACENT",
          id: pendingTransition.node.id,
          message: "a transition needs a clip on each side, not another transition",
        });
        pendingTransition.start = cursor;
      }
      pendingTransition = p;
      continue;
    }
    if (p.anchorDep) {
      if (typeof p.props.start === "number")
        p.errors.push({
          code: "SCHEMA",
          id: child.id,
          prop: "start",
          message: "anchored elements take offset, not start",
        });
      continue;
    }
    if (!caps.timed) continue;
    if (track.layout === "free") {
      // A start the schema refused is already reported; it is not also missing.
      if (typeof p.props.start !== "number" && child.props.start === undefined)
        p.errors.push({
          code: "MISSING_START",
          id: child.id,
          prop: "start",
          message: "elements on a free track need start",
        });
      p.start = T(lengthOr(p.props.start, 0));
      continue;
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
      delete p.durationDep;
    }
    if (pendingTransition && child.kind === "gap") {
      pendingTransition.errors.push({
        code: "NOT_ADJACENT",
        id: pendingTransition.node.id,
        message: "a transition needs a clip on each side, not a gap",
      });
      pendingTransition.start = cursor;
      pendingTransition = null;
    }
    let into = Time.ZERO;
    if (pendingTransition && prevClip) {
      const d = pendingTransition.duration ?? Time.ZERO;
      const outgoing = prevClip.duration ?? Time.ZERO;
      // Lengths are ticks, so they compare exactly: a clip from 1.1 to 1.3 is 0.2 s long, and a 0.2 s transition fits it.
      if (d.isAfter(outgoing) || (p.duration !== undefined && d.isAfter(p.duration))) {
        pendingTransition.errors.push({
          code: "INSUFFICIENT_HANDLES",
          id: pendingTransition.node.id,
          message: "transition is longer than one of its clips",
        });
      } else if (intoPrev.plusClamped(d).isAfter(outgoing)) {
        pendingTransition.errors.push({
          code: "INSUFFICIENT_HANDLES",
          id: pendingTransition.node.id,
          message: `"${prevClip.node.id}" is shorter than the transitions on its two sides together, so they would overlap`,
        });
      }
      // A transition that does not fit is told above and held to what its clips have: the part of the outgoing clip
      // that the transition before has not used, and the whole of the incoming one. Longer, the incoming clip would
      // start before the outgoing one does.
      const room = outgoing.minus(intoPrev);
      const fit = Time.max(Time.ZERO, Time.min(Time.min(d, room), p.duration ?? d));
      if (fit.isBefore(d)) pendingTransition.duration = fit;
      into = fit;
      const start = cursor.minus(fit);
      pendingTransition.start = start;
      pendingTransition.between = [prevClip.node.id, child.id];
      cursor = start;
    } else if (pendingTransition) {
      pendingTransition.errors.push({
        code: "NOT_ADJACENT",
        id: pendingTransition.node.id,
        message: "a transition needs a clip on each side",
      });
      pendingTransition.start = cursor;
    }
    pendingTransition = null;
    intoPrev = into;
    p.start = cursor;
    if (p.duration !== undefined) cursor = cursor.plusClamped(p.duration);
    else p.durationDep ??= { kind: "fill" }; // match deps settle later; cursor cannot advance past an unknown length
    if (p.durationDep?.kind === "match" || p.durationDep?.kind === "until") {
      p.errors.push({
        code: "AMBIGUOUS_DURATION",
        id: child.id,
        prop: "duration",
        message: `${p.durationDep.kind} durations are not allowed inside a sequence`,
      });
      p.duration = Time.ZERO;
      delete p.durationDep;
    }
    prevClip = child.kind === "gap" ? null : p;
  }
  if (pendingTransition) {
    pendingTransition.errors.push({
      code: "NOT_ADJACENT",
      id: pendingTransition.node.id,
      message: "a transition needs a clip on each side",
    });
    pendingTransition.start = cursor;
  }
}

/** For a placement the resolver makes with the schema's defaults filled in: its props without them. */
const writtenByProps = new WeakMap<object, Readonly<Record<string, unknown>>>();

/**
 * A placement's props as a file would write them. They are its props, except for an element the resolver makes and
 * fills the schema's defaults into (a multicam's clips): those are without the defaults, so a bake writes
 * `<Clip src in />` and not every default beside it.
 */
export function propsAsWritten(placement: Placement): Readonly<Record<string, unknown>> {
  return writtenByProps.get(placement.props) ?? placement.props;
}

let madeClipDefaults: Readonly<Record<string, unknown>> | undefined;
/** What the clip schema fills in for a clip that writes only its source: the props a clip the resolver makes takes. */
function clipDefaults(): Readonly<Record<string, unknown>> {
  if (!madeClipDefaults) {
    const {
      id: _id,
      src: _src,
      ...rest
    } = SCHEMAS_BY_KIND.clip.parse({ id: "made", src: "asset:made" }) as Record<string, unknown>;
    madeClipDefaults = rest;
  }
  return madeClipDefaults;
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
    // What a file would write for this clip, and what the clip schema parses that to: the placement holds the
    // second, defaults and all, so it reads as any other clip; a bake writes the first.
    const written = { id, src: angle.src, in: inSec };
    const parsed = { ...written, ...clipDefaults() };
    writtenByProps.set(parsed, written);
    const generated: CollectedNode = {
      id,
      kind: "clip",
      parent: node.id,
      children: [],
      editable: "generated",
      lockedProps: [],
      boundProps: {},
      props: written,
      origin: { helper: "multicam", callerId: node.id, callIndex: 0 },
    };
    const gp: Pending = {
      node: generated,
      track: track.id,
      parent: node.id,
      props: parsed,
      errors: [],
      start: T(cut.at),
    };
    gp.source = { in: inSec, out: inSec, speed: 1, asset: assetIdOf(String(angle.src)) };
    if (next) {
      gp.duration = T(next.at).minus(T(cut.at));
      gp.source = { ...gp.source, out: inSec + gp.duration.toSeconds() };
    } else {
      gp.durationDep = { kind: "fill" };
    }
    pending.set(id, gp);
  });
  p.durationDep = { kind: "fill" };
}

function iterateDependencies(pending: Map<string, Pending>, manifest: AssetManifest): void {
  // A pass that places nothing ends the loop, so a cycle still stops; a pass that places something places at least one
  // element, so a chain of any length, in any order, is placed within one pass per element.
  for (let pass = 0; pass <= pending.size; pass++) {
    let progressed = false;
    for (const p of pending.values()) {
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
          delete p.anchorDep;
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
          delete (p as Pending).durationDep;
          progressed = true;
        } else if (takeLength(p, target, manifest)) progressed = true;
      }
    }
    if (!progressed) break;
  }
  for (const p of pending.values()) {
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
      delete p.anchorDep;
      delete p.durationDep;
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
  delete (p as Pending).durationDep;
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
function settleMatches(pending: Map<string, Pending>, manifest: AssetManifest): void {
  for (let pass = 0; pass <= pending.size; pass++) {
    let progressed = false;
    for (const p of pending.values()) {
      if (!follows(p) || p.duration !== undefined) continue;
      const target = pending.get(p.durationDep.id);
      if (target && takeLength(p, target, manifest)) progressed = true;
    }
    if (!progressed) break;
  }
  for (const p of pending.values()) {
    if (!follows(p) || p.duration !== undefined) continue;
    p.errors.push({
      code: "CYCLE",
      id: p.node.id,
      message: `"${p.node.id}" depends on itself through anchors or match durations`,
    });
    p.duration = Time.ZERO;
    delete (p as Pending).durationDep;
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
    if (own.length > 0) errors.push(...own);
    // What is inside an element does not make the video longer: a key or a hold written past its element's end is
    // still that element's.
    end = placeChildren(child, placement, items, errors, place, end, theme);
  }
  return end;
}

interface CueMemo {
  readonly key: string;
  readonly manifest: AssetManifest;
  readonly props: Record<string, unknown>;
  readonly nodes: readonly CollectedNode[];
}
const cuesByCaptions = new WeakMap<CollectedNode, CueMemo>();

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
    let nodes: readonly CollectedNode[];
    if (hit && hit.key === key && hit.manifest === manifest && hit.props === cp.props) nodes = hit.nodes;
    else {
      const options: CueOptions = {
        maxChars: Number(cp.props.maxChars ?? lineChars(root, cp.props.style)),
        maxDuration: Number(cp.props.maxDuration ?? 5),
        maxGap: Number(cp.props.maxGap ?? 0.8),
        ...(Array.isArray(cp.props.breakAfter)
          ? { breakAfter: new Set((cp.props.breakAfter as string[]).map((ref) => Number(ref.slice("word:".length)))) }
          : {}),
      };
      nodes = cueNodes(node, planCues(timelineWords(asset, plays), options), (id) => pending.has(id));
      cuesByCaptions.set(node, { key, manifest, props: cp.props, nodes });
    }
    for (const cue of nodes) {
      pending.set(cue.id, {
        node: cue,
        track: null,
        parent: node.id,
        props: cue.props as Record<string, unknown>,
        errors: [],
        start: T(Number(cue.props.start)),
        duration: T(Number(cue.props.end)).minus(T(Number(cue.props.start))),
      });
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
    if (!capabilitiesOf(p.node.kind).playsAsset) continue;
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
