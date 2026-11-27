// Placements typed by their kind. The resolved state holds every placement as the loose `Placement` (a kind, and
// props as unknown values). These are the same objects seen through their kind: `PlacedTitle` has a title's props as
// the title schema parses them, so code that has narrowed a placement reads `p.props.style.size` as a number, with no
// cast and no default written a second time.
//
// Narrowing is sound only for props that parsed, so a placement is one of two things: `Parsed<K>` (its props are its
// kind's), or `Unparsed` (its props are as written, of no known type; it has errors and is not drawn). What works on
// an element takes a `Placed`, which an unparsed one is not.
//
//   const title = placed(state.items.get(id), "title");      // PlacedTitle | undefined
//   const p = typed(item);                                   // then `p.parsed` and its kind narrow it
//   if (hasProp(item, "transform")) item.props.transform     // any kind that has one

import type { z } from "zod";

import {
  type Kind,
  type KindProps,
  type KindWith,
  SCHEMAS_BY_KIND,
  schemaFor,
  type TextRun,
} from "@uberscene/kit/schema";

import type { Placement } from "../resolve/resolve";

/** What every placement has, whatever its kind: its place, its time, its errors. The time fields stay the resolver's. */
type Base = Omit<Placement, "kind" | "props" | "parsed">;

/** A placement of kind `K` whose props parsed: they are that kind's props, each of its type, every default filled. */
export interface Parsed<K extends Kind> extends Base {
  readonly kind: K;
  readonly parsed: true;
  readonly props: Readonly<KindProps[K]>;
}

/** A placement whose props did not parse: they are as written. It keeps its row and its errors, and is not drawn. */
export interface Unparsed extends Base {
  readonly kind: Kind;
  readonly parsed: false;
  readonly props: Readonly<Record<string, unknown>>;
}

/** A `composition` whose props parsed. */
export interface PlacedComposition extends Parsed<"composition"> {}
/** A `camera` whose props parsed. */
export interface PlacedCamera extends Parsed<"camera"> {}
/** A `track` whose props parsed. */
export interface PlacedTrack extends Parsed<"track"> {}
/** A `clip` whose props parsed. */
export interface PlacedClip extends Parsed<"clip"> {}
/** A `audio` whose props parsed. */
export interface PlacedAudio extends Parsed<"audio"> {}
/** A `gap` whose props parsed. */
export interface PlacedGap extends Parsed<"gap"> {}
/** A `transition` whose props parsed. */
export interface PlacedTransition extends Parsed<"transition"> {}
/** A `title` whose props parsed, with its words. */
export interface PlacedTitle extends Parsed<"title"> {
  /** The words written inside it. */
  readonly text: string;
  /** The stretches of `text` its `<Mark>`s draw their own way. */
  readonly runs: readonly TextRun[];
}
/** A `shape` whose props parsed. */
export interface PlacedShape extends Parsed<"shape"> {}
/** A `svg` whose props parsed. */
export interface PlacedSvg extends Parsed<"svg"> {}
/** A `sticker` whose props parsed. */
export interface PlacedSticker extends Parsed<"sticker"> {}
/** A `captions` whose props parsed. */
export interface PlacedCaptions extends Parsed<"captions"> {}
/** A `caption` whose props parsed. */
export interface PlacedCaption extends Parsed<"caption"> {}
/** A `marker` whose props parsed. */
export interface PlacedMarker extends Parsed<"marker"> {}
/** A `adjustment` whose props parsed. */
export interface PlacedAdjustment extends Parsed<"adjustment"> {}
/** A `mask` whose props parsed. */
export interface PlacedMask extends Parsed<"mask"> {}
/** A `nested` whose props parsed. */
export interface PlacedNested extends Parsed<"nested"> {}
/** A `multicam` whose props parsed. */
export interface PlacedMulticam extends Parsed<"multicam"> {}
/** A `angle` whose props parsed. */
export interface PlacedAngle extends Parsed<"angle"> {}
/** A `cut` whose props parsed. */
export interface PlacedCut extends Parsed<"cut"> {}
/** A `layer` whose props parsed. */
export interface PlacedLayer extends Parsed<"layer"> {}
/** A `effect` whose props parsed. */
export interface PlacedEffect extends Parsed<"effect"> {}
/** A `keyframe` whose props parsed. */
export interface PlacedKeyframe extends Parsed<"keyframe"> {}
/** A `generator` whose props parsed. */
export interface PlacedGenerator extends Parsed<"generator"> {}
/** A `speedKey` whose props parsed. */
export interface PlacedSpeedKey extends Parsed<"speedKey"> {}
/** A `freeze` whose props parsed. */
export interface PlacedFreeze extends Parsed<"freeze"> {}

