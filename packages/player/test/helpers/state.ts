import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  capabilitiesOf,
  isMigratedKind,
  type Kind,
  resolveTheme,
  SCHEMAS_BY_KIND,
  Time,
  TimeRange,
} from "@uberscene/kit/schema";
import {
  type AssetManifest,
  buildRefGraph,
  type CollectedNode,
  collectModule,
  endSeconds,
  type Placement,
  type ResolvedState,
  type ResolvedTrack,
  resolve,
} from "@uberscene/sdk/resolver";

import * as sample from "../../../sdk/fixtures/sample";

/** A range in ticks from seconds, as the resolver makes it. */
function rangeOf(start: number, duration: number): TimeRange {
  return TimeRange.of(Time.seconds(start), Time.seconds(Math.max(0, duration)));
}

/** A placement's times, as its range. */
function timeOf(start: number, duration: number) {
  return { range: rangeOf(start, duration) };
}

export const kitFixturesDir = join(import.meta.dirname, "..", "..", "..", "sdk", "fixtures");
export const fixtureManifest = JSON.parse(
  readFileSync(join(kitFixturesDir, "sample.manifest.json"), "utf8"),
) as AssetManifest;

/** The kit's sample file, resolved. */
export function fixtureState(): ResolvedState {
  return resolve(collectModule(sample), fixtureManifest);
}

export function fixtureElement() {
  return sample.default(sample.defaults);
}

export interface ItemSpec {
  id: string;
  kind: Kind;
  start?: number;
  duration?: number;
  source?: { in: number; out: number; speed?: number; asset: string };
  props?: Record<string, unknown>;
  children?: ItemSpec[];
  text?: string;
  between?: [string, string];
}

export interface TrackSpec {
  id: string;
  layout?: "sequence" | "free";
  hidden?: boolean;
  muted?: boolean;
  solo?: boolean;
  role?: ResolvedTrack["role"];
  items: ItemSpec[];
}

export interface StateSpec {
  fps?: number;
  width?: number;
  height?: number;
  background?: { type: "color" | "blur"; color?: string };
  tracks: TrackSpec[];
  manifest?: AssetManifest;
  /** A camera over the named tracks: constants in `props`, keys as `[field, at, value, easing?]`. */
  camera?: {
    tracks: string[];
    props?: Partial<Record<"x" | "y" | "zoom" | "rotation", number>>;
    keys?: [field: "x" | "y" | "zoom" | "rotation", at: number, value: number, easing?: string][];
  };
}

export const DEFAULT_MANIFEST: AssetManifest = {
  assets: {
    a: {
      id: "a",
      kind: "video",
      duration: 10,
      fps: 30,
      width: 640,
      height: 360,
      audio: { sampleRate: 48000, channels: 2, streams: 1 },
    },
    b: {
      id: "b",
      kind: "video",
      duration: 20,
      fps: 30,
      width: 1280,
      height: 720,
      audio: { sampleRate: 48000, channels: 2, streams: 1 },
    },
    silent: { id: "silent", kind: "video", duration: 10, fps: 30, width: 640, height: 360 },
    tone: { id: "tone", kind: "audio", duration: 90, audio: { sampleRate: 48000, channels: 2, streams: 1 } },
    img: { id: "img", kind: "image", duration: 0, width: 128, height: 128 },
  },
};

/**
 * Build a ResolvedState by hand. Sequence tracks place items back to back
 * (transitions overlap the way the kit resolver does); free tracks take
 * `start`. Media items without `duration` take it from their source.
 */
