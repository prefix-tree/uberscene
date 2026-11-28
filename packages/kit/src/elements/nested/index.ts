// A `<Nested>`: a sequence written once as a component, placed and painted like a clip.
import type { KitElement } from "../element";
import { FOOTAGE_CHILDREN, ITEM, planeTraits } from "../traits";
import { nestedSchema } from "./schema";

/** The kit's part of a nested sequence: its schema, its row in the kind table, and a sample. */
export interface NestedElement extends KitElement<"nested", "canvas"> {
  readonly schema: typeof nestedSchema;
}

export const nested: NestedElement = {
  kind: "nested",
  summary: "A sequence written once as a component and placed like a clip.",
  group: "Structure",
  schema: nestedSchema,
  traits: planeTraits("canvas", {
    ...ITEM,
    visual: true,
    childKinds: FOOTAGE_CHILDREN,
    footage: true,
    freeCode: true,
    masked: true,
    elementActions: true,
  }),
  sample: `<Nested id="sample" of={Inside} start={0} duration={3} />`,
  sampleCode: `function Inside() {
  return (
    <Track id="inside">
      <Clip id="inside-picture" src="asset:picture" duration={3} />
    </Track>
  );
}`,
};
