---
"@uberscene/render": patch
---

Three fixes:

- With the native codecs on, a `uberscene-codec` process that cannot start (the binary missing, too many open files)
  fails the request or piece that asked for it, with the reason, instead of crashing the export with an unhandled
  error.
- `uberscene skills install --force` deletes nothing it did not write. In a folder without its record it writes the
  skill beside what is there, where before it removed the folder: `--dir .claude/skills --force` deleted every other
  skill. In its own folder it replaces only the files it wrote, and keeps files you added.
- `look` and `--still` notice a replaced file whose asset id has a dot (`asset:logo.v2`); the frame cache looked up
  `logo` instead and kept showing the old picture.
