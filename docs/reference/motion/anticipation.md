---
editLink: false
---

# Anticipation

A small move the opposite way before the real one, like a hand drawn back before a throw.

<Example src="previews/motion/anticipation" alt="Anticipation">

<<< @/../examples/showcase/motion/anticipation.tsx

</Example>

**What it conveys:** That something is about to happen, and how much force it takes.

## Use it when

- A big move that would otherwise start from nowhere.
- A jump, a throw or a launch.

## Values

| | Value | |
|---|---|---|
| pull back | `40 px over 0.4 s` | the opposite way first, easeOutCubic |
| move | `340 px over 0.5 s` | then the real move, easeOutQuart |

## Ask your agent

> Before the square moves right, pull it 40 px left for 0.4 s, then send it right with easeOutQuart.

**Goes with:** [Easing](/reference/motion/easing-curves) · [Follow-through](/reference/motion/follow-through)

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
