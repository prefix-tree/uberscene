---
"@uberscene/render": patch
---

When a media fetch fails and several assets are missing, the export error names all of them, the failed one first, instead of whichever fetch happened to fail first.
