---
editLink: false
---

# Pan

The frame travels across a picture larger than itself.

<Example src="previews/motion/pan" alt="Pan">

<<< @/../examples/showcase/motion/pan.tsx

</Example>

**What it conveys:** Space: there is more here than one frame shows.

## Use it when

- A wide image, a landscape or a long screenshot.
- Revealing something at one side of the shot.

## Values

| | Value | |
|---|---|---|
| box | `960 × 540` | larger than the frame, so there is picture to travel over |
| box.x | `0 to -320 over 3 s` | easeInOutSine |

## Ask your agent

> Give the clip a box larger than the frame and pan across it with keys on box.x.

**Goes with:** [Push in](/reference/motion/push-in) · [Parallax](/reference/motion/parallax)

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
