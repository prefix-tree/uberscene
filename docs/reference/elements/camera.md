---
editLink: false
---

# `<Camera>`

One view over the tracks written inside it: they move, zoom and turn together, by a constant or by keys on the video's clock. Tracks outside it stay fixed to the screen. A composition has one, or none.

<Example src="previews/elements/camera" alt="<Camera>">

<<< @/../examples/showcase/docs/camera.tsx

</Example>

The coffee footage is Pixabay videos [209419](https://pixabay.com/videos/id-209419/), [209424](https://pixabay.com/videos/id-209424/), [46989](https://pixabay.com/videos/id-46989/) and [251](https://pixabay.com/videos/id-251/), under the Pixabay Content License. The maker of the machine in the red cup shot has nothing to do with this project.

## Props

| prop | type | default | required | description |
|---|---|---|---|---|
| `id` | string |  | yes | The camera's name in the file; actions refer to it by this. |
| `x` | number \| { at, value, easing }[] |  |  | How far the view has moved right, in pixels: at 180 everything under the camera sits 180 px to the left. |
| `y` | number \| { at, value, easing }[] |  |  | How far the view has moved down, in pixels: at 100 everything under the camera sits 100 px higher. |
| `zoom` | number (0.01..100) \| { at, value, easing }[] |  |  | How close the view is, about the frame's centre: 1 is as written, 2 shows everything twice the size. |
| `rotation` | number \| { at, value, easing }[] |  |  | How far the view is turned clockwise, in degrees, about the frame's centre: what it shows turns the other way. |
| `push` | { on, keep, margin, duration, easing } |  |  | Lets the camera make room: as each element in `on` starts, the view moves as little as it can so that element is in view with everything else on the camera's tracks that is on screen then. It pans the shortest way, and pulls back only when all of it cannot fit. With `push`, `x`, `y` and `zoom` are where the view starts, as numbers; `camera/bakePush` turns the moves into keys to change by hand. |

Children: `track`. [All elements](/reference/elements/)
