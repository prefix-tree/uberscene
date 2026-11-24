---
editLink: false
---

# Rack focus

The sharp part of the picture moves from one thing to another while the first goes soft.

<Example src="previews/motion/rack-focus" alt="Rack focus">

<<< @/../examples/showcase/motion/rack-focus.tsx

</Example>

**What it conveys:** Where to look now: attention passes from one subject to the next.

## Use it when

- Bringing a title or a card in front of footage.
- Two subjects at different depths.

## Values

| | Value | |
|---|---|---|
| background blur | `0 to 8 px` | the clip's `blur` effect, keyed |
| card blur | `10 to 0 px` | over the same 0.7 s, easeInOutSine |

## Ask your agent

> Move focus from the shot to the card: key the clip's blur from 0 to 8 while the card's goes from 10 to 0.

**Goes with:** [Push in](/reference/motion/push-in)

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
