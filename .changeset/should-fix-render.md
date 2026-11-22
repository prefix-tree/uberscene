---
"@uberscene/render": patch
---

- Number flags (`--from`, `--to`, `--step`, `--cell`, `--columns`, `--bitrate`, `--keyframe`) are checked, and a value that is not a number is an error naming the flag.
- An export error is reported as itself; it is replaced by a missing-media error only when it is that media's fetch failing.
- A native encode frame with an index out of range, or sent twice, is refused instead of waiting forever.
- The frame cache is kept under 500 MB, deleting the frames used longest ago.
