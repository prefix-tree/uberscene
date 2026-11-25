# 0039. A 3D scene is a clip source

> Status: accepted. Supersedes the authoring shape of [0037](./0037-a-3d-shot-on-the-timeline.md): its sampling
> contract, keys in the scene's own time and keys tied to a beat of the edit stay; where a scene's data lives and
> how the timeline plays it change. [0038](./0038-generated-takes-from-the-blockout.md) is unchanged, and reads
> better on this shape: a scene and the take generated from it are both clips.

## Context

0037 put a 3D shot on the timeline as a `<Three shot>` tag. The shot's module declared its objects and inputs
(`defineShot`), and the tag held their placement as literal props (`objects`, `inputs`, `in`), so the editor could
write a drag into the video file. It worked, and its tests passed, but it taught the timeline a 3D vocabulary: a
`shot/set` action, shot paths in the key actions, a resolver pass that checked objects against declarations, and a
head trim that had to move `in` by hand, because a layer is not trimmed like footage.

Looking at the shot again from the start, it is media whose frames are computed. Everything the timeline already
does to footage (trim, slip, speed, holds, transitions, effects, masks, the export, the frame cache) is what a
3D shot needs, and none of it should be built twice.

## Decision

**A scene is one plain JavaScript file, and a clip plays it.**

```js
// crossing.scene.js
export const length = 5;
export const stage = { camera: { … }, table: { position: [0, 0, 0.6] }, walker: { position: [ …keys… ] } };
export function build({ THREE, scene }) { /* three.js, once */ return { table, walker }; }
export function sample(seconds, { objects, stage }) { /* optional: a walk cycle */ }
```

```tsx
import * as crossing from "./crossing.scene.js";
<Clip id="crossing-shot" src={crossing} start={2} times={{ reveal: "marker:reveal" }} />
```

1. **The clip treats it as footage.** The resolver gives each scene clip an asset of its own, as long as the scene,
   at the composition's size and rate, with no sound. `in`, `out`, `speed`, trims and holds are in scene seconds;
   the player's decoders and the export ask for frames by source time. The player opens the asset through a scene
   source the host installs (`installSceneSource`; `installFreeCodeLibraries` installs three.js's), so the player and
   the kit still do not depend on three.js.
2. **Staging is data in the scene file.** `stage` holds where each object stands and how it moves, as constants or
   keys, in the same key form as every prop since [0035](./0035-everything-is-a-prop.md). Objects take `position`,
   `rotation` (degrees), `scale` and `visible`; the camera takes `position`, `lookAt`, and `fov` or `lens` (full-frame
   millimetres). Any other value is the scene's own, read by its code: the walker's stride lives next to its path.
3. **The edit hands moments in by name.** A key's `at` may be a name; the clip's `times` maps it to seconds of the
   video or a marker, and the resolver turns that into scene seconds through the clip's own `in` and `speed`. Moving
   the clip, trimming its head or changing its speed keeps the beat on the beat. A name the clip does not hand in, or
   a marker the edit does not have, is an error.
4. **A frame is a function of its time.** The frame source draws the frame on the scene's grid that covers the time
   asked for, from that time alone. `sample` reads only its arguments.
5. **The viewport writes the scene file.** `editStage(text, edit)` changes one literal in `stage`: a constant, the key
   at a time (a named key found by the time the playhead shows), a key's time, or a key removed. A value written as
   code is refused with its path.
6. **What 0037 added and this removes:** `defineShot`, the `shot`, `in`, `objects` and `inputs` props of `<Three>`,
   keyed camera props on `<Three>`, the `shot/set` action and the shot paths in the key actions. None was released.
   `<Three>` is free code over the video again, as before 0037.

## Alternatives set aside

- **Keep 0037's shape.** The staging diff stays in the video file, which was its one advantage. Every other part of
  it duplicated what clips do.
- **A `scene:` asset in the manifest.** The manifest holds files the export reads; a scene is code the video file
  imports, and an import is how the file already brings in its own modules.
- **Write staging through the patch log.** The patch log edits the video file. A scene file is a second file with one
  literal in it; a function from text to text that changes that literal is smaller, and undo is the earlier text.

## Consequences

- A staging change and the edit around it diff in two files. Moving a beat is still one line, in the video file.
- A scene renders in the browser with WebGL, in the preview and the export alike; its frames are cached like other
  free code, keyed on the scene file's text.
- The scene clip has no sound, and a nested sequence that plays a scene is not supported yet.

## Evidence

The crossing example from 0037 moved to this shape and passed the same checks: the same transforms at 3.2 s after
playing forward, scrubbing back and jumping; the pose moves with the clip; a head trim keeps scene time; the beat
key follows the marker; a saved drag shows on reload; and the export's still matches the preview (the walker within a
pixel, the frame within 1/255 on average).
