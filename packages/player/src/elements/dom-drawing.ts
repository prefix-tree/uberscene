// How a kind with a folder of its own is drawn as DOM: the types of `elements/<kind>/dom.tsx`. Apart from
// `element.ts`, which the engine loads and which must reach no React.
import type { ReactNode } from "react";

import type { MigratedKind, PlaneOf } from "@uberscene/kit/schema";
import type { PlacementMap } from "@uberscene/sdk/resolver";

import type { ElementProps } from "../overlays/layout";

/** What an element of kind `K` is drawn from: what every overlay is given, with its placement typed by its kind. */
export interface ElementPropsOf<K extends MigratedKind> extends ElementProps {
  readonly placement: PlacementMap[K];
}

/** How a kind is drawn as DOM. */
export interface DomDrawingOf<K extends MigratedKind> {
  /** The element; `interior` is a layer's content, made by the host. */
  readonly render: (props: ElementPropsOf<K>, extra: { readonly interior?: ReactNode }) => ReactNode;
  /** `track`: in its track's group, for as long as it is on the timeline. `top`: over every track, for the whole video. */
  readonly where: "track" | "top";
  /** `pipeline`: its effects run over its picture. `none`: it has none of its own. */
  readonly effects: "pipeline" | "none";
}

/** The kinds with a folder that stand on the DOM plane: each must have a DOM drawing, and no other may. */
export type DomKind = { [K in MigratedKind]: PlaneOf<K> extends "dom" | "both" ? K : never }[MigratedKind];
