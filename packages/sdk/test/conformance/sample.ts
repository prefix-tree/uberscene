// A kind's sample (`KitElement.sample`) as a whole video file: the sample on a free track, with a second element
// beside it for the edits that need another one to point at.
import { ELEMENTS, KIT_ELEMENTS, type Kind, type MigratedKind } from "@uberscene/kit/schema";

import { manifest } from "../helpers";

/** The id every sample has. */
export const SAMPLE = "sample";
/** The element beside it. */
export const PEER = "peer";

/** The tag a file writes for `kind`. */
export function tagOf(kind: Kind): string {
  const tag = Object.entries(ELEMENTS).find(([, component]) => component.kind === kind)?.[0];
  if (!tag) throw new Error(`no tag for the kind "${kind}"`);
  return tag;
}

/** The kinds with a folder of their own: each has a sample, and each is run through the suite. */
export const SAMPLE_KINDS = Object.keys(KIT_ELEMENTS) as MigratedKind[];

export function sampleFile(kind: MigratedKind): {
  name: string;
  text: string;
  manifest: typeof manifest;
  files: Record<string, string>;
} {
  const tags = [...new Set(["Composition", "Shape", "Track", tagOf(kind)])].sort();
  const text = `import { ${tags.join(", ")} } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="samples" layout="free">
        ${KIT_ELEMENTS[kind].sample}
        <Shape id="${PEER}" start={0} duration={1} type="rectangle" width={40} height={40} box={{ x: 100, y: 100, origin: "center" }} />
      </Track>
    </Composition>
  );
}
`;
  return { name: `the ${kind} sample`, text, manifest, files: {} };
}
