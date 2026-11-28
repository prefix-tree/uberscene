// A title's old spellings, in one place: the resolver's words for a key that moved, and the lint's rows that move it.
import { TEXT_ANIMATION_TYPES, TEXT_DECORATIONS, TITLE_LOOK_KEYS } from "@uberscene/kit/schema";

import { type Deprecation, oldOf, rename, renames, respelled } from "../../source/lint/deprecation";

/** Keys renamed in 0.6, by the object they are in: old to new. */
export const renamed = { animation: { preset: "type" }, "style.stroke": { width: "thickness" } } as const;

const listed = (moved: readonly string[], into: string): string =>
  moved.map((k) => `\`${k}\` is now \`${into}.${k}\``).join(", ");

/** A title's look was flat props before 0.6 and is its `style` since; its text box's size is its `box`'s. */
export function moved(at: string, keys: readonly string[]): string[] {
  const look = keys.filter((k) => TITLE_LOOK_KEYS.includes(k));
  const size = keys.filter((k) => k === "width" || k === "height");
  return [
    ...(at === "" && look.length > 0 ? [listed(look, "style")] : []),
    ...((at === "" || at === "style") && size.length > 0 ? [listed(size, "box")] : []),
  ];
}

export const deprecations: readonly Deprecation[] = [
  ...TITLE_LOOK_KEYS.map(
    (prop): Deprecation => ({ element: "Title", prop, to: { into: "style", wrap: "preset" }, since: "0.6.0" }),
  ),
  ...renames("Title", renamed),
  // The outline as it was written before the look moved into `style`.
  rename("Title", "stroke.width", "thickness"),
  ...respelled("Title", ["animation.preset", "animation.type"], oldOf(TEXT_ANIMATION_TYPES)),
  ...respelled("Title", ["decoration", "style.decoration"], oldOf(TEXT_DECORATIONS)),
];
