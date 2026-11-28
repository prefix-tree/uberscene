// The player's part of a `<Clip>` that the engine asks: what is decoded to paint it. Its size is its asset's.
import { lookupAsset } from "@uberscene/sdk/resolver";

import type { PlayerElement } from "../element";
import { matteOf } from "./canvas";

export const clip: PlayerElement<"clip"> = {
  kind: "clip",
  decodes: (state, p) => {
    const asset = p.source ? lookupAsset(state.manifest, p.source.asset) : null;
    return asset ? { asset, matte: matteOf(state, p, asset)?.asset ?? null } : null;
  },
};
