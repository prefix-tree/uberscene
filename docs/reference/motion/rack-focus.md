---
editLink: false
---

# Rack Focus

A focus shift that swaps sharpness between foreground and background subjects without changing their positions.

<Example src="previews/motion/rack-focus" alt="Rack Focus">

<<< @/../examples/showcase/motion/rack-focus.tsx

</Example>

**What it conveys:** Shifts visual priority from the foreground subject to the background subject.

## Use it when

- When transferring attention between foreground and background
- When changing the relative emphasis of two subjects without moving the scene

## Values

| | Value | |
|---|---|---|
| background blur | `0 to 8 px` | the clip's `blur` effect, keyed |
| card blur | `10 to 0 px` | over the same 0.7 s, easeInOutSine |

## Ask your agent

> Move focus from the shot to the card: key the clip's blur from 0 to 8 while the card's goes from 10 to 0.

Adapted from Nº 222 of [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion/tree/main/effects/rack-focus) (MIT): its name, definition and uses. The file, its values and the prompt are UberScene's.

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
