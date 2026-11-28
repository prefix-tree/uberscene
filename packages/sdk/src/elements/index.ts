// The SDK's part of each kind that has a folder of its own, by kind. Typed over the kit's list of those kinds, so a
// kind added there does not compile until its folder here exists and is listed.
import { type Box, isMigratedKind, type Kind, type MigratedKind } from "@uberscene/kit/schema";

import type { Placement } from "../resolve/resolve";
import { adjustment } from "./adjustment";
import { audio } from "./audio";
import { clip } from "./clip";
import type { SdkElement } from "./element";
import { layer } from "./layer";
import { nested } from "./nested";
import { typed } from "./placement";
import { shape } from "./shape";
import { sticker } from "./sticker";
import { svg } from "./svg";
import { title } from "./title";

export type { SdkElement } from "./element";

/** The SDK's part of each kind that has a folder of its own. */
export const SDK_ELEMENTS: { readonly [K in MigratedKind]: SdkElement<K> } = {
  clip,
  audio,
  title,
  shape,
  svg,
  sticker,
  layer,
  adjustment,
  nested,
};

/** The SDK's part of `kind`, as one type whatever the kind, or undefined for a kind with no folder of its own yet. */
export function sdkElement(kind: Kind): SdkElement<Kind> | undefined {
  // One type for every kind's part: a caller narrows the placement itself before it hands it to a part.
  return isMigratedKind(kind) ? (SDK_ELEMENTS[kind] as SdkElement<Kind>) : undefined;
}

/** A placement's size at rest, where its kind's props say one and they parsed: a shape's `width` and `height`. */
export function restSizeOf(placement: Placement): Box | undefined {
  const size = sdkElement(placement.kind)?.restSize;
  const p = typed(placement);
  return size && p.parsed ? size(p) : undefined;
}
