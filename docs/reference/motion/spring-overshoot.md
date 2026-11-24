---
editLink: false
---

# Spring & Overshoot

An object briefly exceeds its target scale before returning and settling.

<Example src="previews/motion/spring-overshoot" alt="Spring & Overshoot">

<<< @/../examples/showcase/motion/spring-overshoot.tsx

</Example>

**What it conveys:** Shows inertia and restoring force as the object settles.

## Use it when

- Reveal a small object or settle it into a selected state.
- Explain overshoot and recovery with a graph.

## Values

| | Value | |
|---|---|---|
| easing | `"easeOutBack"` | passes its size and settles back |
| scale | `0 to 1 over 0.6 s` | keys on `transform.scale` |

## Ask your agent

> Pop the card in with a scale key from 0 to 1 and easing easeOutBack.

**Goes with:** [Anticipation](/reference/motion/anticipation) · [Squash & Stretch](/reference/motion/squash-stretch) · [Easing](/reference/motion/easing-curves)

Adapted from Nº 004 of [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion/tree/main/effects/spring-overshoot) (MIT): its name, definition and uses. The file, its values and the prompt are UberScene's.

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
