// The SDK's part of each kind that has a folder of its own, by kind. Typed over the kit's list of those kinds, so a
// kind added there does not compile until its folder here exists and is listed.
import { type Box, isMigratedKind, type Kind, type MigratedKind } from "@uberscene/kit/schema";

import type { Placement } from "../resolve/resolve";
import { adjustment } from "./adjustment";
import { audio } from "./audio";
import { camera } from "./camera";
import { caption, captions } from "./captions";
import { clip } from "./clip";
import { composition } from "./composition";
import type { SdkElement } from "./element";
import { gap } from "./gap";
import { layer } from "./layer";
import { marker } from "./marker";
import { angle, cut, multicam } from "./multicam";
import { nested } from "./nested";
import { typed } from "./placement";
import { shape } from "./shape";
import { sticker } from "./sticker";
import { svg } from "./svg";
import { title } from "./title";
import { track } from "./track";
import { transition } from "./transition";

export { isCaptions, isCue } from "./captions";
export type { SdkElement } from "./element";

/** The SDK's part of each kind that has a folder of its own. */
export const SDK_ELEMENTS: { readonly [K in MigratedKind]: SdkElement<K> } = {
  composition,
  camera,
  track,
  clip,
  audio,
  gap,
  transition,
  title,
  shape,
  svg,
  sticker,
  captions,
  caption,
  marker,
  layer,
  adjustment,
  nested,
  multicam,
  angle,
  cut,
};

/** The SDK's part of `kind`, as one type whatever the kind, or undefined for a kind with no folder of its own yet. */
export function sdkElement(kind: Kind): SdkElement<Kind> | undefined {
  // One type for every kind's part: a caller narrows the placement itself before it hands it to a part.
  return isMigratedKind(kind) ? (SDK_ELEMENTS[kind] as SdkElement<Kind>) : undefined;
}

/**
 * `kind`'s parsed props with what its schema leaves to the kind filled in (a built-in transition's params), or the
 * props as they are.
 */
export function completed(kind: Kind, parsed: Record<string, unknown>): Record<string, unknown> {
  const complete = sdkElement(kind)?.complete;
  // The props parsed against the kind's own schema, so they are its props.
  return complete ? (complete(parsed as never) as Record<string, unknown>) : parsed;
}

/** A placement's size at rest, where its kind's props say one and they parsed: a shape's `width` and `height`. */
export function restSizeOf(placement: Placement): Box | undefined {
  const size = sdkElement(placement.kind)?.restSize;
  const p = typed(placement);
  return size && p.parsed ? size(p) : undefined;
}

/** Whether a kind makes elements of its own as its track is placed (a multicam's clips), which stand for it there. */
export function makesOnTrack(kind: Kind): boolean {
  return sdkElement(kind)?.makes?.when === "placing";
}
