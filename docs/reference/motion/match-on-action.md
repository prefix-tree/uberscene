---
editLink: false
---

# Match on action

The cut lands mid-move, and the next shot picks up the same move in the same direction.

<Example src="previews/motion/match-on-action" alt="Match on action">

<<< @/../examples/showcase/motion/match-on-action.tsx

</Example>

**What it conveys:** Continuity: two shots read as one action.

## Use it when

- Cutting between scenes that both move.
- A cut that should be felt, not seen.

## Values

| | Value | |
|---|---|---|
| leaving | `320 to 40 px, easeInQuart` | fast at the cut |
| arriving | `600 to 320 px, easeOutQuart` | already moving the same way |

## Ask your agent

> Cut while the subject moves left: it speeds out of the first scene, and the next scene's subject arrives moving left.

**Goes with:** [Matched push](/reference/motion/matched-push) · [Match cut](/reference/motion/match-cut)

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
