/**
 * The value `clip/trim` takes for an edge moved to timeline time `at`. For footage it is the edge's time in the source
 * file (its new `in` or `out`), counted from the clip's `in` at its speed; for anything else it is `at` itself. An
 * editor that drags an edge, or types a new duration, works in timeline seconds and passes them through this.
 */
export function trimValue(
  item: { readonly start: number; readonly source?: { readonly in: number; readonly speed: number } | undefined },
  at: number,
): number {
  const value = item.source ? item.source.in + (at - item.start) * item.source.speed : at;
  // Twelve significant digits, as the trim itself keeps: no float noise in the file.
  return Number(value.toPrecision(12));
}
