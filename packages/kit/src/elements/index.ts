// The element kinds, as one closed list with the props each resolves to. `KindProps` is the list: a kind is a key of
// it, so a misspelled kind does not compile, and a placement of a kind has that kind's props with no cast. Each kind's
// props are a named interface over what its schema parses to (a key list, a generator and a link are taken out before
// parsing, so a parsed prop holds the constant), so declarations name them instead of printing them.
import type { z } from "zod";

import type {
  effectSchema,
  freezeSchema,
  generatorItemSchema,
  keyframeSchema,
  maskSchema,
  speedKeySchema,
} from "../jsx/schemas/children";
import { adjustment } from "./adjustment";
import type { adjustmentSchema } from "./adjustment/schema";
import { audio } from "./audio";
import type { audioSchema } from "./audio/schema";
import { camera } from "./camera";
import type { cameraSchema } from "./camera/schema";
import { caption, captions } from "./captions";
import type { captionSchema, captionsSchema } from "./captions/schema";
import { clip } from "./clip";
import type { clipSchema } from "./clip/schema";
import { composition } from "./composition";
import type { compositionSchema } from "./composition/schema";
import type { KitElement } from "./element";
import { gap } from "./gap";
import type { gapSchema } from "./gap/schema";
import { layer } from "./layer";
import type { layerSchema, motionSchema, threeSchema } from "./layer/schema";
import { marker } from "./marker";
import type { markerSchema } from "./marker/schema";
import { angle, cut, multicam } from "./multicam";
import type { angleSchema, cutSchema, multicamSchema } from "./multicam/schema";
import { nested } from "./nested";
import type { nestedSchema } from "./nested/schema";
import { shape } from "./shape";
import type { shapeSchema } from "./shape/schema";
import { sticker } from "./sticker";
import type { stickerSchema } from "./sticker/schema";
import { svg } from "./svg";
import type { svgSchema } from "./svg/schema";
import { title } from "./title";
import type { titleSchema } from "./title/schema";
import { track } from "./track";
import type { trackSchema } from "./track/schema";
import { transition } from "./transition";
import type { transitionSchema } from "./transition/schema";

export type { AdjustmentElement } from "./adjustment";
export type { AudioElement } from "./audio";
export type { CameraElement } from "./camera";
export type { CaptionElement, CaptionsElement } from "./captions";
export type { ClipElement } from "./clip";
export type { CompositionElement } from "./composition";
export type { ElementGroup, KitElement } from "./element";
export type { GapElement } from "./gap";
export type { LayerElement } from "./layer";
export type { MarkerElement } from "./marker";
export type { AngleElement, CutElement, MulticamElement } from "./multicam";
export type { NestedElement } from "./nested";
export type { ShapeElement } from "./shape";
export type * from "./shared";
export type { StickerElement } from "./sticker";
export type { SvgElement } from "./svg";
export type { TitleElement } from "./title";
export type { TrackElement } from "./track";
export type { TransitionElement } from "./transition";

/** The props of a `<Composition>`, as its schema parses them. */
export interface CompositionProps extends z.output<typeof compositionSchema> {}
/** The props of a `<Track>`, as its schema parses them. */
export interface TrackProps extends z.output<typeof trackSchema> {}
/** The props of a `<Camera>`, as its schema parses them. */
export interface CameraProps extends z.output<typeof cameraSchema> {}
/** The props of a `<Clip>`, as its schema parses them. */
export interface ClipProps extends z.output<typeof clipSchema> {}
/** The props of a `<Audio>`, as its schema parses them. */
export interface AudioProps extends z.output<typeof audioSchema> {}
/** The props of a `<Gap>`, as its schema parses them. */
export interface GapProps extends z.output<typeof gapSchema> {}
/** The props of a `<Transition>`, as its schema parses them. */
export interface TransitionProps extends z.output<typeof transitionSchema> {}
/** The props of a `<Title>`, as its schema parses them. */
export interface TitleProps extends z.output<typeof titleSchema> {}
/** The props of a `<Shape>`, as its schema parses them. */
export interface ShapeProps extends z.output<typeof shapeSchema> {}
/** The props of a `<Svg>`, as its schema parses them. */
export interface SvgProps extends z.output<typeof svgSchema> {}
/** The props of a `<Sticker>`, as its schema parses them. */
export interface StickerProps extends z.output<typeof stickerSchema> {}
/** The props of a `<Captions>`, as its schema parses them. */
export interface CaptionsProps extends z.output<typeof captionsSchema> {}
/** The props of a `<Caption>`, as its schema parses them. */
export interface CaptionProps extends z.output<typeof captionSchema> {}
/** The props of a `<Marker>`, as its schema parses them. */
export interface MarkerProps extends z.output<typeof markerSchema> {}
/** The props of a `<Adjustment>`, as its schema parses them. */
export interface AdjustmentProps extends z.output<typeof adjustmentSchema> {}
/** The props of a `<Mask>`, as its schema parses them. */
export interface MaskProps extends z.output<typeof maskSchema> {}
/** The props of a `<Nested>`, as its schema parses them. */
export interface NestedProps extends z.output<typeof nestedSchema> {}
/** The props of a `<Multicam>`, as its schema parses them. */
export interface MulticamProps extends z.output<typeof multicamSchema> {}
/** The props of a `<Angle>`, as its schema parses them. */
export interface AngleProps extends z.output<typeof angleSchema> {}
/** The props of a `<Cut>`, as its schema parses them. */
export interface CutProps extends z.output<typeof cutSchema> {}
/** A `<Layer>` of free code: no `engine`. */
export interface PlainLayerProps extends z.output<typeof layerSchema> {
  readonly engine?: undefined;
}
/** A `<Three>` layer: `engine: "three"`. */
export interface ThreeProps extends z.output<typeof threeSchema> {}
/** A `<Motion>` layer: `engine: "motion"`. */
export interface MotionProps extends z.output<typeof motionSchema> {}
/** A layer's props: free code, or one a library draws, told apart by `engine`. */
export type LayerProps = PlainLayerProps | ThreeProps | MotionProps;
/** An effect of an element, as an item the resolver makes of its `effects`: its props. */
export interface EffectProps extends z.output<typeof effectSchema> {}
/** One key of a value that changes over time, as an item the resolver makes of a key list: its props. */
export interface KeyframeProps extends z.output<typeof keyframeSchema> {}
/** A generator on a value (a wiggle, a drift, a loop), as an item the resolver makes of it: its props. */
export interface GeneratorProps extends z.output<typeof generatorItemSchema> {}
/** One key of a speed ramp, as an item the resolver makes of `speed` keys: its props. */
export interface SpeedKeyProps extends z.output<typeof speedKeySchema> {}
/** A hold, as an item the resolver makes of `freezes`: its props. */
export interface FreezeProps extends z.output<typeof freezeSchema> {}

