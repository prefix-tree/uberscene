---
editLink: false
---

# Follow-through

An attached extremity continues moving through inertia after the main body stops, then settles later.

<Example src="previews/motion/follow-through" alt="Follow-through">

<<< @/../examples/showcase/motion/follow-through.tsx

</Example>

**What it conveys:** Conveys flexibility and inertia, showing that force remains after the main body stops.

## Use it when

- Show inertia in a flag or tail attached to a body.
- Add weight and flexibility to an abrupt stop.

## Values

| | Value | |
|---|---|---|
| lead | `easeOutQuart, 0.8 s` | the first part |
| followers | `easeOutBack, +0.18 s each` | arrive later and settle past their place |

## Ask your agent

> Move the three dots right together; end each follower 0.18 s after the one before, with easeOutBack.

**Goes with:** [Anticipation](/reference/motion/anticipation) · [Spring & Overshoot](/reference/motion/spring-overshoot)

Adapted from Nº 008 of [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion/tree/main/effects/follow-through) (MIT): its name, definition and uses. The file, its values and the prompt are UberScene's.

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
