---
editLink: false
---

# Matched push

Both shots grow through a hard cut, so the camera seems to keep pushing forward.

<Example src="previews/motion/matched-push" alt="Matched push">

<<< @/../examples/showcase/motion/matched-push.tsx

</Example>

**What it conveys:** One continuous move across two shots: going deeper into the same thought.

## Use it when

- Cutting between two shots of one idea.
- A transition would slow the piece down.

## Values

| | Value | |
|---|---|---|
| outgoing | `1 to 1.25 over the last 0.4 s` | easeInQuart: speeding up into the cut |
| incoming | `0.85 to 1 over the first 0.4 s` | easeOutQuart: still moving after it |

## Ask your agent

> Cut from the first shot to the second while both grow: key the first's scale up with easeInQuart into the cut, and the second's from 0.85 with easeOutQuart.

**Goes with:** [Match on action](/reference/motion/match-on-action) · [Whip pan](/reference/motion/whip-pan)

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