/**
 * Every kind, with the props a placement of it holds once its schema has parsed them. The elements a file writes
 * first, in the vocabulary's order, then the items the resolver makes from props (an effect, a key, a freeze).
 */
export interface KindProps {
  composition: CompositionProps;
  camera: CameraProps;
  track: TrackProps;
  clip: ClipProps;
  audio: AudioProps;
  gap: GapProps;
  transition: TransitionProps;
  title: TitleProps;
  shape: ShapeProps;
  svg: SvgProps;
  sticker: StickerProps;
  captions: CaptionsProps;
  caption: CaptionProps;
  marker: MarkerProps;
  adjustment: AdjustmentProps;
  mask: MaskProps;
  nested: NestedProps;
  multicam: MulticamProps;
  angle: AngleProps;
  cut: CutProps;
  layer: LayerProps;
  effect: EffectProps;
  keyframe: KeyframeProps;
  generator: GeneratorProps;
  speedKey: SpeedKeyProps;
  freeze: FreezeProps;
}

/** An element kind: one of the keys of `KindProps`, and nothing else. */
export type Kind = keyof KindProps;

/** The kinds whose props have `P`: what takes a `transform`, a `volume`, a `follow`. A prop not known by name: any kind. */
export type KindWith<P extends string> = string extends P
  ? Kind
  : {
      [K in Kind]: KindProps[K] extends infer Props
        ? Props extends unknown
          ? P extends keyof Props
            ? K
            : never
          : never
        : never;
    }[Kind];

/** The kit's part of each kind that has a folder of its own: the one list of them, which the type below is read from. */
export const KIT_ELEMENTS = {
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
  adjustment,
  nested,
  multicam,
  angle,
  cut,
  layer,
} satisfies {
  readonly [K in Kind]?: KitElement<K>;
};

/**
 * The kinds a file writes, each with a folder of its own in each package (`elements/<kind>/`): the keys of
 * `KIT_ELEMENTS`. Each package's `elements/index.ts` holds one entry per kind here, so a kind added to the kit's
 * registry does not compile until every package has its part. The kinds held inside an element (a mask, an effect, a
 * key) have no folder: their rows are in `elements/derived.ts`.
 */
export type MigratedKind = keyof typeof KIT_ELEMENTS;

/** The plane a kind is drawn on, as a type: what the player's entry for it must hold. */
export type PlaneOf<K extends MigratedKind> = (typeof KIT_ELEMENTS)[K]["traits"]["plane"];

/** Whether `kind` has a folder of its own in each package: every kind a file writes, but those held inside an element. */
export function isMigratedKind(kind: string): kind is MigratedKind {
  return Object.hasOwn(KIT_ELEMENTS, kind);
}

/** The kit's part of `kind`, or undefined for a kind held inside an element, which has no folder. */
export function kitElement(kind: Kind): KitElement<Kind> | undefined {
  return isMigratedKind(kind) ? KIT_ELEMENTS[kind] : undefined;
}

/** Whether `kind`'s children in the file are free code, kept as its interior, and not elements: a layer's. */
export function keepsInterior(kind: Kind): boolean {
  return kitElement(kind)?.interior === true;
}
