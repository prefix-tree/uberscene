---
editLink: false
---

# Split Compare

An animation that overlays before and after states of the same subject and compares them with a moving vertical divider.

<Example src="previews/motion/split-compare" alt="Split Compare">

<<< @/../examples/showcase/motion/split-compare.tsx

</Example>

**What it conveys:** Reveals changes in the same subject as the divider moves.

## Use it when

- When comparing a subject before and after processing
- When directly comparing the locations where changes occur

## Values

| | Value | |
|---|---|---|
| after | `the same clip, recoloured` | on a track above the before |
| crop.width | `0.15, 0.85, 0.5` | keys; a divider shape's box.x follows the same keys |

## Ask your agent

> Lay the after version over the before, crop it from the left with keys on crop.width, and move a divider with it.

**Goes with:** [Rack Focus](/reference/motion/rack-focus)

Adapted from Nº 366 of [awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion/tree/main/effects/split-compare) (MIT): its name, definition and uses. The file, its values and the prompt are UberScene's.

[All techniques](/reference/motion/) · [Motion across cuts](/guide/animation)
