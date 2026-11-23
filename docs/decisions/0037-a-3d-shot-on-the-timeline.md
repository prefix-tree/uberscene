# 0037. A 3D shot on the timeline: code builds it, the tag stages it

> Status: proposed, with a working prototype (`examples/3d`). Takes up the 3D proposal that was 0030 (removed with
> the early records) on the terms of [0035](./0035-everything-is-a-prop.md): what can change is a prop, keys are
> values.

## Context

An edit often needs a picture that does not exist yet. A five second slot wants a person crossing behind a table
while the camera slides sideways, and the person should come out on a cut or a beat of the music. A rough 3D blockout
lets a person or an agent check the framing, the motion and what hides what while the shot is still cheap to change.
Later the same blockout can guide a video generator.

The project should keep the staging decisions. Someone who opens it should see how the shot was staged, and should be
able to move the reveal earlier without rebuilding the scene or writing a new prompt that describes everything again.

`<Three>` already puts a three.js scene on the video's clock (`ThreeScene` advances React Three Fiber to the layer's
time, and `setup` returns an `update(frame)`). But everything inside the scene is free code, so the editor cannot
move the table, an agent cannot see that the walker is behind it, and moving the shot or the beat means editing code.

## Decision

### 1. UberScene owns time; three.js owns the objects

The scene is built once, by plain JavaScript. Before each frame the host asks it to be at one moment of **shot time**:

- `shot time = in + (edit time - start)`, at speed 1, held at the shot's `length` once past it.
- A shot placed at 12 s shows its 3.2 s at 15.2 s of the edit. Move it to 20 s and that pose is at 23.2 s.
- `in` is where in its own time the layer starts, as a clip's `in` is in its footage. Trimming the head moves `start`
  and `in` together (the trim actions do this), so no pose moves in the edit; trimming the tail changes `duration`
  only.
- Everything is set from the time and the tag's props, never stepped from the frame before. Playing forward, scrubbing
  back and jumping straight to a moment give the same transforms. A three.js animation clip plays by
  `AnimationMixer.setTime`, never by adding up deltas.

### 2. The module builds; the tag stages

A shot is two things, each in the place that suits it:

```js
// crossing.js: plain JavaScript, imported by the video file. It says what exists and builds it.
import { defineShot } from "@uberscene/kit";

export default defineShot({
  objects: { table: {}, flat: {}, walker: {} },
  inputs: { stride: 1.4, swing: 28 },
  length: 5,
  build({ THREE, scene }) {
    // ...boxes for the table and the flat, a proxy rig and a walk clip for the walker...
    return {
      objects: { table, flat, walker },
      sample(_seconds, { inputs }) {
        // The walk follows the distance walked, so it needs no clock of its own.
        const cycle = walker.position.x / inputs.stride;
        mixer.setTime(cycle - Math.floor(cycle));
      },
    };
  },
});
```

```tsx
// crossing.tsx: the edit. Where things stand, how they move and when.
<Marker id="reveal" start={4} label="reveal" />
<Three id="crossing-shot" start={2} duration={5} shot={crossing}
  camera={{
    fov: 35,
    position: [{ at: 0, value: [-1.5, 1.4, 5.5], easing: "easeInOut" }, { at: 5, value: [1.5, 1.4, 5.5] }],
    lookAt: [0, 1.1, 0],
  }}
  objects={{
    table: { position: [0, 0, 0.6] },
    flat: { position: [-2.2, 0, -0.3] },
    walker: {
      position: [
        { at: 0.5, value: [-2.5, 0, -0.8] },
        { at: "marker:reveal", value: [-1, 0, -0.8] },
        { at: 3.2, value: [1.5, 0, -0.8] },
      ],
    },
  }}
  inputs={{ stride: 1.4 }}
/>
```

The rule that decides where a value goes: **anything a gesture can change is a literal on the tag.** Geometry,
materials, rigs and anything computed stay in the module. The module may be TypeScript or TSX too; plain `.js` local
modules now load like `.ts` ones.

- `objects` holds each declared object's `position` (metres, y up), `rotation` (degrees about x, y, z) and `scale`,
  each a constant `[x, y, z]` or keys, as every animatable prop is since 0035.
- `camera` keeps its shape; `position`, `lookAt` and `fov` may now be keys.
- `inputs` sets the module's declared inputs: numbers (or keys), flags, words.
- Keys are in **shot time**, not seconds into the layer. A head trim then leaves them where they are, as the frames of
  a clip stay put when it is trimmed.

### 3. A key can name a marker

