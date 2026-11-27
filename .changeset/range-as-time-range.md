---
"@uberscene/sdk": minor
"@uberscene/player": patch
---

A placement's `range` is a `TimeRange` of exact `Time`s (decision 0045, step 2), and so is a source's `range`; `ResolvedState.composition.length` is a `Time`. Read a placement's times with its methods: `p.range.start`, `p.range.end`, `p.range.duration`, `p.range.contains(t)`, `p.range.start.isOnFrame(rate)`, `p.range.start.toSeconds()`. Compare with `equals`, not `===`. If you read `range.start` as a number of ticks before, read `range.start.ticks`. A time past about 9.85 hours, or a length below zero in a broken file, is held at the limit or at zero in the range, as the resolver reports it. The deprecated `start`, `end` and `duration` seconds are derived from the range as before, and `startTicks`, `startSeconds` and the other helpers keep working.
