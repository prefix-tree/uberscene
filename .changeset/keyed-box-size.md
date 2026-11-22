---
"@uberscene/player": patch
---

An element whose `box.x` or `box.y` has keys keeps its box's `width` and `height` while it moves. They were dropped, so a clip sliding across the frame in a 9:16 box filled the whole frame instead.
