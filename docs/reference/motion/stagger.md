---
editLink: false
---

# Stagger

Multiple elements appear in sequence with a consistent delay between them.

<Example src="previews/motion/stagger" alt="Stagger">

<<< @/../examples/showcase/motion/stagger.tsx

</Example>

**What it conveys:** Communicates element order and their relationship as a group.

## Use it when

- Show the reading order of a grid or list.
- Spread out the entrance of multiple elements.

## Values

| | Value | |
|---|---|---|
| step | `0.08 s` | between one card's start and the next |
| entrance | `rise 60 px and fade in, 0.6 s` | the same for every card, easeOutQuart |

## Ask your agent

> Bring the five cards in one after another, 0.08 s apart, each rising 60 px with easeOutQuart.

Adapted from Nº 006 of [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion/tree/main/effects/stagger) (MIT): its name, definition and uses. The file, its values and the prompt are UberScene's.

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
