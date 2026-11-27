---
"@uberscene/sdk": patch
---

Edits and inspect rows now work out times in ticks (decision 0044, phase 3). Splitting, trimming, rippling, moving overlays and transitions, and the times `inspect` lists (rows, moments, plays, music, subtitles) read a placement's exact `range` instead of its float seconds, so a cut or a "last frame of" moment no longer lands a hair off its frame at 29.97 or 23.976 fps. Nothing a file says changes.