A key's `at` may be `"marker:ID"`. The resolver turns it into shot time from the marker's place in the edit:
`markerStart - start + in`. Move the beat and the walker comes out on it; move the shot and the beat key stays on the
beat while the other keys move with the shot. Moving such a key by hand unties it: it is written as the number it was
moved to. An input may also be `"marker:ID"`, read as that marker's shot time.

### 4. What the module computes is not written to

A procedural position is recomputed on every frame, so a value written over it would never show. An object declares
the channels its module sets (`walker: { computes: ["rotation"] }`). The resolver reports a file that writes one,
and the viewport's actions refuse to, naming the inputs to change instead. In the prototype nothing is computed but
the rig inside the walker, which is not a declared object: its path is the file's keys, and its walk follows from the
path. That is the pattern this record recommends: **derive procedural motion from staged values, not from its own
clock**, so retiming the staging retimes it too.

### 5. What a viewport gesture saves

Three.js supplies the gizmo (`TransformControls`). UberScene supplies the rules: the gesture becomes an action, the
action is validated against what the shot declares, and the fold writes the one literal it changed. These diffs are
the prototype's, checked by `packages/sdk/test/shot.test.ts`:

| Gesture | Action | The file's diff |
|---|---|---|
| Drag the static table | `shot/set` `objects.table.position` | `table: { position: [0, 0, 0.6] }` becomes `[0.4, 0, 0.6]` |
| Drag the walker at 3.2 s with keying on | `key/update` `objects.walker.position` at 3.2 | `{ at: 3.2, value: [1.5, 0, -0.8] }` becomes `[1.2, 0, -0.6]` |
| Key the table at the playhead, 5.2 s of the edit | `key/add` at shot time 3.2 | the constant becomes `[{ at: 0, value: [0, 0, 0.6] }, { at: 3.2, value: [0.3, 0, 0.6] }]` |
| Retime the end of the crossing | `key/move` 3.2 to 2.8 | `at: 3.2` becomes `at: 2.8` |
| Move the reveal earlier | `marker/update` | `<Marker id="reveal" start={4}` becomes `start={3.6}`; the shot's text does not change |
| Move the shot later | `layer/setTiming` | `start={2}` becomes `start={3}` |
| Trim the shot's head by 0.4 s | `clip/trim` | `start={2.4}`, `duration={4.6}`, `in={0.4}` |
| Drag the beat key's walker | `key/update` at the marker's shot time | the value changes; `at: "marker:reveal"` stays |

Each is one undo step, and undo restores the file byte for byte. A drag the shot cannot keep is refused with the
reason: an object it does not declare, a path that holds keys (use `key/update`), a channel it computes.

The resolver checks the tag without running three.js: the module's `objects` and `inputs` are plain data on the
`defineShot` value. An unknown object, an unknown input, a missing marker or a computed channel written to is an
error at its path (`objects.lamp`), like any prop.

## The two shapes compared

The brief proposed two shapes. Both were sketched for the same shot.

**A. Scene data with JavaScript helpers** (the one chosen). Objects have ids; their transforms and keys are data;
code builds geometry and computes the rest. The data could live in an editor-owned file the module imports, or as
literals the editor writes. It lives on the tag, in the video file, because:

- The diff of a staging change is in the same file as the edit around it. Moving a beat and the pose tied to it is
  one file, one review.
- The SDK already writes literals there (the fold, the patch log, undo, the lint), so the shot's data gets every one
  of those for nothing: the prototype added one action and taught the key actions three new paths.
- An agent reads one file to know where everything stands and when.
- A data file beside the module would need a second write target, a second undo log, and a way to tie its keys to the
  edit's markers across files.

**B. An ordinary three.js module with editable inputs.** The author writes the scene in code and registers the
values the editor may change:

```js
export default defineShot({
  inputs: { tableX: 0, crossStart: 0.5, crossEnd: 3.2, crossFromX: -2.5, crossToX: 1.5 },
  build({ THREE, scene }) {
    // ...
    return {
      sample(t, { inputs }) {
        table.position.x = inputs.tableX;
        const k = THREE.MathUtils.clamp((t - inputs.crossStart) / (inputs.crossEnd - inputs.crossStart), 0, 1);
        walker.position.x = THREE.MathUtils.lerp(inputs.crossFromX, inputs.crossToX, k);
      },
    };
  },
});
// in the edit: <Three shot={crossing} inputs={...} />
```

The same three changes, in each shape:

