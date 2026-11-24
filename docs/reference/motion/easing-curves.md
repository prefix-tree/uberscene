---
editLink: false
---

# Easing

How a move speeds up and slows down between its keys, instead of running at one speed.

<Example src="previews/motion/easing-curves" alt="Easing">

<<< @/../examples/showcase/motion/easing-curves.tsx

</Example>

**What it conveys:** Weight and intent: a thing that eases into place looks placed, one at constant speed looks mechanical.

## Use it when

- Any move from one place to another.
- A move looks robotic and you can't say why.

## Values

| | Value | |
|---|---|---|
| easing | `"easeOutQuart"` | on the first key: fast off the mark, slow into place |
| duration | `1 s` | between the two keys on `box.x` |

## Ask your agent

> Move the square across with keys on box.x and easing easeOutQuart, beside one that moves linearly.

**Goes with:** [Anticipation](/reference/motion/anticipation) · [Overshoot](/reference/motion/spring-overshoot)

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
