/**
 * How long words must stay on screen to be read: 0.5 s to find them, plus 0.3 s a word. The skill's rule for titles
 * (`text.md`), which `--check-layout` enforces.
 */
export const READ_TIME = { base: 0.5, perWord: 0.3 } as const;

/** The words of a title's text, as the player reveals them word by word: what lies between runs of white space. */
export function titleWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/**
 * Seconds a title of `words` words needs on screen: the read time, plus the time before its last word shows when it
 * types in (`animation.in`) or comes word by word (`stagger` per word after the first; `in / words` when no stagger is
 * written, as the player draws it). Fades and slides add nothing: words can be read while they move.
 */
export function readTimeNeeded(
  words: number,
  animation?: { readonly type: string; readonly in?: number | undefined; readonly stagger?: number | undefined },
): number {
  const read = READ_TIME.base + READ_TIME.perWord * words;
  const shownIn = animation?.in ?? 0.5;
  if (animation?.type === "typewriter") return read + shownIn;
  if (animation?.type === "wordByWord" && words > 1) return read + (animation.stagger ?? shownIn / words) * (words - 1);
  return read;
}
