---
"@uberscene/render": patch
---

The frame cache now notices changes to the code a video loads: an edit to a package it imports (a kit component in a checkout, or a new version of an installed package) draws the frames again instead of returning old ones from the cache.
