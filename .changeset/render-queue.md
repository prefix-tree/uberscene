---
"@uberscene/render": minor
"uberscene": minor
---

`uberscene queue jobs.json` exports several videos in order and prints one summary at the end. A job is
`{ file, out }` with any of `props`, `from`, `to`, `codec`, `quality`, `bitrate`, `manifest`, `draft` and `silent`,
paths relative to the queue file. Every job is checked before the first renders. The first failure stops the queue
unless `--continue-on-error`; the command exits 1 unless every job rendered, and `--json` prints the summary.
