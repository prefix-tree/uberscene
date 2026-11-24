---
title: A prompt becomes an edit
---

<script setup>
import { withBase } from "vitepress";
</script>

# A prompt becomes an edit

"Edit my new ad." is typed and sent. The raw shot, flat and grey, fans out into the five passes of an edit (cuts,
colour, captions, sound, graphics), each lights up in turn, and after a pause the finished shot fills its card, then
the frame, with its caption. Twelve seconds, one file, built from the [motion catalog](/reference/motion/)'s
techniques.

<div class="cc-pair"><video :src="withBase('/showcase/pipeline.webm')" :poster="withBase('/showcase/pipeline.jpg')" controls muted loop playsinline></video></div>

## Key elements

- **The prompt** is typed with a `typewriter` animation, and the send button dips on a scale key when it is pressed.
  ([Typewriter](/reference/motion/typewriter))
- **The passes come in as a stagger** (0.1 s apart, sliding up), then light one after another, each check popping with
  `easeOutBack`. ([Stagger](/reference/motion/stagger), [Spring & Overshoot](/reference/motion/spring-overshoot))
- **The lines draw in** with an `<Svg>` whose `enter` is `draw`.
- **The pause before the payoff**: the last pass lights at 6.5 s, the finished shot opens in its card at 7.1 s with keys
  on `crop.width`. ([Pause Before the Payoff](/reference/motion/pause-before-payoff),
  [Clip Reveal](/reference/motion/clip-reveal))
- **The grade** is two effects, `whiteBalance` and `vibrance`; the raw shot is the same footage with `saturation` and
  `exposure` turned down.
- **The finished cut grows out of its card**: a scale key from 0.2 to 1 from an `anchor` at the card's place, then a
  slow push-in. ([Push In](/reference/motion/push-in))
- **Footage over its cards**: a track of footage draws over the graphics in the tracks before it, so the two cards sit
  in a track before the shots' tracks and the shots show on them.

## The code

<<< @/../examples/showcase/pipeline.tsx

## The footage

Espresso into a red paper cup, Pixabay video [251](https://pixabay.com/videos/id-251/), under the Pixabay Content
License. The maker of the machine in the shot has nothing to do with this project.
