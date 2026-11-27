import { elapsedSeconds, type TimeRange, tidySeconds } from "@uberscene/kit/schema";

import { sinceStart } from "../time";

/** What `trimValue` reads of an element: a placement's `range`, or an inspect row's `start` in seconds. */
type Trimmed = { readonly source?: { readonly in: number; readonly speed: number } | undefined } & (
  | { readonly range: TimeRange }
  | { readonly start: number }
);

/**
 * The value `clip/trim` takes for an edge moved to timeline time `at`. For footage it is the edge's time in the source
 * file (its new `in` or `out`), counted from the clip's `in` at its speed; for anything else it is `at` itself. An
 * editor that drags an edge, or types a new duration, works in timeline seconds and passes them through this.
 */
export function trimValue(item: Trimmed, at: number): number {
  if (!item.source) return tidySeconds(at);
  const since = "range" in item ? sinceStart(item, at) : elapsedSeconds(at, item.start);
  // No float noise in the file, and a frame-exact time stays exact, as the trim itself keeps it.
  return tidySeconds(item.source.in + since * item.source.speed);
}
