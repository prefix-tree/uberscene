# 0039. A scene file is footage: computed frames through the clip's frame source

> Status: proposed, with a working prototype (`examples/3d/crossing-clip.tsx`). Builds on
> [0037](./0037-a-3d-shot-on-the-timeline.md): the same shot module, played a second way.

## Context

0037 puts a 3D shot on the timeline as a `<Three shot>` layer: the module builds the scene, the tag stages it. That
suits a shot someone stages in the editor. It does not suit a 3D element that a model writes whole and the edit then
cuts like any other footage: trimmed, slowed down, reversed, frozen, faded into the next shot, graded. A `<Three>`
layer gets none of that, since speed, reverse, freezes and transitions belong to clips. 0037 lists "speed other than
1, and reverse" as not decided.

Footage already has the shape a computed scene needs. The player reads every clip through a `FrameSource` that
answers one question, "the frame at this source time", and does not care how the frame is made.

## Decision

### 1. A scene file is an asset of kind `scene`

A standalone `.js` file whose default export is a shot (`defineShot`, or the same plain object) is listed in the
manifest like footage:

```tsx
export const manifest = {
  assets: { crossing: { id: "crossing", kind: "scene", duration: 5, fps: 30, width: 1920, height: 1080 } },
};
<Clip id="slow" src="asset:crossing" in={1.5} out={3.2} speed={0.5} />
```

`fps`, `width` and `height` say how its frames come out; `duration` is how long it runs. The file sits in the media
folder as `crossing.js` (or `.mjs`), found like any asset.

### 2. The player plays it through a frame source that draws instead of decoding

`SceneFrameSource` (player) implements `FrameSource`. `frameAt(t)` snaps `t` to the asset's frame grid, asks the scene
engine to draw that moment, and hands the clip a copy of the picture. Draws run one at a time, since a scene is one
set of objects and one canvas. `AssetSources` picks it for kind `scene` whatever decoder the host chose, so the
browser decoder and the native one both leave scenes alone.

Everything between the clip and its frames is unchanged: trims, speed and ramps, `reverse`, freezes, transitions,
effects, `box`, `fit`, the decoder pool, the export's frame wait. The resolver treats a scene as a video without sound;
the audio plan skips it.

### 3. The engine is installed by the host, like `<Three>`'s

The kit defines `SceneEngine` (`open(source, size)`) and `SceneRenderer` (`draw(seconds)`, `close()`), and
`installSceneEngine`. The player and the kit do not depend on three.js. `@uberscene/graphics` supplies the engine:
`installSceneFiles(load)` builds the shot once on an `OffscreenCanvas` with the same renderer settings React Three
Fiber gives a `<Three>`, and draws it at each time with the same `applyShot` the tag uses. `load` is the host's
module runner: `runModule` (new in the SDK) runs a module like `loadModule` with the same imports, and returns its
exports without asking for a video.

### 4. The file stages itself

With no tag, the staging lives in the shot's `stage`: `camera`, `objects` and `inputs` in the same shape and units as
the tag's props, keys in shot time, plus `background`. Without a background the frames are transparent, so a scene on
a track above footage sits over it. On a `<Three shot>` tag the tag's props replace `stage`, so one file serves both
ways. `examples/3d/crossing.js` does.

## The two ways compared

| | `<Three shot>` (0037) | Scene asset (this record) |
|---|---|---|
| Who stages it | The tag, in the video file | The file's `stage` |
| Editor gestures | Write the tag's literals (`shot/set`, key actions) | None yet: the file is the source of truth |
| Speed, reverse, freezes, transitions, effects | No | Yes, as any clip |
| Marker-tied keys | Yes | No: keys are the scene's own seconds |
| Reuse | One tag per shot | One file, many clips, many edits |
| Cost per frame | One render in the page | One render, plus a 2D copy |

They are not rivals. A model that writes a 3D element whole writes a scene file and cuts it; a shot someone stages
against the edit's beats goes on a tag.

## Prototype

`examples/3d/crossing-clip.tsx` plays `crossing.js` three times: whole, then 1.5 s to 3.2 s at half speed, then
0.5 s to 3.2 s reversed, under a title. Checked by tests:

- **Frame source** (`packages/player/test/scene-frame-source.test.ts`): frames land on the grid (3.21 s is frame 96,
  drawn once), hold past the end, draw one at a time in order, stream to the last frame before `to`, close the scene,
  and say what to install when no engine is.
- **In Chromium** (`packages/graphics/test/browser/scene-clip.test.ts`):
  - At 3.2 s the Player draws identical pixels after playing forward, scrubbing back and jumping.
  - The half-speed clip at 6 s and the reversed clip at 9.6 s both show the scene's 2 s: the walker's centroid within
    a pixel.
  - `uberscene crossing-clip.tsx --still 3.2` matches the Player: centroid within a pixel, frame within 1/255.
  - That still matches `uberscene crossing.tsx --still 5.2`, the tag's shot time 3.2: here the two are the same
    pixels.
- **Export speed**, software WebGL at 1080p in this container: the 11.1 s clip edit exported at 7.3 fps, the 7 s tag
  edit at 9.8 fps. The difference is the copy of each frame and the clip compositor; not tuned.

## Consequences

- A model can write a 3D element as one file and cut it with everything clips already do.
- The manifest gains a kind; the kit gains the engine slot and `ShotStage`; the SDK gains `runModule`; the player
  gains a frame source; graphics gains `installSceneFiles`; the export installs it and finds `.js` media.
- A scene asset that no engine draws plays as the player's grey error frame, with the reason.

## Not decided yet

1. **`uberscene add crossing.js`.** Reading `length` from the module (three.js runs in Node without a renderer) to
   write the manifest entry. Today the entry is written by hand.
2. **Inputs per clip.** A clip could pass `inputs` to the scene (a colour, a seed) without a second file. That needs a
   frame source per clip and input set, not per asset.
3. **Editing the stage.** The editor's 0037 actions could write into a scene file's `stage` literal, as they write
   the tag's. A second write target, as 0037 warned.
4. **A frame cache.** Draws are cheap for a blockout and repeat on every scrub. A small cache keyed by frame would
   help heavy scenes.
5. **Determinism.** The scene runs without the video file's clock scope; `Math.random` in `build` is the author's to
   seed.
6. **The editor's preview.** The export installs the engine. The editor app does not depend on graphics, so it shows
   the error frame until its host installs one.
