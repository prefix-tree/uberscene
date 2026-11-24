---
editLink: false
---

# Clip Reveal

The visible region inside a boundary widens to reveal content from one side.

<Example src="previews/motion/clip-reveal" alt="Clip Reveal">

<<< @/../examples/showcase/motion/clip-reveal.tsx

</Example>

**What it conveys:** Content opens along its edge and guides the reading direction.

## Use it when

- When a title or image opens upward like a shutter
- When bars or lines are revealed with a direction

## Values

| | Value | |
|---|---|---|
| crop.width | `0 to 1 over 1 s` | keys, easeInOutQuart: opens from the left |

## Ask your agent

> Reveal the shot from the left with keys on its crop.width from 0 to 1.

Adapted from Nº 059 of [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion/tree/main/effects/clip-reveal) (MIT): its name, definition and uses. The file, its values and the prompt are UberScene's.

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
