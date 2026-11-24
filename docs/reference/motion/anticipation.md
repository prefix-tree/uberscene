---
editLink: false
---

# Anticipation

A brief movement in the opposite direction prepares the viewer for the main action.

<Example src="previews/motion/anticipation" alt="Anticipation">

<<< @/../examples/showcase/motion/anticipation.tsx

</Example>

**What it conveys:** Signals the direction of travel and a buildup of force, making sudden motion easier to follow.

## Use it when

- Signal the launch direction of a character or icon.
- Prepare the viewer's attention before a large movement.

## Values

| | Value | |
|---|---|---|
| pull back | `40 px over 0.4 s` | the opposite way first, easeOutCubic |
| move | `340 px over 0.5 s` | then the real move, easeOutQuart |

## Ask your agent

> Before the square moves right, pull it 40 px left for 0.4 s, then send it right with easeOutQuart.

**Goes with:** [Squash & Stretch](/reference/motion/squash-stretch) · [Easing](/reference/motion/easing-curves) · [Follow-through](/reference/motion/follow-through)

Adapted from Nº 002 of [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion/tree/main/effects/anticipation) (MIT): its name, definition and uses. The file, its values and the prompt are UberScene's.

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
