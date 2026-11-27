import type { ResolvedTheme } from "@uberscene/kit/schema";

const tokensByTheme = new WeakMap<ResolvedTheme, Readonly<Record<string, string>>>();

/** A theme's tokens as SVG attribute values. */
export function themeTokens(theme: ResolvedTheme | undefined): Readonly<Record<string, string>> {
  if (!theme) return {};
  let tokens = tokensByTheme.get(theme);
  if (!tokens) {
    tokens = Object.fromEntries(Object.entries(theme.tokens).map(([k, v]) => [k, String(v)]));
    tokensByTheme.set(theme, tokens);
  }
  return tokens;
}
