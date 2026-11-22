---
"@uberscene/sdk": patch
---

- A split must leave at least one frame on each side, and the times it writes are rounded, with no float noise.
- Folding edits back into a file re-reads its imports only when the edits need them, which makes dragging faster on long files.
