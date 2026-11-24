---
editLink: false
---

# Spring damping

A spring's feel is one number, its damping ratio: how much it bounces before it settles.

<Example src="previews/motion/spring-damping" alt="Spring damping">

<<< @/../examples/showcase/motion/spring-damping.tsx

</Example>

**What it conveys:** Character: a landing that stops dead reads as precise, one that bounces reads as alive.

## Use it when

- Anything that lands, pops in or settles.
- You would have written "bouncy": write the ratio instead.

## Values

| | Value | |
|---|---|---|
| ratio 1.0 | `damping: 20` | no bounce: text, UI, anything read |
| ratio 0.8 | `damping: 16` | one small bounce: cards, products, logos |
| ratio 0.5 | `damping: 10` | two bounces: characters, comedy (the kit's default) |

## Ask your agent

> Drop the ball on a spring with spring({ time, from, to, damping: 16 }) in a Layer: one small bounce, then still.

**Goes with:** [Overshoot](/reference/motion/spring-overshoot) · [Squash and stretch](/reference/motion/squash-stretch)

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
