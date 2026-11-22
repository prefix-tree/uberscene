---
title: One prompt, one line
---

<script setup>
import { withBase } from "vitepress";
</script>

# One prompt, one line

A short of espresso running into a red paper cup. An agent is asked to "change red cup color to green", writes one
line, and the same short plays with the cup green. It opens the README and the landing page, because it is the point
of UberScene in twelve seconds: the video is a file, so a change to it is a change to a line.

<div class="cc-pair"><video :src="withBase('/showcase/recolor.webm')" :poster="withBase('/showcase/recolor.jpg')" controls muted loop playsinline></video></div>

## Key elements

- **A `recolor` effect** turns the cup's red into green and leaves the rest of the picture: the steam, the machine and
  the coffee keep their colours, and the cup keeps its shading. Its `amount` has keys from 0 to 1, so the change is
  seen happening. ([`recolor`](/reference/effects/recolor))
- **The same short twice**: the same seconds of the same footage, as a 9:16 short in the frame (`box`, `fit="cover"`,
  rounded corners). Besides when they start, the only difference between them is that effects line.
- **Keys on `box.x`** move the short aside for the prompt and back. ([Keys over time](/guide/animation#keys))
- **The prompt in a `<Layer>`**: an agent's input box in React, typed letter by letter from `useLayer().elapsed`,
  then the diff it made. Every shape is a function of the time, so the preview and the export draw the same frame.
  ([Layers](/guide/anatomy#layers-a-blank-canvas-on-the-timeline))
- **Geist Mono and Inter**, declared with `googleFont()`. ([Fonts](/guide/themes#fonts))

## The code

<<< @/../examples/showcase/recolor.tsx

## The footage

Espresso into a red paper cup, Pixabay video [251](https://pixabay.com/videos/id-251/), under the Pixabay Content
License. The maker of the machine in the shot has nothing to do with this project.
