---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/render": minor
"uberscene": minor
---

Cut on the beat: `beat:N` is a time reference like `word:N`. `uberscene add song.mp3` finds the beats and tempo of a sound file with no transcript (`--beats` for a video's sound, `--no-beats` for none, `--bpm 120 --first-beat 0.3` for a grid), writes them into the manifest, and a clip, title or sound then starts on one with `anchor="song" at="beat:16"`, or trims the music with `in="beat:0" out="beat:63.end"`. It follows the music through every trim. `inspect` and `look` take `song@beat:16` as a moment.
