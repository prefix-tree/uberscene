// A `<Title>`: words on the overlay plane, in a look.
import type { KitElement } from "../element";
import { overlayTraits } from "../traits";
import { titleSchema } from "./schema";

/** The kit's part of a title: its schema, its row in the kind table, and a sample. */
export interface TitleElement extends KitElement<"title", "dom"> {
  readonly schema: typeof titleSchema;
}

export const title: TitleElement = {
  kind: "title",
  summary: "Text over the picture in the theme's type, with entrances by letter or by word.",
  group: "Text and graphics",
  schema: titleSchema,
  traits: overlayTraits({ hasText: true, themeStyle: "look", themeMotion: true }),
  sample: `<Title id="sample" start={0} duration={3} box={{ x: 960, y: 540, width: 1200, height: 300, origin: "center" }} style={{ size: 96 }}>A sample title</Title>`,
  // A title with an `animation` of its own comes in by that, not by the theme's entrance.
  themeMotion: (written) => written.animation === undefined,
};
