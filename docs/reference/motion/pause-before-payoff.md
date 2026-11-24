---
editLink: false
---

# Pause Before the Payoff

The action happens, the frame holds still for half a second, then the result lands.

<Example src="previews/motion/pause-before-payoff" alt="Pause Before the Payoff">

<<< @/../examples/showcase/motion/pause-before-payoff.tsx

</Example>

**What it conveys:** A dramatic comma: the viewer has a moment to expect the result, so it lands harder.

## Use it when

- A tap, a click or a reveal whose result is the point of the scene.
- Going straight from action to result feels rushed.

## Values

| | Value | |
|---|---|---|
| pause | `0.5 s` | between the press (1.0 s) and the result (1.6 s); 0.3 to 0.75 s works |
| result | `easeOutBack` | the payoff overshoots a little |

## Ask your agent

> After the pointer presses the button, hold for 0.5 s, then pop the star in with easeOutBack.

One of UberScene's own, from the agent skill's motion doctrine.

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
