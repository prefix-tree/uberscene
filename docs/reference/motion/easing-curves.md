---
editLink: false
---

# Easing

Easing changes velocity over the course of an animation while keeping its distance and duration constant.

<Example src="previews/motion/easing-curves" alt="Easing">

<<< @/../examples/showcase/motion/easing-curves.tsx

</Example>

**What it conveys:** Adds weight to starts and stops; ease-out responds quickly and then settles smoothly.

## Use it when

- Compare the perceived speed of otherwise identical movements.
- Make UI motion respond quickly and stop smoothly.

## Values

| | Value | |
|---|---|---|
| easing | `"easeOutQuart"` | on the first key: fast off the mark, slow into place |
| duration | `1 s` | between the two keys on `box.x` |

## Ask your agent

> Move the square across with keys on box.x and easing easeOutQuart, beside one that moves linearly.

**Goes with:** [Anticipation](/reference/motion/anticipation) · [Spring & Overshoot](/reference/motion/spring-overshoot)

Adapted from Nº 003 of [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion/tree/main/effects/easing-curves) (MIT): its name, definition and uses. The file, its values and the prompt are UberScene's.

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
