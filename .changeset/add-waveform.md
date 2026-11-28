---
"@uberscene/render": minor
"@uberscene/sdk": minor
---

`uberscene add` measures anything with sound: its `waveform` (peak and RMS per 10 ms) and, for a sound file, its
`onset` (where it first reaches half its loudest). WAV is decoded in Node; AAC, Opus and MP3 are read with ffmpeg when
it is on the PATH, and left unmeasured with a warning when it is not. `--no-waveform` skips it.
