---
editLink: false
---

# Stagger

The same entrance on several things, each starting a beat after the one before.

<Example src="previews/motion/stagger" alt="Stagger">

<<< @/../examples/showcase/motion/stagger.tsx

</Example>

**What it conveys:** Order: the eye reads the items one by one instead of all at once.

## Use it when

- A list, a grid of cards, a row of logos.
- Several things would otherwise appear in one block.

## Values

| | Value | |
|---|---|---|
| step | `0.08 s` | between one card's start and the next |
| entrance | `rise 60 px and fade in, 0.6 s` | the same for every card, easeOutQuart |

## Ask your agent

> Bring the five cards in one after another, 0.08 s apart, each rising 60 px with easeOutQuart.

**Goes with:** [Overshoot](/reference/motion/spring-overshoot) · [Follow-through](/reference/motion/follow-through)

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
