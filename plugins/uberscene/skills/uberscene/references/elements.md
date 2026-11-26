# Elements

Every element a file can use, with its props. Generated from the code by `scripts/gen-docs.ts`; do not edit.

## `<Composition>`

The video: frame rate, size, background and theme. It ends where its content ends. Clips written straight in it play in order, as its main track.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string | `"composition"` |  | The video's name. |
| `fps` | number (>0..240) \| "23.976" \| "29.97" \| "47.952" \| "59.94" \| "119.88" \| { num, den } |  | yes | Frames per second: a number (`30`, `25`, `60`), an NTSC rate by name (`"29.97"`, `"23.976"`, `"59.94"`, which are 30000/1001, 24000/1001 and 60000/1001), or an exact fraction `{ num, den }`. A rate must divide into whole ticks. |
| `width` | integer (16..8192) |  | yes | The frame's width in pixels. |
| `height` | integer (16..8192) |  | yes | The frame's height in pixels. |
| `sampleRate` | integer (8000..192000) | `48000` |  | The soundtrack's samples per second. It must divide into whole ticks; 44100, 48000 and 96000 do. |
| `channels` | integer (1..8) | `2` |  | The soundtrack's channels: 1 is mono, 2 stereo. |
| `background` | { type, color, gradient } |  |  | What shows where nothing covers the frame: a colour, a gradient, or (`blur`) the picture itself, blurred to fill. |
| `theme` | { extends, palette, fonts, radius, motion, styles } |  |  | The video's look: palette, fonts, radius, motion style and element presets. Elements use it through `$tokens` and `style`. |
| `motionBlur` | { shutterAngle, samples } |  |  | A film camera's blur on everything that moves, in the export: each frame averages `samples` moments across the time its shutter is open, `shutterAngle` degrees of the frame (180 is half the frame, the film default). Drawn by the browser export, which a file with it uses on its own; the preview stays sharp. |

Children: `track`, `camera`, `marker`, `captions`. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Track>`

A row of elements, drawn over the clips written straight in the composition and the tracks before it. A sequence track plays its children back to back; a free track (`layout="free"`) places each at its own start.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The track's name in the file; ducking and actions refer to it by this. |
| `layout` | "sequence" \| "free" | `"sequence"` |  | `sequence` plays its children back to back; `free` places each at its own `start` or anchor. |
| `name` | string |  |  | A label for the editor's track header. |
| `role` | "general" \| "captions" \| "dialogue" \| "music" \| "effects" \| "ambience" | `"general"` |  | What the track holds; a `duck` with `under: "dialogue"` turns sound down under every track of that role. |
| `locked` | boolean | `false` |  | The editor will not change it. |
| `hidden` | boolean | `false` |  | Not drawn and not heard. |
| `muted` | boolean | `false` |  | Drawn but not heard. |
| `solo` | boolean | `false` |  | When any track is solo, only solo tracks are heard. |
| `group` | string |  |  | Tracks with the same group move together in the editor. |

Children: `clip`, `audio`, `gap`, `transition`, `title`, `shape`, `svg`, `sticker`, `adjustment`, `nested`, `layer`, `multicam`. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Clip>`

