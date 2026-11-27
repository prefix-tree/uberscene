// How each kind is drawn as DOM: its component, where it stands, and whether its effects run over it. The DOM layer
// asks this table for every overlay, so it names no kind itself. A new kind drawn as DOM is an entry here.

import type { ReactNode } from "react";

import type { ResolvedState } from "@uberscene/sdk/resolver";

import type { ElementProps } from "../../overlays/layout";
import { Adjustment } from "./Adjustment";
import { Captions } from "./Captions";
import { Layer } from "./Layer";
import { Shape } from "./Shape";
import { Sticker } from "./Sticker";
import { Svg } from "./Svg";
import { Title } from "./Title";

export interface DomDrawing {
  /** The element, from what every overlay is given; `interior` is a layer's content, made by the host. */
  readonly render: (props: ElementProps, extra: { readonly interior?: ReactNode }) => ReactNode;
  /** `track`: in its track's group, for as long as it is on the timeline. `top`: over every track, for the whole video (captions). */
  readonly where: "track" | "top";
  /** `pipeline`: its effects run over its picture. `none`: it has none of its own (an adjustment's are the canvas's). */
  readonly effects: "pipeline" | "none";
  /** Whether what it draws from outside its placement is the same in two states: a title's words. */
  readonly same?: (was: ResolvedState, now: ResolvedState, id: string) => boolean;
}

const overlay = (render: DomDrawing["render"], more: Partial<DomDrawing> = {}): DomDrawing => ({
  render,
  where: "track",
  effects: "pipeline",
  ...more,
});

export const DOM_DRAWING: Readonly<Record<string, DomDrawing>> = {
  title: overlay(
    (props) => {
      const written = props.state.tree.byId.get(props.placement.id);
      return <Title {...props} text={written?.text ?? ""} runs={written?.runs} />;
    },
    {
      same: (was, now, id) => {
        const a = was.tree.byId.get(id);
        const b = now.tree.byId.get(id);
        return a?.text === b?.text && a?.runs === b?.runs;
      },
    },
  ),
  shape: overlay((props) => <Shape {...props} />),
  svg: overlay((props) => <Svg {...props} />),
  sticker: overlay((props) => <Sticker {...props} />),
  layer: overlay((props, { interior }) => <Layer {...props} interior={interior} />),
  // The painter's adjustment op filters the footage; its cell on the overlay plane is an empty box.
  adjustment: overlay((props) => <Adjustment {...props} />, { effects: "none" }),
  captions: overlay((props) => <Captions placement={props.placement} state={props.state} time={props.time} />, {
    where: "top",
    effects: "none",
  }),
};
