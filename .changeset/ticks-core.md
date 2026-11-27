---
"@uberscene/kit": minor
---

Ticks as a value, the first step of decision 0044 (timeline time is stored in ticks). `@uberscene/kit/schema` exports a `Ticks` type, a whole number of 1/254,016,000,000 s that a plain number can't be assigned to, and `TimeRange { start, duration }`, with helpers that keep every result exact: `ticks`, `secondsToTicksExact`, `ticksAsSeconds`, `ticksToFileSeconds` (the shortest decimal that reads back to the same tick), `addTicks`, `subTicks`, `minTicks`, `maxTicks`, `clampTicks`, `mulRatio`, `scaleTicks`, `ticksFromUnits`, `ticksToUnitsFloor`, `ticksFromRational`, `ticksToRationalFloor`, `ticksToRationalRound`, `frameOfTicks`, `frameStartTicks`, `snapToFrame`, `snapToNearestFrame`, `timeRange`, `rangeFromBounds`, `rangeEnd`, `rangeContains`, `rangeIsEmpty`, `rangesOverlap` and `rangeIntersect`. They round as craft-time, FilmCraft's Rust time, does. Nothing uses them yet.
