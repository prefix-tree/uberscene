---
editLink: false
---

# `recolor`

Turns one colour into another and leaves the rest: a red cup made green.

<Example src="previews/effects/recolor" alt="recolor">

<<< @/../examples/showcase/effects/recolor.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Params

Drawn as a shader.

| param | type | default | description |
|---|---|---|---|
| `from` | string | `"#c4202b"` | The colour to change: the object's colour as it was filmed. |
| `to` | string | `"#2f9e4f"` | The colour it becomes. |
| `tolerance` | number (0..0.5) | `0.06` | How far a hue may lie from `from`'s and still turn fully, as a part of the colour circle (0.5 is half a turn). |
| `softness` | number (0..0.5) | `0.05` | How wide the fade is between turned and kept hues, past `tolerance`. |
| `amount` | number (0..1) | `1` | How much of the effect to mix in: 0 leaves the picture as it was, 1 is the full effect. |

[All effects and transitions](/reference/effects/) · [Units](/reference/effects/#units)
