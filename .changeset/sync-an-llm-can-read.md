---
"@uberscene/sdk": minor
"@uberscene/render": minor
"uberscene": minor
---

The music against the picture, as data, with no browser:

- `uberscene inspect` shows each track's role and, for music whose asset has beats, its tempo and the beats it plays; `--json` has them as `music` and `beats` rows, and `tracks[].role`.
- `uberscene inspect --events [--in <stretch>] [--kinds <kinds>] [--json]` lists every moment of the video in time order: beats, words, cuts, elements starting and ending, markers, shots and silences. A cut, a start or an end says which beat it is nearest, in milliseconds and frames.
- `uberscene <file> --check-sync [--json]` lists each cut and each start on screen against its nearest beat (`on`, `near`, `off`), reports the near misses (`near-beat`) and music that stops mid-beat with no fade (`music-cut-off`) with the fix, and exits 3 on issues.
- `lint` gains `numeric-on-beat`: a numeric `in` or `out` of the music that is a beat's own time.
- The SDK exports `timelineBeats`, `timelineEntries`, `timelineEvents`, `syncReport`, `musicRows`, `beatRows` and `nearestBeat`; the render package exports `checkSync`, `formatSync` and `formatEvents`.
