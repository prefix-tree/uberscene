import type { ReactElement } from "react";
import type { z } from "zod";

import type { EffectParams, TransitionParams } from "../effects/registry";
import { KIT_ELEMENTS, type Kind, type KindWith, type ShapeElement, type TitleElement } from "../elements";
import { capabilitiesOf } from "./capabilities";
import { defineElement, type VocabularyComponent, type VocabularyMeta, type VocabularyProps } from "./define";
import type { Easing, TransitionType, VideoEffectType } from "./enums";
import { captionSchema, captionsSchema } from "./schemas/captions";
import {
  effectSchema,
  freezeSchema,
  generatorItemSchema,
  keyframeSchema,
  maskSchema,
  speedKeySchema,
} from "./schemas/children";
import type { Link } from "./schemas/common";
import { cameraSchema, compositionSchema, gapSchema, markerSchema, trackSchema } from "./schemas/composition";
import { audioSchema, clipSchema } from "./schemas/media";
import { angleSchema, cutSchema, multicamSchema } from "./schemas/multicam";
import {
  adjustmentSchema,
  layerSchema,
  motionSchema,
  nestedSchema,
  stickerSchema,
  svgSchema,
  threeSchema,
} from "./schemas/overlays";
import { transitionSchema } from "./schemas/transition";
import type { EffectRef, TransitionRef } from "./shaders";

const el = <K extends Kind, S extends Parameters<typeof defineElement>[0]["schema"]>(kind: K, schema: S) =>
  defineElement({ kind, schema, capabilities: capabilitiesOf(kind) });
/** The tag of a kind that has a folder of its own: its kind, schema and row are that folder's. */
const tag = <K extends Kind, S extends Parameters<typeof defineElement>[0]["schema"]>(element: {
  readonly kind: K;
  readonly schema: S;
}) => el(element.kind, element.schema);

export const Composition = el("composition", compositionSchema);
export const Track = el("track", trackSchema);
export const Camera = el("camera", cameraSchema);
export const Clip = el("clip", clipSchema) as unknown as WithEffects<VocabularyComponent<"clip", typeof clipSchema>>;
export const Audio = el("audio", audioSchema);
export const Gap = el("gap", gapSchema);
type TransitionBase = Omit<VocabularyProps<typeof transitionSchema>, "type" | "params">;

/** The params of a transition type: a built-in's, or those of one `transition()` returned. */
export type TransitionParamsOf<T> = T extends TransitionType
  ? TransitionParams<T>
  : T extends TransitionRef<infer P>
    ? z.input<P>
    : never;

/**
 * `<Transition>`: a built-in by its type, with that type's params (crossfade when the type is left out), or one the file
 * declares by what `transition()` returned, with its own params.
 */
export interface TransitionComponent extends VocabularyMeta<"transition", typeof transitionSchema> {
  // biome-ignore lint/suspicious/noExplicitAny: any ref, whatever its params; they are read back by TransitionParamsOf.
  <T extends TransitionType | TransitionRef<any> = "crossfade">(
    props: TransitionBase & { type?: T; params?: TransitionParamsOf<T> },
  ): ReactElement | null;
}

export const Transition = el("transition", transitionSchema) as unknown as TransitionComponent;
/** The tag's type by its element's name, so a declaration file names the schema and does not print it again. */
type TagOf<E extends { readonly kind: Kind; readonly schema: z.ZodType }> = VocabularyComponent<E["kind"], E["schema"]>;
const titleTag: TagOf<TitleElement> = tag(KIT_ELEMENTS.title);
export const Title = titleTag as unknown as WithEffects<TagOf<TitleElement>>;
const shapeTag: TagOf<ShapeElement> = tag(KIT_ELEMENTS.shape);
export const Shape = shapeTag as unknown as WithEffects<TagOf<ShapeElement>>;
export const Svg = el("svg", svgSchema) as unknown as WithEffects<VocabularyComponent<"svg", typeof svgSchema>>;
export const Sticker = el("sticker", stickerSchema) as unknown as WithEffects<
  VocabularyComponent<"sticker", typeof stickerSchema>
>;
export const Captions = el("captions", captionsSchema);
export const Caption = el("caption", captionSchema);
export const Marker = el("marker", markerSchema);
export const Adjustment = el("adjustment", adjustmentSchema) as unknown as WithEffects<
  VocabularyComponent<"adjustment", typeof adjustmentSchema>
