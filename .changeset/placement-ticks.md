---
"@uberscene/sdk": minor
---

The resolver places in ticks (decision 0044, phase 2). Every `Placement` has `range: TimeRange`, its start and length as whole ticks, and a clip's or audio's `source` has `range` too; `ResolvedState.composition` has `length` in ticks. A sequence's cuts are sums of whole numbers, so they no longer drift: the third of three clips of 0.1, 0.2 and 0.3 s starts at exactly 0.3 s. `start`, `end` and `duration` (and the composition's `duration`) are still there, derived from the ticks, and are deprecated: read `range`. A transition's length is checked against its clips exactly, without a slack. The new `PlacementSource` type names a placement's source.
