---
"@uberscene/sdk": patch
"@uberscene/render": patch
"uberscene": patch
---

`inspect` and `--check-sync` tell exact beats from found ones: a music row's `grid` is `"grid"` when every beat is the same length to the millisecond (set with `uberscene add --bpm`, or music made on a clock) and `"detected"` when the beats were found in the sound. The text says "beats on a grid" or "beats found in the sound".
