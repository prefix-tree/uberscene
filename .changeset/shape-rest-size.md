---
"@uberscene/sdk": patch
---

A camera's `push` makes room for a shape with no `width` or `height` at the size it is drawn, 200 pixels, where it
used to treat it as a point.
