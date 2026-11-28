---
"@uberscene/render": patch
---

`uberscene fetch` reads again when a library's server cuts a stretch short, and never adds a file with nothing
playable in it (it had added a 0-second clip). ffmpeg reaches the library through `HTTPS_PROXY` when one is set.
