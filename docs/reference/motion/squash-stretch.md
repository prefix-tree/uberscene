---
editLink: false
---

# Squash and stretch

A shape stretches while it moves fast and flattens when it hits, keeping its volume.

<Example src="previews/motion/squash-stretch" alt="Squash and stretch">

<<< @/../examples/showcase/motion/squash-stretch.tsx

</Example>

**What it conveys:** That the thing is soft and has weight, and how hard it hit.

## Use it when

- A ball, a drop or anything that bounces.
- A small bounce that feels stiff.

## Values

| | Value | |
|---|---|---|
| stretch | `{ x: 0.86, y: 1.16 }` | just before impact |
| squash | `{ x: 1.35, y: 0.68 }` | on impact, about 0.1 s |
| anchor | `{ x: 0.5, y: 1 }` | scales from the ball's bottom, on the floor |

## Ask your agent

> Drop the ball with keys on box.y (easeInQuad down, easeOutQuad up), and key its scale per axis: stretch as it falls, squash on impact, from an anchor at its bottom.

**Goes with:** [Anticipation](/reference/motion/anticipation) · [Overshoot](/reference/motion/spring-overshoot)

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