A stretch of a video or image asset, trimmed by seconds, transcript words or camera shots, with speed, fit and transform.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot, silence or beat of the anchor's source (`word:14655`, `beat:16`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until, at } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends, or `{ until: id, at: "word:54.end" }` when it plays that word, shot, silence or beat of its source. |
| `src` | string \| any |  | yes | The media, as `asset:<id>` from the manifest, or a 3D scene module (`import * as crossing from "./crossing.scene.js"`), which plays like footage: `in`, `out`, `speed` and trims are in the scene's own seconds. |
| `in` | number (0..∞) \| string |  |  | Where in the source it starts: seconds, or a word, shot, silence or beat of the source (`word:12`, `beat:16`). |
| `out` | number (0..∞) \| string |  |  | Where in the source it ends, as `in`; `word:40.end` ends after the word is said. |
| `speed` | number (0.1..20) \| { at, value, easing }[] |  |  | Playback rate: 2 plays twice as fast and half as long; keys ramp it. |
| `freezes` | { start, duration, source }[] |  |  | Frames held on screen while the clip's time stands still. |
| `reverse` | boolean | `false` |  | Plays the trimmed source backwards. |
| `times` | object |  |  | With a scene: moments of the edit handed into it by name, which its keys may use for `at`. `{ reveal: "marker:reveal" }` puts the scene's `reveal` where the marker is, wherever the clip or the marker moves. |
| `box` | { x, y, width, height, origin } |  |  | The rectangle it occupies, in pixels from the frame's top left as in CSS: `x` and `y` place the point `origin` names (its top left by default), `width` and `height` size it, and its content fills it as `fit` says. Left out, the whole frame. `transform` applies after. |
| `transform` | { scale, rotation, anchor, opacity, borderRadius, crop } |  |  | How it is turned and shown: scale, rotation, anchor, opacity, rounded corners and crop. |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  | How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. |
| `effects` | { type, enabled }[] |  |  | Effects drawn on it, in order: each `{ type, ...params }`, a param written as keys to animate it. |
| `blendOpacity` | number (0..1) |  |  | How strongly it blends: multiplied into its opacity. |
| `volume` | number (0..4) \| { at, value, easing }[] |  |  | A gain: 1 plays the source as it is, 0 mutes it, 2 is twice as loud; keys change it over time. |
| `pan` | number (-1..1) \| { at, value, easing }[] |  |  | Where it sits between the speakers, from -1 (left) to 1 (right); keys move it. |
| `fade` | { in, out } |  |  | Seconds the sound fades in at the start and out at the end. |
| `duck` | { under, to, attack, release } |  |  | Turns this sound down while another plays: `under` is a track id or a track role (`dialogue`), `to` the volume it falls to, `attack` and `release` the seconds it takes to fall and recover. |
| `frame` | { focus } |  |  | Reframe to the composition's aspect: the resolver writes `transform.crop` from the source size and this focus, unless a crop is written. |
| `cutout` | boolean \| { shrink, feather } |  |  | Cut the subject out of its background with the asset's matte: a greyscale video of the same frames, white where the subject is, named by `"matte": "<asset id>"` on the asset's manifest entry. Where the matte is black the clip is transparent, so what is under it shows. It applies before `effects`, so they act on the subject alone. `true`, or `{ shrink, feather }` in pixels of the composition: `shrink` pulls the edge in, `feather` softens it. |

Timed, visual, audible, trims its source, transformable. Children: `mask`. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Camera>`

One view over the tracks written inside it: they move, zoom and turn together, by a constant or by keys on the video's clock. Tracks outside it stay fixed to the screen. A composition has one, or none.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The camera's name in the file; actions refer to it by this. |
| `x` | number \| { at, value, easing }[] \| { type, base, amount, frequency, seed } \| { type, base, speed } \| { type, keys, mode } |  |  | How far the view has moved right, in pixels: at 180 everything under the camera sits 180 px to the left. |
| `y` | number \| { at, value, easing }[] \| { type, base, amount, frequency, seed } \| { type, base, speed } \| { type, keys, mode } |  |  | How far the view has moved down, in pixels: at 100 everything under the camera sits 100 px higher. |
| `zoom` | number (0.01..100) \| { at, value, easing }[] \| { type, base, amount, frequency, seed } \| { type, base, speed } \| { type, keys, mode } |  |  | How close the view is, about the frame's centre: 1 is as written, 2 shows everything twice the size. |
| `rotation` | number \| { at, value, easing }[] \| { type, base, amount, frequency, seed } \| { type, base, speed } \| { type, keys, mode } |  |  | How far the view is turned clockwise, in degrees, about the frame's centre: what it shows turns the other way. |
| `push` | { on, keep, margin, duration, easing } |  |  | Lets the camera make room: as each element in `on` starts, the view moves as little as it can so that element is in view with everything else on the camera's tracks that is on screen then. It pans the shortest way, and pulls back only when all of it cannot fit. With `push`, `x`, `y` and `zoom` are where the view starts, as numbers; `camera/bakePush` turns the moves into keys to change by hand. |

Children: `track`. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Gap>`

