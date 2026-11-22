---
"@uberscene/player": patch
"@uberscene/kit": patch
---

- A shader that fails to compile is compiled once: later frames report the same error instead of building and leaking a new program every frame. Shaders and programs of a failed build are deleted.
- WebGL contexts are given back: a painter or compositor that is disposed, or replaced on a size change, releases its context, and effect boxes keep at most four frame sizes at once.
- Audio sources that fail to open, or cannot be decoded, are closed and not remembered, so a later play tries again; at most eight stay open.
- Timecode at rates such as 12.5 fps counts frames within each second correctly (kit's new `secondAndFrame`).
