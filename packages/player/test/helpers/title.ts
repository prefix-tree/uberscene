import { SCHEMAS_BY_KIND, type TextRun, Time, TimeRange } from "@uberscene/kit/schema";
import type { PlacedTitle } from "@uberscene/sdk";

/**
 * A two-second title as the resolver places one: `written` parsed by the title's schema, so every default is filled,
 * with its words and the runs its marks make.
 */
export function titlePlacement(
  written: Record<string, unknown>,
  text: string,
  runs: readonly TextRun[] = [],
): PlacedTitle {
  return {
    id: "t",
    kind: "title",
    start: 0,
    duration: 2,
    range: TimeRange.of(Time.ZERO, Time.seconds(2)),
    parsed: true,
    props: SCHEMAS_BY_KIND.title.parse({ id: "t", start: 0, duration: 2, ...written }),
    text,
    runs,
  } as unknown as PlacedTitle;
}
