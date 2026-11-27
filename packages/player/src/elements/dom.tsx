// How each kind with a folder of its own is drawn as DOM, by kind. A kind on the DOM plane must have an entry here,
// and a kind that is not must have none: the type says both, from the plane the kit gives the kind.
import { isMigratedKind } from "@uberscene/kit/schema";
import { placed } from "@uberscene/sdk/resolver";

import type { DomDrawing } from "../react/elements";
import type { DomDrawingOf, DomKind } from "./dom-drawing";
import { shapeDom } from "./shape/dom";
import { titleDom } from "./title/dom";

export const PLAYER_DOM: { readonly [K in DomKind]: DomDrawingOf<K> } = { title: titleDom, shape: shapeDom };

/** A kind's drawing as the DOM layer calls it, whatever the kind: it draws a placement of its kind that parsed. */
function loose<K extends DomKind>(kind: K): DomDrawing {
  const drawing = PLAYER_DOM[kind];
  return {
    where: drawing.where,
    effects: drawing.effects,
    render: (props, extra) => {
      const placement = placed(props.placement, kind);
      return placement ? drawing.render({ ...props, placement }, extra) : null;
    },
  };
}

/** The DOM drawings of the kinds with folders, for the table the DOM layer asks (`DOM_DRAWING`). */
export const ELEMENT_DOM: Readonly<Record<string, DomDrawing>> = Object.fromEntries(
  Object.keys(PLAYER_DOM)
    .filter(isMigratedKind)
    .map((kind) => [kind, loose(kind as DomKind)]),
);