/**
 * What a placement holds from the file besides its props, by kind: a title's words. A kind listed here says how it
 * is read from its node (`facts`, in its folder), and the resolver puts it on every placement of the kind, parsed
 * or not.
 */
export interface PlacementFacts {
  title: Pick<PlacedTitle, "text" | "runs">;
}

/** The kinds whose parsed placement has a name of its own (`PlacedTitle`). */
interface NamedPlacements {
  composition: PlacedComposition;
  camera: PlacedCamera;
  track: PlacedTrack;
  clip: PlacedClip;
  audio: PlacedAudio;
  gap: PlacedGap;
  transition: PlacedTransition;
  title: PlacedTitle;
  shape: PlacedShape;
  svg: PlacedSvg;
  sticker: PlacedSticker;
  captions: PlacedCaptions;
  caption: PlacedCaption;
  marker: PlacedMarker;
  adjustment: PlacedAdjustment;
  mask: PlacedMask;
  nested: PlacedNested;
  multicam: PlacedMulticam;
  angle: PlacedAngle;
  cut: PlacedCut;
  layer: PlacedLayer;
  effect: PlacedEffect;
  keyframe: PlacedKeyframe;
  generator: PlacedGenerator;
  speedKey: PlacedSpeedKey;
  freeze: PlacedFreeze;
}

/**
 * Each kind's parsed placement, by kind: its named type where it has one, else `Parsed` of the kind. So a kind added
 * to the kit's `KindProps` has a typed placement with nothing written here.
 */
export type PlacementMap = {
  [K in Kind]: K extends keyof NamedPlacements ? NamedPlacements[K] : Parsed<K>;
};

/** A placement whose props parsed, of any kind: narrow it by `kind` to read its props. */
export type Placed = PlacementMap[Kind];

/** Any placement, by what is known of its props: parsed and of its kind, or not parsed. */
export type TypedPlacement = Placed | Unparsed;

/**
 * A placement seen through its kind: the same object, typed as parsed-of-its-kind or unparsed, so `kind` and
 * `parsed` narrow it. It costs nothing at run time.
 */
export function typed(placement: Placement): TypedPlacement {
  return placement as unknown as TypedPlacement;
}

/** `placement` as a parsed placement of `kind`, or undefined when it is missing, of another kind, or did not parse. */
export function placed<K extends Kind>(placement: Placement | undefined, kind: K): PlacementMap[K] | undefined {
  return placement !== undefined && placement.kind === kind && placement.parsed
    ? (placement as unknown as PlacementMap[K])
    : undefined;
}

/**
 * Whether a placement parsed and is of a kind whose props have `prop` (`transform`, `volume`, `follow`): then it is
 * typed as those kinds' placement. It asks the schema, so a prop a kind gains needs nothing here.
 */
export function hasProp<P extends string>(
  placement: Placement,
  prop: P,
): placement is Placement & PlacementMap[KindWith<P>] {
  return placement.parsed && prop in shapeOf(placement);
}

/** The props a placement's schema has: its kind's, or for a layer a library draws, that engine's. */
function shapeOf(placement: Placement): Readonly<Record<string, unknown>> {
  const schema = schemaFor(placement.kind, placement.props) ?? SCHEMAS_BY_KIND[placement.kind];
  return (schema as unknown as z.ZodObject).shape;
}
