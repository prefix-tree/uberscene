// The element kinds, as one closed list with the props each resolves to. `KindProps` is the list: a kind is a key of
// it, so a misspelled kind does not compile, and a placement of a kind has that kind's props with no cast. Each kind's
// props are a named interface over what its schema parses to (a key list, a generator and a link are taken out before
// parsing, so a parsed prop holds the constant), so declarations name them instead of printing them.
import type { z } from "zod";

import type { captionSchema, captionsSchema } from "../jsx/schemas/captions";
import type {
  effectSchema,
  freezeSchema,
  generatorItemSchema,
  keyframeSchema,
  maskSchema,
  speedKeySchema,
} from "../jsx/schemas/children";
import type { cameraSchema, compositionSchema, gapSchema, markerSchema, trackSchema } from "../jsx/schemas/composition";
import type { audioSchema, clipSchema } from "../jsx/schemas/media";
import type { angleSchema, cutSchema, multicamSchema } from "../jsx/schemas/multicam";
import type {
  adjustmentSchema,
  layerSchema,
  motionSchema,
  nestedSchema,
  shapeSchema,
  stickerSchema,
  svgSchema,
  threeSchema,
  titleSchema,
} from "../jsx/schemas/overlays";
import type { transitionSchema } from "../jsx/schemas/transition";

export type * from "./shared";

export interface CompositionProps extends z.output<typeof compositionSchema> {}
export interface TrackProps extends z.output<typeof trackSchema> {}
export interface CameraProps extends z.output<typeof cameraSchema> {}
export interface ClipProps extends z.output<typeof clipSchema> {}
export interface AudioProps extends z.output<typeof audioSchema> {}
export interface GapProps extends z.output<typeof gapSchema> {}
export interface TransitionProps extends z.output<typeof transitionSchema> {}
export interface TitleProps extends z.output<typeof titleSchema> {}
export interface ShapeProps extends z.output<typeof shapeSchema> {}
export interface SvgProps extends z.output<typeof svgSchema> {}
export interface StickerProps extends z.output<typeof stickerSchema> {}
export interface CaptionsProps extends z.output<typeof captionsSchema> {}
export interface CaptionProps extends z.output<typeof captionSchema> {}
export interface MarkerProps extends z.output<typeof markerSchema> {}
export interface AdjustmentProps extends z.output<typeof adjustmentSchema> {}
export interface MaskProps extends z.output<typeof maskSchema> {}
export interface NestedProps extends z.output<typeof nestedSchema> {}
export interface MulticamProps extends z.output<typeof multicamSchema> {}
export interface AngleProps extends z.output<typeof angleSchema> {}
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
export interface EffectProps extends z.output<typeof effectSchema> {}
export interface KeyframeProps extends z.output<typeof keyframeSchema> {}
export interface GeneratorProps extends z.output<typeof generatorItemSchema> {}
export interface SpeedKeyProps extends z.output<typeof speedKeySchema> {}
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

/** The kinds whose props have `P`: what takes a `transform`, a `volume`, a `follow`. */
export type KindWith<P extends string> = {
  [K in Kind]: KindProps[K] extends infer Props
    ? Props extends unknown
      ? P extends keyof Props
        ? K
        : never
      : never
    : never;
}[Kind];
