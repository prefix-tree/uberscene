import type { ReactElement, ReactNode } from "react";
import type { z } from "zod";

import type { KeyPath } from "./key-paths";

export type PlacementScope = "composition" | "track" | "child" | "none";

export interface ElementCapabilities {
  /** Occupies a time range on the timeline. */
  readonly timed: boolean;
  /** Draws pixels. */
  readonly visual: boolean;
  /** Produces sound. */
  readonly audio: boolean;
  /** Has a source range (`in`/`out`) that can be trimmed, slipped, split. */
  readonly trimSource: boolean;
  /** Accepts a `transform` prop. */
  readonly transformable: boolean;
  /** May hold vocabulary children. */
  readonly container: boolean;
  /** Kinds allowed as direct children. */
  readonly childKinds: readonly string[];
  /** Where the element may appear. */
  readonly placementScope: PlacementScope;
  /**
   * What draws it. `canvas`: painted with the footage. `dom`: the overlay plane over the canvas. `both`: an
   * adjustment, which filters the canvas beneath it and stands on the overlay plane. `none`: it has no picture of its
   * own (sound, structure, or something its parent draws).
   */
  readonly plane: DrawPlane;
  /** Puts footage on the canvas: what a blurred background and the overlays beneath the footage are measured against. */
  readonly footage: boolean;
  /**
   * Its part on a track. `item`: something placed there, which a cut or an anchor can name. `between`: a transition,
   * which joins its two neighbours. `empty`: a gap, time with nothing in it. `none`: not written on a track.
   */
  readonly sequenceRole: SequenceRole;
  /** May be written straight in a `<Composition>`, where it makes the main track. */
  readonly mainTrack: boolean;
  /** Its words are its content (`text`), which the read-time check and the tools read. */
  readonly hasText: boolean;
  /** Its picture is free code or another composition: anything in the file may decide it. */
  readonly freeCode: boolean;
  /** Lasts as long as the video does: its own range says nothing about one frame. */
  readonly spansVideo: boolean;
  /** Takes a `<Mask>` that is drawn. */
  readonly masked: boolean;
  /**
   * How a theme styles it. `look`: `style` is a text look (a preset name, or fields with `preset`). `props`: `style`
   * names a preset of the element's own props. `none`: a theme holds no presets for it.
   */
  readonly themeStyle: ThemeStyle;
  /** A theme's motion style fills its `enter` and `exit`. */
  readonly themeMotion: boolean;
  /** Made and changed by `element/create` and `element/update`: what sits on a track and is not media or a cut. */
  readonly elementActions: boolean;
  /** Plays a manifest asset by `src` (a clip, an audio): what "plays", beats, words and shots are read from. */
  readonly playsAsset: boolean;
  /** The paths in its props a key list or a generator may sit at (`KeyPath`); an effect's params are the effect's. */
  readonly keyPaths: readonly KeyPath[];
}

export type DrawPlane = "canvas" | "dom" | "both" | "none";
export type SequenceRole = "item" | "between" | "empty" | "none";
export type ThemeStyle = "look" | "props" | "none";

export type VocabularyProps<S extends z.ZodType> = z.input<S> & { readonly children?: ReactNode };

/** What a vocabulary component carries besides being one: its kind, schema and capabilities. */
export interface VocabularyMeta<K extends string, S extends z.ZodType> {
  readonly kind: K;
  readonly schema: S;
  readonly isVocabulary: true;
  readonly capabilities: ElementCapabilities;
  readonly displayName: string;
}

export type VocabularyComponent<K extends string, S extends z.ZodType> = ((
  props: VocabularyProps<S>,
) => ReactElement | null) &
  VocabularyMeta<K, S>;

export interface ElementDefinition<K extends string, S extends z.ZodType> {
  readonly kind: K;
  readonly schema: S;
  readonly capabilities: ElementCapabilities;
  /** Optional renderer. The kit ships none; a Player supplies them through context. */
  readonly render?: (props: z.output<S> & { readonly children?: ReactNode }) => ReactElement | null;
}

/**
 * A vocabulary element is an ordinary React component that also carries its
 * kind, its Zod prop schema and its editing capabilities, so the resolver and
 * the editor can read the element tree without rendering it.
 */
export function defineElement<K extends string, S extends z.ZodType>(
  def: ElementDefinition<K, S>,
): VocabularyComponent<K, S> {
  const component = ((props: VocabularyProps<S>) => {
    if (!def.render) return null;
    const { children, ...rest } = props;
    const parsed = def.schema.parse(rest) as z.output<S> & object;
    return def.render({ ...parsed, children } as z.output<S> & { readonly children?: ReactNode });
  }) as VocabularyComponent<K, S>;
  Object.defineProperties(component, {
    kind: { value: def.kind, enumerable: true },
    schema: { value: def.schema, enumerable: true },
    isVocabulary: { value: true, enumerable: true },
    capabilities: { value: def.capabilities, enumerable: true },
    displayName: { value: def.kind, enumerable: true },
  });
  return component;
}

export function isVocabulary(type: unknown): type is VocabularyComponent<string, z.ZodType> {
  return typeof type === "function" && (type as { isVocabulary?: unknown }).isVocabulary === true;
}

export function kindOf(type: unknown): string | null {
  return isVocabulary(type) ? type.kind : null;
}
