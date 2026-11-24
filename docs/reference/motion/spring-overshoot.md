---
editLink: false
---

# Overshoot

An entrance that goes a little past its place and settles back.

<Example src="previews/motion/spring-overshoot" alt="Overshoot">

<<< @/../examples/showcase/motion/spring-overshoot.tsx

</Example>

**What it conveys:** Life and energy: the thing arrives with some spring in it.

## Use it when

- Popping in a card, a badge or a button.
- A result that should land with a little bounce.

## Values

| | Value | |
|---|---|---|
| easing | `"easeOutBack"` | passes its size and settles back |
| scale | `0 to 1 over 0.6 s` | keys on `transform.scale` |

## Ask your agent

> Pop the card in with a scale key from 0 to 1 and easing easeOutBack.

**Goes with:** [Stagger](/reference/motion/stagger) · [Pause before the payoff](/reference/motion/pause-before-payoff)

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
