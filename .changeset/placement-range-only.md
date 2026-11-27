---
"@uberscene/sdk": minor
"@uberscene/player": patch
---

A placement's times are only its `range` now (decision 0045, step 4): the deprecated `start`, `end` and `duration`
seconds are gone from `Placement`. Read `p.range.start`, `p.range.end` and `p.range.duration`, which are exact `Time`s,
and turn one into seconds with `toSeconds()` only to show or write it; `startSeconds(p)`, `endSeconds(p)` and
`lengthSeconds(p)` do the same. A placement's `source` keeps its `in` and `out` seconds beside its `range`, and
`composition.duration` stays beside `composition.length`.