export function makeState(spec: StateSpec): ResolvedState {
  const fps = spec.fps ?? 30,
    width = spec.width ?? 640,
    height = spec.height ?? 360;
  const manifest = spec.manifest ?? DEFAULT_MANIFEST;
  const items = new Map<string, Placement>();
  const byId = new Map<string, CollectedNode>();
  const tracks: ResolvedTrack[] = [];
  const trackNodes: CollectedNode[] = [];

  const node = (
    id: string,
    kind: Kind,
    parent: string | null,
    props: Record<string, unknown>,
    children: CollectedNode[],
    text?: string,
  ): CollectedNode => {
    const n: CollectedNode = {
      id,
      kind,
      parent,
      props,
      children,
      editable: "literal",
      lockedProps: [],
      boundProps: {},
      ...(text !== undefined ? { text } : {}),
    };
    byId.set(id, n);
    return n;
  };

  const place = (it: ItemSpec, track: string, parent: string, start: number): Placement => {
    const speed = it.source?.speed ?? 1;
    const source = it.source
      ? {
          in: it.source.in,
          out: it.source.out,
          speed,
          asset: it.source.asset,
          range: rangeOf(it.source.in, it.source.out - it.source.in),
        }
      : undefined;
    const duration = it.duration ?? (source ? (source.out - source.in) / speed : it.kind === "transition" ? 0.5 : 5);
    // The words of a kind whose content is words (a title): `text`, or the `text` some tests write among its props.
    const { text: written, ...given } = (it.props ?? {}) as Record<string, unknown>;
    const hasText = capabilitiesOf(it.kind).hasText;
    const text = hasText ? (it.text ?? (typeof written === "string" ? written : "")) : it.text;
    const raw: Record<string, unknown> = { id: it.id, ...(hasText ? given : (it.props ?? {})) };
    // A kind with a folder of its own is drawn from its props as their types, so they are parsed as the resolver does.
    // A test writes footage's source apart (`source`), and a nested sequence's scene not at all: what its schema
    // needs is filled from them.
    const shape = (SCHEMAS_BY_KIND[it.kind] as unknown as { shape?: Record<string, unknown> }).shape ?? {};
    const filled: Record<string, unknown> = {
      ...("src" in shape && raw.src === undefined ? { src: `asset:${it.source?.asset ?? "missing"}` } : {}),
      ...("of" in shape && raw.of === undefined ? { of: () => null } : {}),
      ...raw,
    };
    const props = isMigratedKind(it.kind)
      ? (SCHEMAS_BY_KIND[it.kind].parse({
          // Its timing, where its schema takes it: a transition and a gap take a length and no start.
          ...("start" in shape ? { start } : {}),
          ...("duration" in shape ? { duration } : {}),
          ...filled,
        }) as Record<string, unknown>)
      : raw;
    const childNodes: CollectedNode[] = [];
    const childPlacements: Placement[] = [];
    for (const c of it.children ?? []) {
      let cs = start,
        cd = duration;
      if (c.kind === "keyframe" || c.kind === "speedKey") {
        cs = start + Number(c.props?.at ?? 0);
        cd = 0;
      }
      if (c.kind === "freeze") {
        cs = start + Number(c.props?.start ?? 0);
        cd = Number(c.props?.duration ?? 0);
      }
      // Keyframes inside a child (an effect's own), placed at the element's start plus their `at`.
      const grand: Placement[] = (c.children ?? []).map((g) => {
        const at = start + Number(g.props?.at ?? 0);
        const gp: Placement = {
          id: g.id,
          kind: g.kind,
          track,
          parent: c.id,
          children: [],
          ...timeOf(at, 0),
          props: { id: g.id, ...(g.props ?? {}) },
          editable: "literal",
          parsed: true,
          lockedProps: [],
          boundProps: {},
          errors: [],
        };
        items.set(g.id, gp);
        return gp;
      });
      const cp: Placement = {
        id: c.id,
        kind: c.kind,
        track,
        parent: it.id,
        children: grand.map((g) => g.id),
        ...timeOf(cs, cd),
        props: { id: c.id, ...(c.props ?? {}) },
        editable: "literal",
        parsed: true,
        lockedProps: [],
        boundProps: {},
        errors: [],
      };
      items.set(c.id, cp);
      childPlacements.push(cp);
      childNodes.push(
        node(
          c.id,
          c.kind,
          it.id,
          cp.props as Record<string, unknown>,
          grand.map((g) => node(g.id, g.kind, c.id, g.props as Record<string, unknown>, [])),
        ),
      );
    }
    node(it.id, it.kind, parent, props, childNodes, text);
    const p: Placement = {
      id: it.id,
      kind: it.kind,
      track,
      parent,
      children: childPlacements.map((c) => c.id),
      ...timeOf(start, duration),
      ...(source ? { source } : {}),
      props,
      editable: "literal",
      parsed: true,
      lockedProps: [],
      boundProps: {},
      errors: [],
      ...(it.between ? { between: it.between } : {}),
      ...(hasText ? { text: text ?? "", runs: [] } : {}),
    };
    items.set(it.id, p);
    return p;
  };

  spec.tracks.forEach((t, order) => {
    const layout = t.layout ?? "sequence";
    let cursor = 0;
    let pendingTransition: ItemSpec | null = null;
    let prev: Placement | null = null;
    const placed: Placement[] = [];
    for (const it of t.items) {
      if (layout === "sequence") {
        if (it.kind === "transition") {
          pendingTransition = it;
          continue;
        }
        if (pendingTransition && prev) {
          const d = pendingTransition.duration ?? 0.5;
          const xs = Math.max(0, cursor - d);
          placed.push(place({ ...pendingTransition, duration: d, between: [prev.id, it.id] }, t.id, t.id, xs));
          cursor = xs;
        }
        pendingTransition = null;
        const p = place(it, t.id, t.id, cursor);
        placed.push(p);
        cursor = endSeconds(p);
        prev = it.kind === "gap" ? null : p;
      } else {
        placed.push(place(it, t.id, t.id, it.start ?? 0));
      }
    }
    const trackNode = node(
      t.id,
      "track",
      "composition",
      { id: t.id, layout },
      placed.map((p) => byId.get(p.id)!),
    );
    trackNodes.push(trackNode);
    tracks.push({
      id: t.id,
      layout,
      order,
      locked: false,
      hidden: t.hidden ?? false,
      muted: t.muted ?? false,
      solo: t.solo ?? false,
      ...(t.role ? { role: t.role } : {}),
      items: placed.map((p) => p.id),
    });
  });

  const duration = Math.max(0, ...[...items.values()].filter((i) => i.kind !== "transition").map((i) => endSeconds(i)));
  for (const t of tracks) {
    items.set(t.id, {
      id: t.id,
      kind: "track",
      track: t.id,
      parent: "composition",
      children: t.items,
      ...timeOf(0, duration),
      props: { id: t.id, layout: t.layout },
      editable: "literal",
      parsed: true,
      lockedProps: [],
      boundProps: {},
      errors: [],
    });
  }
  if (spec.camera) {
    const base = { editable: "literal" as const, parsed: true, lockedProps: [], boundProps: {}, errors: [] };
    const keys = (spec.camera.keys ?? []).map(([field, at, value, easing], i) => {
      const id = `cam.${field}.${i}`;
      items.set(id, {
        ...base,
        id,
        kind: "keyframe",
        track: null,
        parent: "cam",
        children: [],
        ...timeOf(at, 0),
        props: { id, property: `camera.${field}`, at, value, easing: easing ?? "linear" },
      });
      return id;
    });
    items.set("cam", {
      ...base,
      id: "cam",
      kind: "camera",
      track: null,
      parent: "composition",
      children: [...spec.camera.tracks, ...keys],
      ...timeOf(0, duration),
      props: { id: "cam", x: 0, y: 0, zoom: 1, rotation: 0, ...spec.camera.props },
    });
    for (const [i, t] of tracks.entries()) if (spec.camera.tracks.includes(t.id)) tracks[i] = { ...t, camera: "cam" };
  }
  const compProps = {
    id: "composition",
    fps,
    width,
    height,
    ...(spec.background ? { background: spec.background } : {}),
  };
  const root = node("composition", "composition", null, compProps, trackNodes);
  items.set("composition", {
    id: "composition",
    kind: "composition",
    track: null,
    parent: null,
    children: tracks.map((t) => t.id),
    ...timeOf(0, duration),
    props: compProps,
    editable: "literal",
    parsed: true,
    lockedProps: [],
    boundProps: {},
    errors: [],
  });
  return {
    composition: {
      id: "composition",
      fps,
      rate: { num: fps, den: 1 },
      width,
      height,
      duration,
      length: Time.seconds(duration),
    },
    tracks,
    items,
    errors: [],
    tree: { root, byId, errors: [] },
    manifest,
    log: undefined,
    theme: resolveTheme(undefined),
    fonts: [],
    shaders: [],
    refs: buildRefGraph(
      { root, byId, errors: [] },
      {
        kindOf: (id) => byId.get(id)?.kind,
        trackOf: (id) => items.get(id)?.track ?? null,
        cameraOfTrack: (track) => tracks.find((t) => t.id === track)?.camera,
        propsOf: (id) => items.get(id)?.props ?? {},
        tracks,
      },
    ).graph,
  };
}

export function childrenOf(state: ResolvedState, id: string): Placement[] {
  return (state.items.get(id)?.children ?? []).map((c) => state.items.get(c)!).filter(Boolean);
}
