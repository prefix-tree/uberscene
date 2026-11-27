// How each kind is drawn as DOM: its component, where it stands, and whether its effects run over it. The DOM layer
// asks this table for every overlay, so it names no kind itself. A kind with a folder of its own says its drawing
// there (`elements/<kind>/dom.tsx`); the others are entries here.

import type { ReactNode } from "react";

import { ELEMENT_DOM } from "../../elements/dom";
import type { ElementProps } from "../../overlays/layout";
import { Captions } from "./Captions";

export interface DomDrawing {
  /** The element, from what every overlay is given; `interior` is a layer's content, made by the host. */
  readonly render: (props: ElementProps, extra: { readonly interior?: ReactNode }) => ReactNode;
  /** `track`: in its track's group, for as long as it is on the timeline. `top`: over every track, for the whole video (captions). */
  readonly where: "track" | "top";
  /** `pipeline`: its effects run over its picture. `none`: it has none of its own (an adjustment's are the canvas's). */
  readonly effects: "pipeline" | "none";
}

export const DOM_DRAWING: Readonly<Record<string, DomDrawing>> = {
  // The kinds with a folder of their own (`elements/<kind>/dom.tsx`).
  ...ELEMENT_DOM,
  captions: {
    render: (props) => <Captions placement={props.placement} state={props.state} time={props.time} />,
    where: "top",
    effects: "none",
  },
};
