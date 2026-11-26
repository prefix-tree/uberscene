# The camera

Some moves belong to the whole picture: a card comes in and everything else slides aside to make room, or the frame
pulls back to show what was beside it. Writing that on each element means the same keys copied onto every one, and
kept in step by hand. A `<Camera>` writes it once.

<Example src="previews/elements/camera" alt="A shot of an espresso machine on a blue ground; a white card pops in on the left and the picture slides right to make room, then a second card pops in on the right and the picture pulls back to hold all three, while a line of text at the top stays where it is">

<<< @/../examples/showcase/docs/camera.tsx

</Example>

## What it moves

A camera is a parent: it moves the tracks written inside it, and nothing else.

```tsx
<Composition fps={30} width={1920} height={1080}>
  <Camera id="cam" zoom={1.1}>
    <Track id="speaker">...</Track>
    <Track id="cards" layout="free">...</Track>
  </Camera>
  <Track id="logo" layout="free">...</Track>
</Composition>
```

- Everything on `speaker` and `cards` moves, zooms and turns together: footage, titles, shapes, layers, nested
  sequences.
- `logo` is outside, so it stays fixed to the screen. Captions and the composition's background stay too.
- Tracks still draw in the order the file writes them, across the camera's edge. A track under the camera's tracks
  is under them; one written after is over them.
- Each element keeps its own place, entrance and keys. The camera goes on top of those, so an element that slides in
  slides in under a moving camera as it would under a still one.
- A file without a camera draws as it always did. A composition has one camera, and it holds `<Track>`s only.

Clips written straight in the composition are its main track, and stay outside. To move them, write them in
`<Track id="main">` inside the camera.

## Its four values

| Prop | What it does |
|---|---|
| `x` | How far the view has moved right, in pixels. At `180`, everything under the camera sits 180 px to the left. |
| `y` | How far the view has moved down. At `100`, everything sits 100 px higher. |
| `zoom` | How close the view is, about the frame's centre. `1` is as written, `2` shows everything twice the size. |
| `rotation` | How far the view is turned clockwise, in degrees. What it shows turns the other way. |

These are a camera's numbers, not an element's: moving the view right moves the picture left. The point at
`(width / 2 + x, height / 2 + y)` is what sits in the middle of the frame, whatever the zoom.

Each value is a number, or a list of keys when it changes. A key's `at` is seconds from the start of the video, since
a camera has no start of its own. `easing` says how the value leaves that key, as on any [key](./animation#keys).

```tsx
<Camera id="cam"
  x={[
    { at: 1, value: 0, easing: "snappy" },
    { at: 1.3, value: -110 },
    { at: 2.2, value: -110, easing: "snappy" },
    { at: 2.5, value: 110 },
  ]}
  zoom={[{ at: 0, value: 1 }, { at: 6, value: 1.06 }]}>
```

The view holds until 1 s, snaps 110 px left as the first card lands, holds, then snaps to the right for the second.
Under it the zoom closes in slowly for the whole six seconds, so the frame is never still.

An element written off the frame is not lost: a camera that pans or pulls back far enough shows it.

## Let the camera make room

Working out each pan and zoom by hand means redoing them whenever a card moves. With `push`, the camera does it:

```tsx
<Camera id="cam" push={{ on: ["card-a", "card-b", "card-c"] }}>
  <Track id="subject" layout="free">...</Track>
  <Track id="cards" layout="free">...</Track>
</Camera>
```

Write each card where it belongs beside the subject, partly or wholly outside the frame. As each element in `on`
starts, the view moves **as little as it can** to hold it with everything else on the camera's tracks that is on
screen then:

- If the element is already in view, nothing moves.
- Else the view pans the shortest way that brings everything inside the margin.
- Only when everything cannot fit does it pull back, and only as far as it must. It never closes in past the
  camera's own `zoom`.

Move a card and the camera's move follows, because the moves are worked out from the file each time it is read.

| In `push` | What it does |
|---|---|
| `on` | The elements to make room for, on the camera's tracks. Ones that start together are one move. |
| `keep` | The only elements that must stay in view, with those in `on`: a speaker, say. Left out, everything on screen under the camera stays in view. |
| `margin` | How far inside the frame's edge everything sits, in pixels. Left out, a twentieth of the frame's shorter side. |
| `duration` | How long each move takes, from the moment its element starts. 0.3 s when left out. |
| `easing` | How each move goes. `snappy` when left out. |

With `push`, the camera's `x`, `y` and `zoom` are numbers: where the view starts. Keys on them beside a push are an
error, since two things cannot both set them. `rotation` is free.

The camera makes room for an element's box: a shape's `width` and `height`, footage as it is fitted into its `box`,
a title or layer's `box.width` and `box.height`. A title with no size in its `box` counts as the point it is placed
at, so give it a `box.width` and `box.height` if the camera should make room for all of it. An element's own keys,
scale and rotation are not followed: it counts where it stands when it starts. `--check-layout` still measures the
real picture, so anything left cut off is reported.

To change the moves by hand, turn them into keys: `camera/bakePush` writes them as key lists on `x`, `y` and `zoom`
and removes the push. From then on they are the file's, and no longer follow the cards. In the editor, select the
camera and choose "Turn its moves into keys".

## What stays in screen pixels

A zoom scales where things are and how big they are. It does not scale an effect's own pixel sizes: a `blur` of 12
is 12 px on screen at any zoom, and so are a cut-out's `shrink` and `feather`, a mask's feather and the grain. An
adjustment on a track inside the camera still grades the whole frame beneath it.

## Checking and editing

- `--check-layout` measures what is drawn, so it sees a title the camera has pushed past the safe zone. Its fix is
  in the element's own numbers: under a zoom of 2, a title 40 px too far right is told to move its `box.x` by 20.
- `uberscene inspect` gives the camera's four values at each moment, and marks the elements under it. Their `box`
  and `transform` are as written, before the camera.
- `camera/setPush` gives a camera a push or takes it away, and `camera/bakePush` turns it into keys.
- An editor changes the camera with `camera/update` and its keys with `key/add` and the other
  [key actions](/reference/actions), using the paths `x`, `y`, `zoom` and `rotation`.
- `camera/add` puts a camera around tracks that are next to each other, and `camera/remove` takes it away. Either way
  the tracks keep their place in the stack.
- `track/reorder` and `track/add` count a camera's tracks in the camera's place. A track moved above one of the
  camera's joins it, and one moved away leaves; at the camera's edge, `camera: true` or `false` decides.

## Camera or a move on the clip

The [motion catalog](/reference/motion/)'s push-ins scale one clip. Use those when one shot moves. Use a camera when
several things must move as one, or when something outside the move must stay put.

Motion blur in the export (`motionBlur` on the composition) blurs a camera move as it blurs any other.
