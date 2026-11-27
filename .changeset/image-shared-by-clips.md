---
"@uberscene/player": patch
"@uberscene/render": patch
"uberscene": patch
---

An image used by more than one clip no longer fails with "The image source is detached": every clip of a still image was handed the same frame, and the first clip to end closed the picture for the rest. Each clip now gets a view of its own, and the picture is closed with its source.