Empty time between clips on a sequence track.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The gap's name. |
| `duration` | number (> 0) |  | yes | Seconds of empty time before the next element on the track. |

Timed. No children. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Transition>`

A blend between the two clips it sits between on a sequence track.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The transition's name. |
| `type` | "crossfade" \| "dipToBlack" \| "dipToWhite" \| "wipe" \| "slide" \| … 7 more \| string | `"crossfade"` |  | A built-in transition, or one the file declares with `transition()`. |
| `duration` | number (0.001..30) | `0.5` |  | Seconds it takes; it overlaps the two clips by this much. |
| `params` | object | `{}` |  | The type's own settings; each type's page lists them. |
| `on` | string |  |  | Edge form: a transition at one edge of a single clip. Omit for a transition between two siblings. |
| `edge` | "in" \| "out" |  |  | With `on`: `in` at the clip's start, `out` at its end. |

Every built-in type and its params: [Effects and transitions](https://uberscene.prefixtree.xyz/reference/effects/).

Timed, visual. No children. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Marker>`

A named point on the timeline.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The marker's name: `marker:<id>` refers to it as a time. |
| `start` | number (0..∞) |  | yes | Seconds from the start of the video. |
| `label` | string | `""` |  | Text shown on the editor's ruler. |
| `color` | string |  |  | Its colour on the ruler. |

No children. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Layer>`

Free code in the frame: any React, CSS, canvas or WebGL, placed on the timeline like any overlay; `useT()` is its time.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot, silence or beat of the anchor's source (`word:14655`, `beat:16`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until, at } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends, or `{ until: id, at: "word:54.end" }` when it plays that word, shot, silence or beat of its source. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `box` | { x, y, width, height, origin } |  |  | The rectangle it occupies, in pixels from the frame's top left as in CSS: `x` and `y` place the point `origin` names (its top left by default), `width` and `height` size it, and its content fills it as `fit` says. Left out, the whole frame. `transform` applies after. |
| `transform` | { scale, rotation, anchor, opacity, borderRadius, crop } |  |  | How it is turned and shown: scale, rotation, anchor, opacity, rounded corners and crop. |
| `parent` | string |  |  | Another overlay's id: this one moves with it. Its `box` is then read in the parent's box (pixels from the parent box's top left, centred in it when `x` or `y` is left out), and the parent's transform and entrance carry it, up the chain. Its opacity, crop and corners stay its own. |
| `effects` | { type, enabled }[] |  |  | Effects drawn on it, in order: each `{ type, ...params }`, a param written as keys to animate it. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How the layer mixes with what is under it, as CSS `mix-blend-mode` does. Only `normal` renders ([What renders](https://uberscene.prefixtree.xyz/reference/rendering)). |
| `ground` | boolean |  |  | A ground that other things sit on: a card under a cut-out speaker, a wall behind a game, a scrim that darkens footage under a title. The layout check treats it like a background: it is not held to the safe zone and is not said to cover the captions. |

Timed, visual, transformable. No children. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Three>`

A three.js scene on the timeline: plain three.js in `setup`, or React Three Fiber children, on the video's clock.