| Change | A: staging on the tag | B: registered inputs |
|---|---|---|
| Drag the table | `position: [0.4, 0, 0.6]` on the `table` line: says what moved and where | `tableX: 0.4`, if the author registered `tableX` and bound the gizmo's x axis to it; a drag in depth needs a `tableZ`, a turn a `tableTurn`; anything unregistered cannot be kept |
| Change the walker's pose at 3.2 s | one key's value | not expressible unless 3.2 s happens to be `crossEnd`, and then only along x |
| Retime the crossing | one key's `at` | `crossEnd: 2.8`: also one number |
| Tie the reveal to a beat | `at: "marker:reveal"` on the key where the walker clears the flat | a new input and new code, since the reveal is in the middle of the lerp |

B reads as well as A for the one change its author planned for, and fails for the rest: a reviewer has to open the
module to learn what `tableX` moves, and an agent cannot change what was not registered. A explains itself in the
diff. B's inputs stay, for what is not a transform: a stride, a swing, a colour, a seed.

## Alternatives set aside

- **Make React Three Fiber's own elements editable.** `<mesh position={[0, 1, 0]}>` has literal props, but no ids
  and no schema, so the editor could not know what a drag may write. A shot's objects are named by the module.
- **A 3D vocabulary of elements inside `<Three>`** (`<Model>`, `<Light>`, `<Group>`, as 0030 proposed). The shot
  needs none to be staged: three.js builds, the tag places. Elements can come later for what a person picks from a
  list (a model asset, a light); they would sit in `objects` as data, not as children.
- **Scene state in a JSON file beside the code**, as Theatre.js keeps it. See A above: two files to read and review.
- **Arbitrary writeback into code.** Rewriting a module's expressions from a drag is a promise the fold cannot keep
  in general. Inputs are the bridge from a drag to code.

## Prototype

`examples/3d/crossing.tsx` and `crossing.js`: a table with an apron, a wall flat, a proxy walker with a walk clip on
an `AnimationMixer`, and a camera that eases sideways. Checked by tests:

- **Seeking.** In Node with three.js and no renderer, the transforms at 3.2 s are identical after playing every frame
  forward, after scrubbing back from 5 s, and after jumping there (`packages/graphics/test/shot.test.ts`). In Chromium,
  in the Player, the pixels at 5.2 s of the edit are identical the same three ways
  (`packages/graphics/test/browser/shot.test.ts`).
- **Moving the shot.** At 12 s or 20 s, the pose at 15.2 s or 23.2 s equals the pose at shot time 3.2. A head trim of
  0.4 s still shows shot time 3.2 at the same moment of the edit. With the marker left where it is, the beat key
  follows the marker.
- **Saving.** Dragging the table and changing the walker's key at 3.2 s, folded into the file and reopened, gives the
  new pose at 3.2 s; each diff is the one in the table above.
- **Export against preview.** `uberscene crossing.tsx --still 5.2` and the Player at 5.2 s put the walker's
  silhouette at the same place: centroid within a pixel, size within 1%, the frame within 1/255 on average.

Software WebGL draws this blockout at 1080p in a few seconds a still, including the page's start.

## Consequences

- A 3D shot is staged like the rest of the edit: literal, keyed, undone, diffed, and checked without a GPU.
- `<Three>` gains `shot`, `in`, `objects` and `inputs`; its camera takes keys. `setup` and React Three Fiber children
  keep working, alone or beside a shot.
- The kit gets `defineShot` and the shot's types, and still does not depend on three.js. `@uberscene/graphics` samples
  shots. The SDK gets `shot/set`, and the key actions take `objects.*`, `camera.*` and `inputs.*` on a `<Three>`.
- A shot layer that a seek mounts takes a frame or two to make its renderer in the preview, as any `<Three>` does; the
  export holds the frame until it has drawn.

## Not decided yet

1. **The viewport.** The actions exist; the editor does not yet show the shot's objects with a `TransformControls`
   gizmo, nor work out shot time from the playhead for `key/add`.
2. **Handles for inputs.** A gizmo bound to an input (drag the end of a procedural path, write `crossEndX`), declared
   by the module.
3. **Assets.** glTF models and rigs and HDR environments as manifest kinds, so the export waits for them and the frame
   cache keys on them. The walker here is boxes.
4. **Speed other than 1**, and reverse, through the same mapping clips use.
5. **Agents seeing the scene.** Each object's box on screen in `inspect`, `where` and the layout check.
6. **Outputs for a generator.** A depth pass or a camera path from the same scene, once a generator that takes one
   is chosen.
7. **Export speed** for a textured model with shadows at 1080p, measured before anything heavy is promised.
