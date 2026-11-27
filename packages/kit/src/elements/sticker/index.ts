// A `<Sticker>`: an image the manifest lists, on the overlay plane.
import type { KitElement } from "../element";
import { overlayTraits } from "../traits";
import { stickerSchema } from "./schema";

/** The kit's part of a sticker: its schema, its row in the kind table, and a sample. */
export interface StickerElement extends KitElement<"sticker", "dom"> {
  readonly schema: typeof stickerSchema;
}

export const sticker: StickerElement = {
  kind: "sticker",
  summary: "A ready-made icon or sticker by name.",
  group: "Text and graphics",
  schema: stickerSchema,
  traits: overlayTraits({ themeStyle: "props", themeMotion: true }),
  sample: `<Sticker id="sample" start={0} duration={3} src="asset:picture" box={{ x: 960, y: 540, origin: "center" }} />`,
};
