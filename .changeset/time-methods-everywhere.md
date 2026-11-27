---
"@uberscene/kit": minor
"@uberscene/sdk": patch
---

The sdk does its edit and inspect time math with `Time` methods (decision 0045, step 3); edits and rows come out the
same. `Time` gains `MAX`, `MIN` and `plusClamped`, a sum held at the limit instead of throwing past it, and `TimeRange` gains `clamped`, a range that holds a negative length at zero and an end past the limit at `MAX`. Kit's free tick
arithmetic and range helpers (`addTicks`, `subTicks`, `maxTicks`, `minTicks`, `clampTicks`, `rangeEnd`,
`rangeContains`, `rangeIntersect`, `TickRange` and the rest) are deprecated: use `Time` and `TimeRange`. The sdk's
`startTicks`, `startSeconds` and the other placement helpers keep working.
