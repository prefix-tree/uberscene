// What a `<Clip>` paints on the canvas: its asset's frame at its source time, or an error box where the asset is
// missing, cut out by its matte when it asks for one.
import { type AssetEntry, lookupAsset, type PlacementMap, type ResolvedState } from "@uberscene/sdk/resolver";

import type { MatteSpec } from "../../model/frame-plan";
import { placementSourceTime } from "../../model/time";
import { layoutRect } from "../../model/transform";
import { footageOps } from "../footage/canvas";

export const clipOps = footageOps<"clip">(({ ctx, item, common, transform, box, shift }) => {
  const { state } = ctx;
  const comp = state.composition;
  const p = item.placement;
  const src = p.source;
  const asset = src ? lookupAsset(state.manifest, src.asset) : null;
  if (!src || !asset) {
    const layout = layoutRect(comp, comp, "contain", transform, box);
    return {
      ...common,
      kind: "error",
      ...(src ? { asset: src.asset } : {}),
      rect: layout.rect,
      matrix: shift(layout.matrix),
    };
  }
  const size = { width: asset.width ?? comp.width, height: asset.height ?? comp.height };
  const layout = layoutRect(comp, size, common.fit, transform, box);
  const matte = matteOf(state, p, asset);
  return {
    ...common,
    kind: asset.kind === "image" ? "image" : "video",
    asset: asset.id,
    sourceTime: placementSourceTime(p, item.children, ctx.t),
    rect: layout.rect,
    matrix: shift(layout.matrix),
    ...(layout.crop ? { crop: layout.crop, cropReference: size } : {}),
    ...(matte ? { matte } : {}),
  };
});

/** The matte a clip's `cutout` cuts with: only for footage whose matte is a video in the manifest (the resolver reports the rest). */
export function matteOf(state: ResolvedState, p: PlacementMap["clip"], asset: AssetEntry): MatteSpec | null {
  const cutout = p.props.cutout;
  if (cutout === undefined || cutout === false || asset.kind !== "video" || !asset.matte) return null;
  if (lookupAsset(state.manifest, asset.matte)?.kind !== "video") return null;
  const given = typeof cutout === "object" ? cutout : {};
  const px = (v: number | undefined): number => (v !== undefined && Number.isFinite(v) && v > 0 ? v : 0);
  return { asset: asset.matte, shrink: px(given.shrink), feather: px(given.feather) };
}
