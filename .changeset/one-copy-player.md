---
"@uberscene/player": patch
---

The player's `ease` reads easings through the kit's `easingCurve`, so a name every object inherits (`"valueOf"`) is drawn linear with a warning instead of throwing. The unused `filterString` and `hasKeyframes` are gone, and the audio envelope is read by one function.
