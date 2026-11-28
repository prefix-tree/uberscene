// What the editor shows of each element kind, by kind: its icon in the layers, and its text panel where its `style`
// is a text look. The kinds with a folder of their own in the packages (`MigratedKind`) each have an entry, typed so
// that one left out does not compile; the other kinds are in the two tables under it until they move.
import { Captions, Clapperboard, Layers, type LucideIcon, Music, Shapes, Sparkles, Type } from "lucide-react";

import { isMigratedKind, type Kind, type MigratedKind, TITLE_LOOK_KEYS } from "@uberscene/kit/schema";
import type { ActionInput } from "@uberscene/sdk";

/** The text panel of a kind whose `style` is a text look. */
export interface LookPanel {
  /** The fields of its `style` the panel shows. */
  readonly keys: ReadonlySet<string>;
  /** The edit that writes its `style`; `undefined` when the last field was cleared. */
  readonly write: (id: string, style: Readonly<Record<string, unknown>> | undefined) => ActionInput;
  /** Whether its lines can be justified. */
  readonly justify: boolean;
}

export interface EditorElement<K extends MigratedKind> {
  readonly kind: K;
  /** Its icon in the layers list. */
  readonly icon: LucideIcon;
  /** Its text panel, for a kind whose `style` is a text look. */
  readonly look?: LookPanel;
}

export const EDITOR_ELEMENTS: { readonly [K in MigratedKind]: EditorElement<K> } = {
  clip: { kind: "clip", icon: Clapperboard },
  audio: { kind: "audio", icon: Music },
  title: {
    kind: "title",
    icon: Type,
    look: {
      // Every field of a title's look, as the kit's schema lists them, and the preset it starts from.
      keys: new Set(["preset", ...TITLE_LOOK_KEYS]),
      write: (id, style) => {
        const action = { type: "element/update", params: { id, props: { style: style ?? {} } } };
        return action as ActionInput;
      },
      justify: true,
    },
  },
  shape: { kind: "shape", icon: Shapes },
  svg: { kind: "svg", icon: Shapes },
  sticker: { kind: "sticker", icon: Shapes },
  layer: { kind: "layer", icon: Layers },
  adjustment: { kind: "adjustment", icon: Shapes },
  nested: { kind: "nested", icon: Shapes },
};

/** The icons of the kinds that have no entry above yet. */
const OTHER_ICONS: Partial<Record<Kind, LucideIcon>> = {
  captions: Captions,
  caption: Captions,
  transition: Sparkles,
};

/** The text panels of the kinds that have no entry above yet. */
const OTHER_LOOKS: Partial<Record<Kind, LookPanel>> = {
  captions: {
    keys: new Set([
      "preset",
      "font",
      "weight",
      "size",
      "align",
      "color",
      "background",
      "stroke",
      "shadow",
      "highlight",
      "highlightBox",
      "upcoming",
    ]),
    write: (id, style) => {
      const action = { type: "caption/setStyle", params: { captionsId: id, style } };
      return action as ActionInput;
    },
    justify: false,
  },
};

/** A kind's icon in the layers list. */
export function iconOf(kind: Kind): LucideIcon {
  return (isMigratedKind(kind) ? EDITOR_ELEMENTS[kind].icon : OTHER_ICONS[kind]) ?? Shapes;
}

/** A kind's text panel, or undefined for a kind whose `style` is not a text look. */
export function lookPanelOf(kind: Kind): LookPanel | undefined {
  return isMigratedKind(kind) ? EDITOR_ELEMENTS[kind].look : OTHER_LOOKS[kind];
}
