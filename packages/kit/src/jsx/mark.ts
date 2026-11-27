import type { ReactNode } from "react";
import { z } from "zod";

import { type ResolvedTheme, themeToken } from "../theme/theme";
import { colorSchema, fontWeightSchema } from "./schemas/common";

/**
 * How a marked stretch of a title's text differs from the rest: its colour (a colour or a theme token, `"$accent"`),
 * and optionally its weight, italics, and a highlight behind it. Everything else is the title's own style.
 */
export const markSchema = z.strictObject({
  /** The words' colour: a colour, or a theme token such as `"$accent"`. */
  color: colorSchema.optional(),
  /** Their weight, as the title's `style.weight` takes it. */
  weight: fontWeightSchema.optional(),
  /** Set them in italics. */
  italic: z.boolean().optional(),
  /** A colour behind them: a highlight. */
  background: colorSchema.optional(),
});
export type MarkProps = z.infer<typeof markSchema> & { readonly children?: ReactNode };

/**
 * A stretch of a title's text drawn its own way, from character `from` up to `to` of the title's text, with the look
 * its `<Mark>` gives. A title's runs never overlap and are in order.
 */
export interface TextRun extends z.infer<typeof markSchema> {
  readonly from: number;
  readonly to: number;
}

/**
 * `<Mark>`: words inside a `<Title>` drawn in their own colour, weight or highlight, as part of the title's text:
 * `<Title>into the <Mark color="$accent">stars</Mark></Title>`. It has no id and no time of its own, and holds text
 * only (marks do not nest). Typewriter and word-by-word animations count its words with the rest.
 */
export function Mark(props: MarkProps): ReactNode {
  return props.children ?? null;
}
Mark.isTextMark = true as const;

/** Whether a component is `<Mark>`. */
export function isTextMark(type: unknown): boolean {
  return typeof type === "function" && (type as { isTextMark?: unknown }).isTextMark === true;
}

/**
 * A title's runs with their `$token` colours made the theme's values. `unknown` lists the tokens the theme does not
 * have; those colours are left as written.
 */
export function themedRuns(
  runs: readonly TextRun[],
  theme: ResolvedTheme,
): { readonly runs: readonly TextRun[]; readonly unknown: readonly string[] } {
  const unknown: string[] = [];
  const value = (v: string | undefined): string | undefined => {
    if (v === undefined || !v.startsWith("$")) return v;
    const t = themeToken(theme, v.slice(1));
    if (t === undefined) {
      if (!unknown.includes(v)) unknown.push(v);
      return v;
    }
    return String(t);
  };
  const out = runs.map((r) => {
    const color = value(r.color);
    const background = value(r.background);
    return color === r.color && background === r.background
      ? r
      : { ...r, ...(color !== undefined ? { color } : {}), ...(background !== undefined ? { background } : {}) };
  });
  return { runs: out, unknown };
}

/**
 * The runs of `before` carried onto its new text `after`: each marked phrase is found again in `after`, in order and
 * after the one before it, starting and ending on a word edge where it did; a phrase no longer there loses its mark.
 * So retyping a title around its coloured word keeps the word coloured.
 */
export function moveRuns(before: string, runs: readonly TextRun[], after: string): TextRun[] {
  const edge = (text: string, i: number) =>
    i <= 0 || i >= text.length || /\s/.test(text[i - 1]!) || /\s/.test(text[i]!);
  const out: TextRun[] = [];
  let from = 0;
  for (const run of runs) {
    const phrase = before.slice(run.from, run.to);
    if (phrase.length === 0) continue;
    const startsOnEdge = edge(before, run.from);
    const endsOnEdge = edge(before, run.to);
    for (let at = after.indexOf(phrase, from); at >= 0; at = after.indexOf(phrase, at + 1)) {
      const end = at + phrase.length;
      if ((startsOnEdge && !edge(after, at)) || (endsOnEdge && !edge(after, end))) continue;
      out.push({ ...run, from: at, to: end });
      from = end;
      break;
    }
  }
  return out;
}