The player draws it once the host calls `installFreeCodeLibraries()` ([Free code](https://uberscene.prefixtree.xyz/guide/free-code#three-js-and-motion)); the export draws it the same way, in headless Chrome ([Exporting](https://uberscene.prefixtree.xyz/guide/exporting)).

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot, silence or beat of the anchor's source (`word:14655`, `beat:16`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until, at } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends, or `{ until: id, at: "word:54.end" }` when it plays that word, shot, silence or beat of its source. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `box` | { x, y, width, height, origin } |  |  | The rectangle it occupies, in pixels from the frame's top left as in CSS: `x` and `y` place the point `origin` names (its top left by default), `width` and `height` size it, and its content fills it as `fit` says. Left out, the whole frame. `transform` applies after. |
| `transform` | { scale, rotation, anchor, opacity, borderRadius, crop } |  |  | How it is turned and shown: scale, rotation, anchor, opacity, rounded corners and crop. |
| `parent` | string |  |  | Another overlay's id: this one moves with it. Its `box` is then read in the parent's box (pixels from the parent box's top left, centred in it when `x` or `y` is left out), and the parent's transform and entrance carry it, up the chain. Its opacity, crop and corners stay its own. |
| `effects` | { type, enabled }[] |  |  | Effects drawn on it, in order: each `{ type, ...params }`, a param written as keys to animate it. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How the layer mixes with what is under it, as CSS `mix-blend-mode` does. Only `normal` renders ([What renders](https://uberscene.prefixtree.xyz/reference/rendering)). |
| `ground` | boolean |  |  | A ground that other things sit on: a card under a cut-out speaker, a wall behind a game, a scrim that darkens footage under a title. The layout check treats it like a background: it is not held to the safe zone and is not said to cover the captions. |
| `camera` | { position, lookAt, fov, near, far, zoom, orthographic } |  |  | The camera: `position` and `lookAt` as `[x, y, z]`, `fov` in degrees, clipping planes, zoom, or orthographic. |
| `background` | string |  |  | The scene's background colour; left out, transparent over what is beneath. |
| `setup` | any |  |  | Builds the scene once from `{ scene, camera, renderer, THREE, width, height }`, and may return `update(frame)` for every frame. |

Timed, visual, transformable. No children. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Motion>`

Children animated by a Motion `sequence` on the video's clock.

The player draws it once the host calls `installFreeCodeLibraries()` ([Free code](https://uberscene.prefixtree.xyz/guide/free-code#three-js-and-motion)); the export draws it the same way, in headless Chrome ([Exporting](https://uberscene.prefixtree.xyz/guide/exporting)).

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot, silence or beat of the anchor's source (`word:14655`, `beat:16`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until, at } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends, or `{ until: id, at: "word:54.end" }` when it plays that word, shot, silence or beat of its source. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `box` | { x, y, width, height, origin } |  |  | The rectangle it occupies, in pixels from the frame's top left as in CSS: `x` and `y` place the point `origin` names (its top left by default), `width` and `height` size it, and its content fills it as `fit` says. Left out, the whole frame. `transform` applies after. |
| `transform` | { scale, rotation, anchor, opacity, borderRadius, crop } |  |  | How it is turned and shown: scale, rotation, anchor, opacity, rounded corners and crop. |
| `parent` | string |  |  | Another overlay's id: this one moves with it. Its `box` is then read in the parent's box (pixels from the parent box's top left, centred in it when `x` or `y` is left out), and the parent's transform and entrance carry it, up the chain. Its opacity, crop and corners stay its own. |
| `effects` | { type, enabled }[] |  |  | Effects drawn on it, in order: each `{ type, ...params }`, a param written as keys to animate it. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How the layer mixes with what is under it, as CSS `mix-blend-mode` does. Only `normal` renders ([What renders](https://uberscene.prefixtree.xyz/reference/rendering)). |
| `ground` | boolean |  |  | A ground that other things sit on: a card under a cut-out speaker, a wall behind a game, a scrim that darkens footage under a title. The layout check treats it like a background: it is not held to the safe zone and is not said to cover the captions. |
| `sequence` | [string, object] \| [string, object, object][] | `[]` |  | Motion steps: `[selector, keyframes, options]`, where `at` in the options is seconds into the layer. |

Timed, visual, transformable. No children. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Title>`

Text over the picture in the theme's type, with entrances by letter or by word.

### Props

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
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. Only `normal` renders ([What renders](https://uberscene.prefixtree.xyz/reference/rendering)). |
| `effects` | { type, enabled }[] |  |  | Effects drawn on it, in order: each `{ type, ...params }`, a param written as keys to animate it. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `style` | string \| { preset, font, size, weight, italic, color, background, stroke, shadow, align, valign, lineHeight, letterSpacing, decoration } | `{}` |  | How the letters look: a theme title preset by name (`"h1"`), or an object of `font`, `size`, `weight`, `italic`, `color`, `background`, `stroke`, `shadow`, `align`, `valign`, `lineHeight`, `letterSpacing` and `decoration`, with `preset` naming the preset it starts from. Without a preset, the theme's `default` title preset applies. The text box is the title's `box`: its `width` and `height`, the whole frame when left out, so background, align and valign work inside it. |
| `animation` | { type, in, out, stagger } |  |  | An entrance and exit: its type, its seconds in and out, and for wordByWord the delay between words. |

#### `style`

A theme preset's name, or an object of these fields. `preset` names the preset the object starts from; the fields written beside it win.

| field | type | default | description |
|---|---|---|---|
| `preset` | string |  | A theme title preset this look starts from; the fields written beside it win. |
| `font` | string | `"Inter"` | The font family: a bundled one, one the file declares, or one from the font catalogue. A theme preset may set it instead. |
| `size` | number (1..1000) | `48` | The letters' size, in pixels. |
| `weight` | integer (100..900) \| "normal" \| "bold" | `"bold"` | How heavy the letters are: 100 to 900, or `normal` and `bold`. |
| `italic` | boolean | `false` | Slanted letters. |
| `color` | string | `"#ffffff"` | The letters' colour, or a theme token such as `$text`. |
| `background` | string |  | A colour filling the text box behind the letters. |
| `stroke` | { color, thickness } |  | An outline around the letters: its colour and thickness in pixels. |
| `shadow` | { color, blur, x, y } |  | A drop shadow under the letters: colour, blur and offset in pixels. |
| `align` | "left" \| "center" \| "right" \| "justify" | `"center"` | Which side of the text box the lines sit against. |
| `valign` | "top" \| "middle" \| "bottom" | `"middle"` | Where in the text box's height the text sits. |
| `lineHeight` | number (0.1..10) | `1.2` | The distance between lines, as a multiple of the letters' size. |
| `letterSpacing` | number (-100..100) | `0` | Extra space between letters, in pixels. |
| `decoration` | "none" \| "underline" \| "lineThrough" \| "overline" |  | A line under, over or through the letters. |

#### Coloured words: `<Mark>`

Words inside a title drawn their own way, as part of its text:

```tsx
<Title id="q" style={{ color: "$text" }}>into the <Mark color="$accent">stars</Mark></Title>
```

| prop | type | description |
|---|---|---|
| `color` | string | The words' colour: a colour, or a theme token such as `"$accent"`. |
| `weight` | number, `"normal"` or `"bold"` | Their weight. |
| `italic` | boolean | Set them in italics. |
| `background` | string | A colour behind them: a highlight. |

A `<Mark>` has no id and no time of its own, and holds text only (marks do not nest). Typewriter and word-by-word animations count its words with the rest. Editing the title's text keeps a mark on its words while they are still there.

Timed, visual, transformable. Children: `mask`. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Captions>`

Subtitles from an asset's transcript that follow the clips through every trim.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The captions' name. |
| `src` | string |  |  | Generate children from the asset's transcript. Literal `<Caption>` children override this. |
| `style` | string \| { preset, font, size, weight, color, background, shadow, stroke, highlight, highlightBox, upcoming, align } |  |  | How the words look: the name of a theme captions preset, or an object of its fields, with `preset` naming the one it starts from. |
| `animation` | "none" \| "wordHighlight" \| "wordByWord" \| "karaoke" \| "typewriter" | `"none"` |  | How the words appear: all at once, the word being said highlighted, word by word, karaoke or typewriter. |
| `box` | { x, y, width, height, origin } |  |  | The rectangle the caption block sits in, from the frame's top left as on any element. Left out, the lower safe area: centred, as wide as the frame less a margin at each side, its bottom a margin above the frame's bottom (`origin: "bottom"`). Each field written replaces that one of the default, so a box with only `y: 1150` and `origin: "center"` puts the block's middle at 1150 and keeps the default width. Without a `height`, the block is as tall as its lines. |
| `maxChars` | integer (> 0) |  |  | The most characters on a generated cue's line. Left out: as many as fit at the caption size on this frame (at most 42). |
| `maxDuration` | number (> 0) | `5` |  | The longest a generated cue may stay on screen, in seconds. |
| `maxGap` | number (0..∞) | `0.8` |  | A pause longer than this, in seconds, starts a new cue. |
| `breakAfter` | string[] |  |  | Words a generated cue always ends after, as `word:N` refs on `src`: `breakAfter={["word:5", "word:12"]}`. |

#### `style`

A theme preset's name, or an object of these fields. `preset` names the preset the object starts from; the fields written beside it win.

| field | type | default | description |
|---|---|---|---|
| `preset` | string |  | A theme captions preset this style starts from; the fields written beside it win. |
| `font` | string |  | The font family, as a title's. Left out: Inter. |
| `size` | number (1..1000) |  | The letters' size, in pixels. Left out: a 24th of the frame's height. |
| `weight` | integer (100..900) \| "normal" \| "bold" |  | How heavy the letters are: 100 to 900, or `normal` and `bold`. Left out: 800. |
| `color` | string |  | The letters' colour, or a theme token. Left out: white. |
| `background` | string |  | A colour behind each cue. |
| `shadow` | { color, blur, x, y } |  | A drop shadow under the letters. Left out: a dark halo that reads on light and dark footage. |
| `stroke` | { color, thickness } |  | An outline around the letters, drawn under them: its colour and thickness in pixels. |
| `highlight` | string |  | The colour of the word being said, for the word animations. |
| `highlightBox` | string |  | A filled, rounded box behind the word being said. `highlight` stays the colour of its letters. |
| `upcoming` | string |  | The colour of the words not yet said. |
| `align` | "left" \| "center" \| "right" \| "justify" |  | Which side of the box's width the lines sit against. Left out: `center`. |

Visual. Children: `caption`. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Caption>`

One cue inside `<Captions>`, written by hand: its text, start and end.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The cue's name. |
| `start` | number (0..∞) \| string |  | yes | When it appears: seconds, or a word of the captions' source (`word:12`). |
| `end` | number (0..∞) \| string |  | yes | When it goes, as `start`. |
| `text` | string |  | yes | What it says. |
| `words` | { text, start, end }[] |  |  | Each word and its time in the video, in seconds, which the word animations highlight; left out, the cue shows as plain text. |

Timed, visual. No children. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Shape>`

A vector shape (rectangle, circle, star, polygon, path) with fill, stroke and shadow.

### Props

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
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. Only `normal` renders ([What renders](https://uberscene.prefixtree.xyz/reference/rendering)). |
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

Timed, visual, transformable. Children: `mask`. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Svg>`

One-off vector art from inline SVG markup or a file.

### Props

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
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. Only `normal` renders ([What renders](https://uberscene.prefixtree.xyz/reference/rendering)). |
| `effects` | { type, enabled }[] |  |  | Effects drawn on it, in order: each `{ type, ...params }`, a param written as keys to animate it. |
| `ground` | boolean |  |  | A ground that other things sit on: a card under a cut-out speaker, a wall behind a game, a scrim that darkens footage under a title. The layout check treats it like a background: it is not held to the safe zone and is not said to cover the captions. |
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  | How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. |
| `style` | string |  |  | A theme preset for svg elements. |
| `src` | string |  |  | An SVG file from the manifest, as `asset:<id>`. Give this or `content`. |
| `content` | string |  |  | Inline SVG markup. Give this or `src`. |
| `viewBox` | { minX, minY, width, height } |  |  | The part of the drawing to show, in its own units, as the SVG `viewBox` attribute. |
| `preserveAspectRatio` | string |  |  | How the drawing fits its box, as the SVG attribute of that name (`xMidYMid meet`). |
| `color` | { type, tint, opacity } |  |  | Recolours it: `tint` keeps the shading and colours it, `replace` paints every drawn pixel; `opacity` is how much. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |

Timed, visual, transformable. Children: `mask`. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Sticker>`

A ready-made icon or sticker by name.

### Props

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
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. Only `normal` renders ([What renders](https://uberscene.prefixtree.xyz/reference/rendering)). |
| `effects` | { type, enabled }[] |  |  | Effects drawn on it, in order: each `{ type, ...params }`, a param written as keys to animate it. |
| `ground` | boolean |  |  | A ground that other things sit on: a card under a cut-out speaker, a wall behind a game, a scrim that darkens footage under a title. The layout check treats it like a background: it is not held to the safe zone and is not said to cover the captions. |
| `enter` | { type, duration, easing } |  |  | How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. |
| `exit` | { type, duration, easing } |  |  | How it goes out, over its last seconds, as `enter`. |
| `style` | string |  |  | A theme preset for stickers. |
| `src` | string |  | yes | An image the manifest lists (`asset:party`): PNG, SVG, WebP or GIF. |

Timed, visual, transformable. Children: `mask`. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Adjustment>`

Filters everything beneath it, through its `effects`, for its own stretch of time.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot, silence or beat of the anchor's source (`word:14655`, `beat:16`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until, at } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends, or `{ until: id, at: "word:54.end" }` when it plays that word, shot, silence or beat of its source. |
| `effects` | { type, enabled }[] |  |  | Effects drawn on it, in order: each `{ type, ...params }`, a param written as keys to animate it. |
| `opacity` | number (0..1) | `1` |  | How much of its effects to mix over the picture beneath. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more | `"normal"` |  | How the filtered picture mixes with the one beneath, as CSS `mix-blend-mode` does. |
| `enabled` | boolean | `true` |  | Off, it filters nothing and stays in the file. |

Timed, visual. No children. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Mask>`

Shows only a shape of its clip, with a feathered edge or inverted.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The mask's name. |
| `type` | "shape" \| "drawn" | `"shape"` |  | `shape` for a rectangle, ellipse or polygon; `drawn` for a bezier `path`. |
| `shape` | { rect } \| { ellipse } \| { polygon } |  |  | The region it shows: `{ rect }`, `{ ellipse }` or `{ polygon }`, in the clip's pixels. |
| `path` | { points, closed } |  |  | A drawn mask's outline: bezier points with handles, closed or open. |
| `feather` | number (0..100) | `0` |  | Softens the mask's edge, in pixels. |
| `inverted` | boolean | `false` |  | Shows everything outside the region instead of inside. |
| `opacity` | number (0..1) | `1` |  | How much the mask hides: 1 hides fully outside the region, 0 not at all. |

No children. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Nested>`

A sequence written once as a component and placed like a clip.

### Props

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
| `fit` | "contain" \| "cover" \| "stretch" \| "none" |  |  | How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. |
| `blend` | "normal" \| "multiply" \| "screen" \| "overlay" \| "darken" \| … 13 more |  |  | How it mixes with what is under it, as CSS `mix-blend-mode` does. |
| `effects` | { type, enabled }[] |  |  | Effects drawn on it, in order: each `{ type, ...params }`, a param written as keys to animate it. |
| `blendOpacity` | number (0..1) |  |  | How strongly it blends: multiplied into its opacity. |
| `of` | any \| string |  | yes | A pure helper component returning tracks, or a file reference. Validated at collect time. |
| `in` | number (0..∞) \| string |  |  | Where in the nested sequence it starts, in its own seconds. |
| `out` | number (0..∞) \| string |  |  | Where in the nested sequence it ends, as `in`. |
| `volume` | number (0..4) \| { at, value, easing }[] |  |  | A gain on all its sound: 1 as it is, 0 muted; keys change it over time. |

Timed, visual, audible, trims its source, transformable. Children: `mask`. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Multicam>`

Several camera angles of one take; `<Cut>`s pick which one shows.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The group's name. |
| `name` | string |  |  | A label for the editor. |
| `sync` | number (0..∞) | `0` |  | Timeline time at which every angle is aligned (plus each angle's own offset). |

Children: `angle`, `cut`. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Angle>`

One camera of a `<Multicam>`: its asset and sync offset.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The angle's name: `<Cut angle>` picks it by this. |
| `src` | string |  | yes | The camera's footage, as `asset:<id>`. |
| `offset` | number | `0` |  | Source-time offset that aligns this angle with the sync point. |
| `color` | string |  |  | Its colour in the editor. |
| `name` | string |  |  | A label for the editor. |

No children. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Cut>`

Switches a `<Multicam>` to an angle at a moment.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The cut's name. |
| `at` | number (0..∞) |  | yes | Seconds into the multicam where it switches. |
| `angle` | string |  | yes | The angle it switches to. |

No children. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)

## `<Audio>`

A stretch of a sound asset: volume and pan (constant or keys), fades, ducking under another track.

### Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. |
| `start` | number (0..∞) |  |  | Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. |
| `anchor` | "start" \| string |  |  | Overlays: start relative to another element's start, or to its end with `id.end`. |
| `at` | string |  |  | With `anchor`: a word, shot, silence or beat of the anchor's source (`word:14655`, `beat:16`); the start is where the anchor plays it, plus `offset`. |
| `offset` | number |  |  | Seconds added to the start that `anchor` and `at` give; negative starts earlier. |
| `duration` | number (> 0) \| "fill" \| "source" \| { match } \| { until, at } |  |  | How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends, or `{ until: id, at: "word:54.end" }` when it plays that word, shot, silence or beat of its source. |
| `src` | string |  | yes | The media, as `asset:<id>` from the manifest. |
| `in` | number (0..∞) \| string |  |  | Where in the source it starts: seconds, or a word, shot, silence or beat of the source (`word:12`, `beat:16`). |
| `out` | number (0..∞) \| string |  |  | Where in the source it ends, as `in`; `word:40.end` ends after the word is said. |
| `speed` | number (0.1..20) \| { at, value, easing }[] |  |  | Playback rate: 2 plays twice as fast and half as long; keys ramp it. |
| `freezes` | { start, duration, source }[] |  |  | Frames held on screen while the clip's time stands still. |
| `reverse` | boolean | `false` |  | Plays the trimmed source backwards. |
| `volume` | number (0..4) \| { at, value, easing }[] |  |  | A gain: 1 plays the source as it is, 0 mutes it, 2 is twice as loud; keys change it over time. |
| `pan` | number (-1..1) \| { at, value, easing }[] |  |  | Where it sits between the speakers, from -1 (left) to 1 (right); keys move it. |
| `fade` | { in, out } |  |  | Seconds the sound fades in at the start and out at the end. |
| `duck` | { under, to, attack, release } |  |  | Turns this sound down while another plays: `under` is a track id or a track role (`dialogue`), `to` the volume it falls to, `attack` and `release` the seconds it takes to fall and recover. |

Timed, audible, trims its source. No children. [All elements](https://uberscene.prefixtree.xyz/reference/elements/)
