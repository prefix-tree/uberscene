// A clip may play a 3D scene module instead of a file: `<Clip src={crossing} />`. The resolver gives each such clip
// an asset of its own in the state's manifest, so trims, speed, holds, transitions and the player's decoders treat it
// as footage, and hands the player the scene with its named times in scene seconds.
import { isScene, type Scene, stageTimeNames } from "@uberscene/kit";

import type { AssetEntry, AssetManifest } from "../manifest/types";
import type { ResolveError } from "./errors";
import type { CollectedTree } from "./tree";

/** A scene a clip plays, and the moments the clip hands in, in scene seconds. */
export interface SceneUse {
  readonly scene: Scene;
  readonly times: Readonly<Record<string, number>>;
  /** The frame it is drawn at: the composition's size and rate. */
  readonly width: number;
  readonly height: number;
  readonly fps: number;
}

const serials = new WeakMap<Scene, number>();
let nextSerial = 1;

function serialOf(scene: Scene): number {
  let n = serials.get(scene);
  if (n === undefined) {
    n = nextSerial++;
    serials.set(scene, n);
  }
  return n;
}

/** The asset a scene clip's length is read from while it is placed. */
export function sceneAssetId(clipId: string): string {
  return `scene:${clipId}`;
}

/** Whether an asset id is a scene's. */
export function isSceneAsset(id: string): boolean {
  return id.startsWith("scene:");
}

/**
 * The manifest with an entry for every clip that plays a scene: a video as long as the scene, the size and rate of
 * the composition, with no sound. The same manifest when no clip does.
 */
export function withSceneAssets(
  manifest: AssetManifest,
  tree: CollectedTree,
  composition: { readonly fps: number; readonly width: number; readonly height: number },
): AssetManifest {
  let assets: Record<string, AssetEntry> | null = null;
  for (const node of tree.byId.values()) {
    if (node.kind !== "clip" || !isScene(node.props.src)) continue;
    assets ??= { ...manifest.assets };
    const id = sceneAssetId(node.id);
    assets[id] = {
      id,
      kind: "video",
      duration: node.props.src.length,
      fps: composition.fps,
      width: composition.width,
      height: composition.height,
    } as AssetEntry;
  }
  return assets ? { ...manifest, assets } : manifest;
}

/**
 * The scene a placed clip plays, its named times in scene seconds, and the asset its frames come from. That asset's
 * id names the scene module and the times, so a reloaded module or a moved marker opens fresh frames.
 */
export function placeScene(
  clip: {
    readonly id: string;
    readonly start: number;
    readonly props: Readonly<Record<string, unknown>>;
    readonly source: { readonly in: number; readonly speed: number };
  },
  manifest: AssetManifest,
  markers: ReadonlyMap<string, number>,
  errors: ResolveError[],
): { readonly asset: string; readonly use: SceneUse } | null {
  const scene = clip.props.src;
  if (!isScene(scene)) return null;
  const times: Record<string, number> = {};
  for (const [name, at] of Object.entries((clip.props.times ?? {}) as Record<string, unknown>)) {
    let edit: number | undefined;
    if (typeof at === "number") edit = at;
    else if (typeof at === "string" && at.startsWith("marker:")) {
      edit = markers.get(at.slice("marker:".length));
      if (edit === undefined) {
        errors.push({ code: "SCHEMA", id: clip.id, prop: `times.${name}`, message: `no <Marker id="${at.slice(7)}">` });
        continue;
      }
    }
    if (edit === undefined) continue;
    // Where the clip plays that moment of the edit, in the scene's own seconds.
    times[name] = Math.round((clip.source.in + (edit - clip.start) * clip.source.speed) * 1e6) / 1e6;
  }
  for (const name of stageTimeNames(scene.stage))
    if (!(name in times))
      errors.push({
        code: "SCHEMA",
        id: clip.id,
        prop: "times",
        message: `the scene's keys use the time "${name}"; hand it in: times={{ ${name}: "marker:${name}" }}`,
      });
  const base = manifest.assets[sceneAssetId(clip.id)];
  const key = Object.entries(times)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
  const asset = `${sceneAssetId(clip.id)}#${serialOf(scene)}${key ? `@${key}` : ""}`;
  if (base) (manifest.assets as Record<string, AssetEntry>)[asset] = { ...base, id: asset };
  const frame = { width: base?.width ?? 1920, height: base?.height ?? 1080, fps: base?.fps ?? 30 };
  return { asset, use: { scene, times, ...frame } };
}