>;
export const Mask = el("mask", maskSchema);
export const Nested = el("nested", nestedSchema) as unknown as WithEffects<
  VocabularyComponent<"nested", typeof nestedSchema>
>;
export const Multicam = el("multicam", multicamSchema);
export const Angle = el("angle", angleSchema);
export const Cut = el("cut", cutSchema);
export const Layer = el("layer", layerSchema) as unknown as WithEffects<
  VocabularyComponent<"layer", typeof layerSchema>
>;
/** A Layer a library draws: a `layer` component with the engine's own props, and the engine's name. */
type EngineLayer<E extends string, S extends z.ZodType> = VocabularyComponent<"layer", S> & { readonly engine: E };

/**
 * A Layer drawn by a library: kind `layer` to the resolver, the timeline and the editor, with props of its own and
 * an `engine` the Player looks up among the installed layer engines (`installLayerEngine`).
 */
const engineLayer = <E extends string, S extends Parameters<typeof defineElement>[0]["schema"]>(
  engine: E,
  schema: S,
): EngineLayer<E, S> => {
  const component = defineElement({ kind: "layer", schema, capabilities: capabilitiesOf("layer") });
  Object.defineProperty(component, "engine", { value: engine, enumerable: true });
  return component as typeof component & { readonly engine: E };
};

// The props of each tag are its schema's without `engine`, which the tag itself says. The two are named, and the
// components typed by them, so a declaration file prints each schema once.
const threeTagSchema = threeSchema.omit({ engine: true });
const motionTagSchema = motionSchema.omit({ engine: true });
/** A three.js scene on the timeline: `setup` for plain three.js, or React Three Fiber children. */
const threeLayer: EngineLayer<"three", typeof threeTagSchema> = engineLayer("three", threeTagSchema);
export const Three = threeLayer as unknown as WithEffects<typeof threeLayer> & { readonly engine: "three" };
/** Children animated by a Motion `sequence` on the video's clock. */
const motionLayer: EngineLayer<"motion", typeof motionTagSchema> = engineLayer("motion", motionTagSchema);
export const Motion = motionLayer as unknown as WithEffects<typeof motionLayer> & { readonly engine: "motion" };

/** The engine Layers by tag: a named type, as `Elements` is. */
export type EngineLayers = {
  readonly Three: typeof Three;
  readonly Motion: typeof Motion;
};

/** The engine Layers by tag, and the schema each is checked against once collected (with its `engine`). */
export const ENGINE_LAYERS: EngineLayers = { Three, Motion };
export const ENGINE_SCHEMAS: Readonly<Record<string, typeof threeSchema | typeof motionSchema>> = {
  three: threeSchema,
  motion: motionSchema,
};

/** The engine a vocabulary component draws with, if it is an engine Layer. */
export function engineOf(type: unknown): string | null {
  const engine = (type as { engine?: unknown } | null)?.engine;
  return typeof engine === "string" ? engine : null;
}

/** The params of an effect type: a built-in's, or those of one `effect()` returned. */
export type EffectParamsOf<T> = T extends VideoEffectType
  ? EffectParams<T>
  : T extends EffectRef<infer P>
    ? z.input<P>
    : never;

/** One key of a value that changes over time. */
export interface Key<V> {
  readonly at: number;
  readonly value: V;
  readonly easing?: Easing;
}

/** Motion that is computed, in place of a number: a wobble or a drift added to a `base`, or keys played again. */
export type Generated =
  | {
      readonly type: "wiggle";
      readonly base?: number | readonly Key<number>[];
      readonly amount: number;
      readonly frequency?: number;
      readonly seed?: number;
    }
  | { readonly type: "drift"; readonly base?: number | readonly Key<number>[]; readonly speed: number }
  | { readonly type: "loop"; readonly keys: readonly Key<number>[]; readonly mode?: "repeat" | "pingpong" };

/** A value written as a constant, as keys over time, or, for a number, as a generator or a link to another value. */
export type Animatable<V> = V | readonly Key<V>[] | (V extends number ? Generated | Readonly<Link> : never);

/** One entry of an element's `effects`: its type, then each of that type's params, a constant or keys. */
export type EffectSpec<T> = { readonly type: T; readonly enabled?: boolean } & (string extends keyof EffectParamsOf<T>
  ? // An effect that declares no params takes none.
    unknown
  : { readonly [P in keyof EffectParamsOf<T>]?: Animatable<EffectParamsOf<T>[P]> });

