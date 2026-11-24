---
editLink: false
---

# Follow-through

Parts of a thing keep going after the lead stops, and arrive a little later.

<Example src="previews/motion/follow-through" alt="Follow-through">

<<< @/../examples/showcase/motion/follow-through.tsx

</Example>

**What it conveys:** That the pieces are loose and attached, not one rigid block.

## Use it when

- A group that moves together: dots, a tail, a row of tags.
- A stop that looks too abrupt.

## Values

| | Value | |
|---|---|---|
| lead | `easeOutQuart, 0.8 s` | the first part |
| followers | `easeOutBack, +0.18 s each` | arrive later and settle past their place |

## Ask your agent

> Move the three dots right together; end each follower 0.18 s after the one before, with easeOutBack.

**Goes with:** [Stagger](/reference/motion/stagger) · [Easing](/reference/motion/easing-curves)

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
