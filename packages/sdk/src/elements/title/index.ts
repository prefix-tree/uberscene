// The SDK's part of a `<Title>`: its words, read from the file onto its placement, and its old spellings.
import type { TextRun } from "@uberscene/kit/schema";

import type { SdkElement } from "../element";
import { deprecations, moved, renamed } from "./moved";

const NO_RUNS: readonly TextRun[] = [];

export const title: SdkElement<"title"> = {
  kind: "title",
  // A title's words are its children in the file, kept on its node. One with none written has no words.
  facts: (node) => ({ text: node.text ?? "", runs: node.runs ?? NO_RUNS }),
  renamed,
  moved,
  deprecations,
};
