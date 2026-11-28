import { readTimeNeeded, round3, titleWords } from "@uberscene/kit/schema";
import type { ResolvedState } from "@uberscene/sdk";
import { endSeconds, lengthSeconds, placed, startSeconds } from "@uberscene/sdk";

/** A title on screen for less time than its words take to read. Times are composition seconds, rounded. */
export interface ReadTimeIssue {
  readonly id: string;
  readonly kind: "title";
  /** When it shows and when it goes. */
  readonly from: number;
  readonly to: number;
  /** How long it is on screen. */
  readonly seconds: number;
  /** How long it needs (`readTimeNeeded`). */
  readonly needs: number;
  readonly words: number;
  readonly message: string;
  readonly fix: string;
}

/**
 * Every title whose time on screen is shorter, by more than a frame, than 0.5 s plus 0.3 s a word, plus the time its
 * words take to type in or appear one by one. Reads the resolved timeline only: no frame is drawn. Titles that
 * overlap `from`–`to` are checked; captions are not, since speech sets their pace.
 */
export function checkReadTime(
  state: ResolvedState,
  window: { readonly from?: number | undefined; readonly to?: number | undefined } = {},
): ReadTimeIssue[] {
  const frame = 1 / state.composition.fps;
  const from = window.from ?? 0;
  const to = window.to ?? state.composition.duration;
  const out: ReadTimeIssue[] = [];
  for (const item of state.items.values()) {
    // A title whose props did not parse is not drawn, so it has no time on screen to check.
    const p = placed(item, "title");
    if (!p || endSeconds(p) <= from || startSeconds(p) >= to) continue;
    const words = titleWords(p.text).length;
    if (words === 0) continue;
    const animation = p.props.animation;
    const needs = round3(readTimeNeeded(words, animation));
    const seconds = round3(lengthSeconds(p));
    if (needs - seconds <= frame) continue;
    const reveal =
      animation?.type === "typewriter" ? " typed in" : animation?.type === "wordByWord" ? " shown word by word" : "";
    out.push({
      id: p.id,
      kind: "title",
      from: round3(startSeconds(p)),
      to: round3(endSeconds(p)),
      seconds,
      needs,
      words,
      message: `"${p.id}" is on screen ${seconds.toFixed(2)} s; ${words} word${words === 1 ? "" : "s"}${reveal} need ${needs.toFixed(2)} s to be read`,
      fix: `hold it ${needs.toFixed(2)} s or more (duration), or cut words`,
    });
  }
  return out.sort((a, b) => a.from - b.from);
}
