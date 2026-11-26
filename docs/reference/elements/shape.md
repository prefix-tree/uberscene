---
editLink: false
---

# `<Shape>`

A vector shape (rectangle, circle, star, polygon, path) with fill, stroke and shadow.

<Example src="previews/elements/shape" alt="<Shape>">

<<< @/../examples/showcase/docs/shape.tsx

</Example>

**Used in:** [the walkthrough](/guide/writing-files) · [Product demo with zoom-ins](/recipes/product-demo)

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot, silence or beat of the anchor's source (`word:14655`, `beat:16`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until, at } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends, or `{ until: id, at: "word:54.end" }` when it plays that word, shot, silence or beat of its source. |
| `box` | { x, y, width, height, origin } |  |  | The rectangle it occupies, in pixels from the frame's top left as in CSS: `x` and `y` place the point `origin` names (its top left by default), `width` and `height` size it, and its content fills it as `fit` says. Left out, the whole frame. `transform` applies after. |
| `transform` | { scale, rotation, anchor, opacity, borderRadius, crop } |  |  | How it is turned and shown: scale, rotation, anchor, opacity, rounded corners and crop. |
| `parent` | string |  |  | Another overlay's id: this one moves with it. Its `box` is then read in the parent's box (pixels from the parent box's top left, centred in it when `x` or `y` is left out), and the parent's transform and entrance carry it, up the chain. Its opacity, crop and corners stay its own. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. Only `normal` renders ([What renders](/reference/rendering)). |
| `effects` | { type, enabled }[] |  |  | Effects drawn on it, in order: each `{ type, ...params }`, a param written as keys to animate it. |
| `ground` | boolean |  |  | A ground that other things sit on: a card under a cut-out speaker, a wall behind a game, a scrim that darkens footage under a title. The layout check treats it like a background: it is not held to the safe zone and is not said to cover the captions. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `style` | string |  |  | A theme preset for shapes. |
| `type` | "rectangle" \| "circle" \| "ellipse" \| "triangle" \| "arrow" \| … 4 more |  | yes | Which shape it draws. |
| `width` | number (> 0) \| { at, value, easing }[] \| { type, base, amount, frequency, seed } \| { type, base, speed } \| { type, keys, mode } |  |  | The shape's box width, in pixels, or keys or a generator; left out, 200. |
| `height` | number (> 0) \| { at, value, easing }[] \| { type, base, amount, frequency, seed } \| { type, base, speed } \| { type, keys, mode } |  |  | The shape's box height, in pixels, or keys or a generator; left out, 200. |
| `points` | { x, y }[] \| { at, value, easing }[] |  |  | A polygon's or path's corners, as fractions of the box from its top left, or keys of such lists: two keys with as many points move point by point (a morph); otherwise the shape changes at the key. |
| `fill` | string \| { at, value, easing }[] \| { type, color, gradient, opacity } |  |  | A colour, or keys of colours (moved in OKLab), or `{ type, color, gradient, opacity }` for a gradient or no fill. |
| `stroke` | { color, thickness, opacity, dashArray, dashOffset, lineCap, lineJoin, gradient } |  |  | The outline: colour, thickness in pixels, opacity, dashes, caps and joins. |
| `shadow` | { color, blur, x, y, spread, inset } |  |  | A drop shadow: colour, blur and offset in pixels. |
| `shadows` | { color, blur, x, y, spread, inset }[] |  |  | Several shadows, drawn in order, for layered or inner shadows. |
| `cornerRadius` | number (0..∞) \| string |  |  | A rectangle's rounded corners, in pixels or a theme token such as `$radius`. |
| `cornerRadii` | { topLeft, topRight, bottomRight, bottomLeft } |  |  | A rectangle's corners rounded one by one, in pixels. |
| `starPoints` | integer (3..∞) |  |  | How many points a star has; left out, 5. |
| `innerRadius` | number (0..1) |  |  | A star's inner corners, as a fraction of its outer radius; left out, 0.5. |

Timed, visual, transformable. Children: `mask`. [All elements](/reference/elements/)
