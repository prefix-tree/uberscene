---
"@uberscene/sdk": patch
"@uberscene/editor": patch
---

`trimValue(item, at)` gives the value `clip/trim` takes for an edge moved to timeline time `at`: the edge's time in the
source file for footage, at the clip's speed, and `at` itself for anything else. The shadcn editor's inspector typed a
duration as a timeline time even for footage, so a clip starting at 10 with `in={2}` given a duration of 3 became 11 s
long; its Duration field and the timeline's edge drags now both go through `trimValue`.
