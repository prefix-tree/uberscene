---
editLink: false
---

# Parallax

A motion effect that creates depth by moving nearer layers faster and distant layers more slowly as the camera moves.

<Example src="previews/motion/parallax" alt="Parallax">

<<< @/../examples/showcase/motion/parallax.tsx

</Example>

**What it conveys:** Creates a sense of distance and space between flat elements.

## Use it when

- When showing the distance between foreground and background
- When moving elements at multiple depths in a scrolling scene

## Values

| | Value | |
|---|---|---|
| distances | `60, 160 and 320 px` | far, middle and near layers, over the same 3 s |

## Ask your agent

> Move three rows of shapes the same way over 3 s: the far row 60 px, the middle 160, the near 320.

**Goes with:** [Pan](/reference/motion/pan)

Adapted from Nº 220 of [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion/tree/main/effects/parallax) (MIT): its name, definition and uses. The file, its values and the prompt are UberScene's.

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
