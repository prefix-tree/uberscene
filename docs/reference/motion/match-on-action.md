---
editLink: false
---

# Match on Action

Objects or camera before and after a cut move in the same screen direction and speed flow, so two scenes read as one action.

<Example src="previews/motion/match-on-action" alt="Match on Action">

<<< @/../examples/showcase/motion/match-on-action.tsx

</Example>

**What it conveys:** The cut goes unnoticed and the action carries through, making the transition feel like natural flow.

## Use it when

- A thrown object in scene A enters scene B from the same side.
- Build continuity of action across different screens.

## Values

| | Value | |
|---|---|---|
| leaving | `320 to 40 px, easeInQuart` | fast at the cut |
| arriving | `600 to 320 px, easeOutQuart` | already moving the same way |

## Ask your agent

> Cut while the subject moves left: it speeds out of the first scene, and the next scene's subject arrives moving left.

**Goes with:** [Whip Pan](/reference/motion/whip-pan)

Adapted from Nº 178 of [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion/tree/main/effects/match-on-action) (MIT): its name, definition and uses. The file, its values and the prompt are UberScene's.

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
