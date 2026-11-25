---
title: Cut on the beat
---

<script setup>
import { withBase } from "vitepress";
</script>

# Cut on the beat

Sixteen seconds where the music is the clock. `uberscene add groove.wav` found the track's 34 beats at 119.98 BPM,
and every shot, label and title starts on one with `anchor="song" at="beat:N"`. Nothing is timed in seconds, so
trimming the song moves all of it. Turn the sound on.

<div class="cc-pair"><video :src="withBase('/showcase/beats.webm')" :poster="withBase('/showcase/beats.jpg')" controls loop playsinline></video></div>

## Key elements

- **The song sets its own length**: `in="beat:0" out="beat:31.end"` starts it on its first beat and ends it after
  eight bars of four. ([Cut on the beat](/guide/time#cut-on-the-beat))
- **Every shot is anchored to a beat**, and the yellow label on each shows the reference it is cut on. Two bars of
  two-beat shots, then two bars where the shot changes on every beat.
- **A shot runs a little past its beats** (`duration={1.1}` for two beats of 0.5 s), and the next shot on the track
  covers it. Beats are never exactly a whole number of frames apart, and this leaves no empty frame at a cut.
- **One locked-off take, many shots**: the framing changes with `transform.scale` and an `anchor` on the cup, the
  spout or the badge.
- **A colour on every beat**: the same cup through a [`recolor`](/reference/effects/recolor) effect, eight times.
- **The title punches on each beat** with keys on `transform.scale`: up with `easeOutQuart`, then held.
  ([Hits on the beat](/reference/motion/kinetic-beats))
- **Loudness measured on the file**: -13.6 LUFS and a peak of -4.2 dBFS on the rendered WebM. The track is mono, and
  played on two channels it measures 3 LU louder than its file, so the song's `volume` is 0.7.

## The checks

```sh
npx uberscene lint beats.tsx                 # clean
npx uberscene beats.tsx --check-layout       # no layout issues
npx uberscene beats.tsx --check-motion       # no still stretch of 1 s or more
```

## The code

<<< @/../examples/showcase/beats.tsx

## The music and the footage

The music is synthesized by `examples/showcase/music.ts` (a kick, a hat, a snare and a bass line), so it is this
repository's own. The footage is espresso into a red paper cup, Pixabay video
[251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the shot has
nothing to do with this project.
