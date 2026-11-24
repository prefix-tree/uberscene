---
"@uberscene/render": minor
"uberscene": minor
---

`uberscene video.tsx --check-motion` reports every stretch where nothing on screen moves for a second or more (`--min`), with what is on screen in it: small frames every 0.2 s (`--step`), drawn as the export draws them, each compared with the next by the share of pixels that changed. A contact sheet of stills cannot show a frozen video; this can. It exits 3 when it finds one, like `--check-layout`, and keeps its frames in the cache.
