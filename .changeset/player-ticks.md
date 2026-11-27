---
"@uberscene/sdk": minor
"@uberscene/player": patch
"@uberscene/render": patch
"@uberscene/editor": patch
---

The player, render and the editor read a placement's time through its tick `range` (decision 0044, phase 4). Whether an element shows at a time, where a transition is, an element's own clock for keys, animations and effects, and the audio windows are all worked out from exact ticks, not from float seconds. The sdk exports the helpers they use, for your own code on placements: `startTicks`, `endTicks`, `lengthTicks`, `startSeconds`, `endSeconds`, `lengthSeconds` and `secondsSinceStart`. Use them instead of a placement's deprecated `start`, `end` and `duration`, which go away in a later release. `trimValue` takes a placement or an inspect row. The editor's inspector and nudge read these helpers too (re-add the `editor` registry item to pick that up).
