---
"@uberscene/kit": minor
"@uberscene/sdk": patch
---

`Time` and `TimeRange`, timeline time as exact values (decision 0045). A `Time` is a whole number of ticks made from seconds or text (`Time.seconds(0.2)`, `Time.parse("0.4")`, `Time.parse("1001/30000")`, `Time.frames(n, rate)`), with all its math as methods (`plus`, `minus`, `times`, `compare`, `isBefore`, `frame`, `snap`, ...). Text is read digit by digit, so `"0.4"` is exactly 0.4 s, and `Time.seconds(0.1 + 0.2)` is the same tick as `Time.seconds(0.3)`. A `Time` can't be used as a number: `a + b` doesn't compile, and `a < b` throws. `TimeRange` is a half-open range of two `Time`s with `contains`, `overlaps`, `intersect`, `progress` and `snapOut`. The raw `{ start, duration }` interface of ticks that `Placement.range` uses is renamed from `TimeRange` to `TickRange`; a placement's range becomes a `TimeRange` in a later release.
