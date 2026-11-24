---
editLink: false
---

# Squash & Stretch

An object stretches as it gains speed and squashes on impact while keeping the product of its axis scales constant.

<Example src="previews/motion/squash-stretch" alt="Squash & Stretch">

<<< @/../examples/showcase/motion/squash-stretch.tsx

</Example>

**What it conveys:** Conveys elasticity, weight, and the force of impact.

## Use it when

- Show the impact of a ball or flexible character.
- Add elasticity to a small bounce.

## Values

| | Value | |
|---|---|---|
| stretch | `{ x: 0.86, y: 1.16 }` | just before impact |
| squash | `{ x: 1.35, y: 0.68 }` | on impact, about 0.1 s |
| anchor | `{ x: 0.5, y: 1 }` | scales from the ball's bottom, on the floor |

## Ask your agent

> Drop the ball with keys on box.y (easeInQuad down, easeOutQuad up), and key its scale per axis: stretch as it falls, squash on impact, from an anchor at its bottom.

**Goes with:** [Anticipation](/reference/motion/anticipation) · [Spring & Overshoot](/reference/motion/spring-overshoot)

Adapted from Nº 005 of [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion/tree/main/effects/squash-stretch) (MIT): its name, definition and uses. The file, its values and the prompt are UberScene's.

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
