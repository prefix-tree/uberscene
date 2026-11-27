---
title: Animation and camera on the same timeline
description: What shipped in UberScene's motion design this month. A camera that makes room by itself, shapes that grow and morph, elements that follow each other, motion without keys, 3D scenes that cut like footage, and people cut out of their background.
sidebar: false
outline: [2, 2]
---

# Animation and camera on the same timeline

<p class="blog-meta">November 27, 2026 · DAN</p>

Motion graphics usually live in another app. You animate there, render a flat clip, and drop it on the edit. Change
the cut and the animation is wrong, so you go back and render again.

We want the animation in the same file as the cut, tied to the same words and beats, so it moves when the edit moves.
This month a lot of it landed.

## A camera that makes room by itself

`<Camera>` is a parent. It moves, zooms and turns the tracks written inside it, and leaves everything outside fixed to
the screen ([#204](https://github.com/prefix-tree/uberscene/pull/204)). A card comes in and the picture slides aside;
the frame pulls back to show what was beside it. You write the move once, not on every element.

Then we made it work out the moves itself ([#207](https://github.com/prefix-tree/uberscene/pull/207)):

```tsx
<Camera id="cam" push={{ on: ["card-a", "card-b", "card-c"] }}>
  <Track id="subject" layout="free">...</Track>
  <Track id="cards" layout="free">...</Track>
</Camera>
```

Put each card where it belongs beside the subject, even off the frame. As each one starts, the view moves as little as
it can to hold it with everything else on screen. It pans first, and pulls back only when everything can't fit. Move a
card and the camera's moves follow. Want them by hand? `camera/bakePush`, or "Turn its moves into keys" in the editor,
writes them out as keys.

<video src="/previews/elements/camera.webm" poster="/previews/elements/camera.jpg" controls muted playsinline style="width:100%;border-radius:8px"></video>

## Shapes that grow, recolour, draw on and morph

A `<Shape>` now takes keys on its own values: `width`, `height`, `fill`, `points`, `stroke.color`,
`stroke.thickness` and `stroke.dashOffset` ([#246](https://github.com/prefix-tree/uberscene/pull/246)).

```tsx
<Shape id="dot" type="circle" width={[{ at: 0, value: 60 }, { at: 1.6, value: 180 }]}
  fill={[{ at: 0, value: "$primary" }, { at: 1.6, value: "#7b5cff" }]} />
```

Colours blend in a perceptual space, so red to blue passes through a clean purple, not mud. Key `dashOffset` from the
line's length to 0 and the line draws itself on. Key `points` and the shape morphs point by point.

## One element follows another

A hand moves with its forearm, the forearm with the arm. Copy keys from one to the next and they drift apart the first
time one changes. Now an overlay can `follow` another
([#247](https://github.com/prefix-tree/uberscene/pull/247)):

```tsx
<Shape id="arm" type="rectangle" start={0} duration={4} width={36} height={170} fill="#e8a33d"
  box={{ x: 480, y: 110, origin: "top" }} transform={{ rotation: 20 }} />
<Shape id="hand" follow="arm" type="ellipse" start={0} duration={4} width={56} height={56} fill="#ffffff"
  box={{ x: 18, y: 170, origin: "center" }} />
```

The hand's box is read inside the arm's. It takes the arm's place, rotation, scale and entrance, and keeps its own
opacity and timing. A card that slides in brings its label with it. A `follow` that points nowhere is an error with
the id in it.

## Motion without keys

Some movement isn't a move from here to there: a card that's never quite still, a frame that slowly closes in. Keys for
that are busywork. A value can now be a generator: `wiggle`, `drift` or `loop`
([#212](https://github.com/prefix-tree/uberscene/pull/212)).

```tsx
transform={{ rotation: { type: "wiggle", amount: 2 } }}
transform={{ scale: { type: "drift", base: 0.8, speed: 0.06 } }}
```

A generator is worked out from the time alone, so the preview, a scrub back and the export draw the same frame. It
also goes on top of a pushed camera: a `drift` on `zoom` closes in slowly while the camera still makes room.

## Coloured words inside a title

One word in another colour used to mean two titles lined up by hand. Now it's a `<Mark>`
([#242](https://github.com/prefix-tree/uberscene/pull/242)):

```tsx
<Title id="quote" start={0} duration={3} style={{ preset: "quote", color: "$text" }}>
  wouldn't it be <Mark color="$accent">amazing</Mark>
</Title>
```

The words wrap together, type in together, and the mark stays on its words when the text is edited.

## 3D scenes that cut like footage

A 3D shot should behave like footage: trimmed, cut on a beat, put under titles. Now it does. A scene file is plain
JavaScript with three exports (`length`, a `stage` of plain data, and a `build` function of ordinary three.js), and a
`<Clip>` plays it ([#188](https://github.com/prefix-tree/uberscene/pull/188),
[#195](https://github.com/prefix-tree/uberscene/pull/195)):

```tsx
import * as crossing from "./crossing.scene.js";

<Marker id="reveal" start={4} />
<Clip id="crossing-shot" src={crossing} start={2} times={{ reveal: "marker:reveal" }} />
```

The clip's `in`, `out`, speed and trims are in the scene's own seconds. Named times let a key in the scene land on a
marker or a beat in the edit, wherever either moves. Every frame is drawn from its time alone, so scrubbing back and the
export match. `editStage` writes one value back into the scene file and leaves the rest of it alone.

## People cut out of their background

`cutout` on a clip draws the person and drops the rest, so a card or a graphic can sit behind the speaker
([#199](https://github.com/prefix-tree/uberscene/pull/199)). `uberscene matte talk.mp4` makes the matte it reads, with
a model that runs in headless Chrome ([#244](https://github.com/prefix-tree/uberscene/pull/244)):

```tsx
<Clip id="talk-cut" src="asset:talk" start={0} in="word:12" out="word:30.end" cutout
  effects={[{ type: "grayscale" }, { type: "contrast", amount: 0.2 }]} />
```

The matte follows the clip through every trim, speed change and crop. The cut happens before the effects, so a
black-and-white grade changes the person, not what shows through.

## Why this matters

Every one of these is a prop on an element in the file. There's no second app and no rendered clip to keep in sync.
An agent changes a camera move the way it changes a cut: it edits a line and the checks tell it what broke. The
[layout check](./the-video-checks-itself) measures the real picture under a moving camera too, so a card left cut off
gets reported.

Next post: [exact time, and why a cut never lands a frame off](./exact-time).

[The camera](/guide/camera) · [Keys, effects and speed](/guide/animation) · [Free code](/guide/free-code) ·
[Code on GitHub](https://github.com/prefix-tree/uberscene)