/** Any effect a file may write: a built-in by name, or one the file declares. */
// biome-ignore lint/suspicious/noExplicitAny: any declared effect, whatever its params; read back by EffectParamsOf.
export type AnyEffectSpec = { [T in VideoEffectType]: EffectSpec<T> }[VideoEffectType] | EffectSpec<EffectRef<any>>;

/**
 * Each entry of an `effects` list checked against its own type: a built-in's params, or those of the `effect()` it
 * names. The list is read as a tuple, so a declared effect's params are its own, not any effect's.
 */
export type CheckedEffects<A extends readonly unknown[]> = {
  readonly [I in keyof A]: A[I] extends { readonly type: infer T }
    ? // biome-ignore lint/suspicious/noExplicitAny: any declared effect; its own params are read back by EffectParamsOf.
      T extends VideoEffectType | EffectRef<any>
      ? EffectSpec<T> & { readonly [P in Exclude<keyof A[I], keyof EffectSpec<T>>]: never }
      : AnyEffectSpec
    : AnyEffectSpec;
};

/** An element whose `effects` prop is typed per effect, so a wrong param name is a type error. */
type WithEffects<C> =
  C extends VocabularyComponent<infer K, infer S>
    ? VocabularyMeta<K, S> &
        (<const A extends readonly AnyEffectSpec[] = readonly []>(
          props: Omit<VocabularyProps<S>, "effects"> & { effects?: A & CheckedEffects<A> },
        ) => ReactElement | null)
    : never;

/**
 * The tags a file writes, by name. A named type whose members are each `typeof` its component, so a declaration file
 * names the components and does not print every one's schema a second time. (A type and not an interface, so
 * `Object.values(ELEMENTS)` keeps each component's type.)
 */
export type Elements = {
  readonly Composition: typeof Composition;
  readonly Camera: typeof Camera;
  readonly Track: typeof Track;
  readonly Clip: typeof Clip;
  readonly Audio: typeof Audio;
  readonly Gap: typeof Gap;
  readonly Transition: typeof Transition;
  readonly Title: typeof Title;
  readonly Shape: typeof Shape;
  readonly Svg: typeof Svg;
  readonly Sticker: typeof Sticker;
  readonly Captions: typeof Captions;
  readonly Caption: typeof Caption;
  readonly Marker: typeof Marker;
  readonly Adjustment: typeof Adjustment;
  readonly Mask: typeof Mask;
  readonly Nested: typeof Nested;
  readonly Multicam: typeof Multicam;
  readonly Angle: typeof Angle;
  readonly Cut: typeof Cut;
  readonly Layer: typeof Layer;
};

export const ELEMENTS: Elements = {
  Composition,
  Camera,
  Track,
  Clip,
  Audio,
  Gap,
  Transition,
  Title,
  Shape,
  Svg,
  Sticker,
  Captions,
  Caption,
  Marker,
  Adjustment,
  Mask,
  Nested,
  Multicam,
  Angle,
  Cut,
  Layer,
};

/**
 * The resolver's own item kinds: what it makes of the `effects`, key lists, `speed` keys and `freezes` a file writes
 * as props (`expandKeys` in the SDK). No file writes them as elements.
 */
export const DERIVED_SCHEMAS = {
  effect: effectSchema,
  keyframe: keyframeSchema,
  generator: generatorItemSchema,
  speedKey: speedKeySchema,
  freeze: freezeSchema,
} as const;
export type DerivedKind = keyof typeof DERIVED_SCHEMAS;
export const DERIVED_KINDS: ReadonlySet<Kind> = new Set(Object.keys(DERIVED_SCHEMAS) as DerivedKind[]);

export const SCHEMAS_BY_KIND = {
  ...Object.fromEntries(Object.values(ELEMENTS).map((component) => [component.kind, component.schema])),
  ...DERIVED_SCHEMAS,
} as unknown as Readonly<Record<Kind, z.ZodType>>;

/**
 * The kinds whose schema has `prop`, in the vocabulary's order: what takes a `blend`, a `follow`, `freezes`. The
 * schema already says which elements take a prop, so no list of them is kept beside it; the result is typed as the
 * kinds whose props have it.
 */
export function kindsWithProp<P extends string>(prop: P): readonly KindWith<P>[] {
  return Object.values(ELEMENTS)
    .filter((component) => prop in (component.schema as unknown as z.ZodObject).shape)
    .map((component) => component.kind as KindWith<P>);
}

/** The kinds a file writes as tags: every kind but the items the resolver makes from props. */
export type ElementKind = (typeof ELEMENTS)[keyof typeof ELEMENTS]["kind"];
