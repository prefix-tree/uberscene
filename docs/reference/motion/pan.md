---
editLink: false
---

# Pan

A camera move that scans a wide scene in one direction while keeping the scale constant.

<Example src="previews/motion/pan" alt="Pan">

<<< @/../examples/showcase/motion/pan.tsx

</Example>

**What it conveys:** Shows the sequence and flow of stages arranged across a space.

## Use it when

- When scanning a long process diagram in sequence
- When stopping on the final subject in a horizontal scene

## Values

| | Value | |
|---|---|---|
| box | `960 × 540` | larger than the frame, so there is picture to travel over |
| box.x | `0 to -320 over 3 s` | easeInOutSine |

## Ask your agent

> Give the clip a box larger than the frame and pan across it with keys on box.x.

**Goes with:** [Parallax](/reference/motion/parallax)

Adapted from Nº 219 of [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion/tree/main/effects/pan) (MIT): its name, definition and uses. The file, its values and the prompt are UberScene's.

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
