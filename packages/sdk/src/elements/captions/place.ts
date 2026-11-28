// How captions time their cues once every track is placed: a word on a written cue is where that word plays, and
// with no written cues, cues are made from the asset's transcript along the timeline. The `makes` hook of its entry.
import { capabilitiesOf, Time } from "@uberscene/kit/schema";

import { parseTimeRef, resolveTimeRef } from "../../manifest/timeref";
import { type AssetEntry, type AssetManifest, lookupAsset } from "../../manifest/types";
import { Cache } from "../../resolve/cache";
import type { ResolveError } from "../../resolve/errors";
import type { Makes, Pending, PlacedMaker, ResolvedTrack } from "../../resolve/resolve";
import type { CollectedNode } from "../../resolve/tree";
import { T } from "../../time";
import { sdkElement } from "..";
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
} from "./cues";

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
function make(m: PlacedMaker, node: CollectedNode, cp: Pending): void {
  const { root, pending, tracks, manifest, markers } = m;
  const src = typeof cp.props.src === "string" ? cp.props.src : null;
  const asset = src ? lookupAsset(manifest, src) : null;
  const plays = src ? assetPlays(src, pending, tracks) : [];
  const literal = node.children.filter((c) => sdkElement(c.kind)?.made);
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
    return;
  }
  if (!asset?.transcript) return;
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
    const timed = m.add(cue, null, node.id, cue.props as Record<string, unknown>);
    timed.start = T(Number(cue.props.start));
    timed.duration = T(Number(cue.props.end)).minus(T(Number(cue.props.start)));
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

export const makesCues: Makes = { when: "placed", make };
