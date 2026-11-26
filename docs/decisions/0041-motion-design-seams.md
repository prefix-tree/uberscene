# 0041. Motion design on the timeline: four seams that DaVinci-style edits plug into

> Status: proposed, built in steps. The camera of seam 3 is built (`<Camera>`, its keys, its `push`, the tools and the
> editing actions; see [the guide](../guide/camera.md)), and so are the generators of seam 4 (`wiggle`, `drift`, `loop`; see
> [the guide](../guide/animation.md#generators)); `follow` and seams 1 and 2 are not. Builds on [0039](./0039-a-person-cut-out-of-the-background.md) (the matte beside the footage),
> which becomes the first case of seam 1 and seam 2 here, and on [0035](./0035-everything-is-a-prop.md) (a value is a
> constant or a key list), which seam 4 extends with a third kind of value. 3D stays with
> [0040](./0040-a-3d-scene-is-a-clip-source.md).

## Context

### The edit that prompted this

A short-form "before and after" of a podcast clip, cut in DaVinci Resolve and After Effects: 11 seconds, 1080 by
1920, the edited version on a blue card above the raw footage. Frame by frame it does this:

1. The speaker, cut out of the studio, sits on a flat blue card with a white sticker edge. A subtitle types in under
   him word by word.
2. Photo cards (a white frame, a black and white halftone picture, a caps label: Television, Film, Radio, Print ads)
   snap in, each in about 0.15 s, with an overshoot and motion blur, tilted, landing on the spoken word.
3. **When a card enters, everything else moves to make room.** The speaker and the cards already there slide
   together, and the frame zooms in a little, as if a camera reframed on the beat with the same snappy ease.
4. **Nothing is ever still.** Between beats the whole frame drifts and scales slowly.
5. Back to the studio shot; a blue gradient sweeps in from one side behind the speaker, and stacked caps in tilted
   white boxes pop in line by line ("I HAVE / WRITTEN / ALL KIND / OF STUFFS"), one word in blue.
6. The frame blurs out between beats.
7. A huge "13" stands behind a black and white halftone cut-out of the speaker, with words either side.
8. A halftone hand slides a cheque in; "PAY CHEQUE" in giant condensed type; a cut-out head pops over it.

Most of that is already UberScene: keyed `box`, scale and rotation with `spring` or `snappy` easing, `pop` entrances,
the `outline`, `halftone`, `grayscale`, `blur` and `zoomBlur` effects, Shape gradients and blend modes, word by word
captions, tracks drawing in file order (#192), motion blur in the export. The cut-out is drawn since #199 (`cutout` on a
clip, its matte a second asset named in the manifest), though the matte is still made outside UberScene. Two things
are not there at all: moving many elements together (3), and motion that is not keys (4). The interview edit that led to 0039
found more of the same kind (coloured words in one title, a duration that ends on a word, checks for text over text
and for read time).

### Why not a feature list

Listing this edit's gaps and building each one would give a `cutout` prop, a `<Camera>` tag, a `drift` prop, and the
next edit would need a planar track, a depth slice, a shake, a face follow, each a new prop with its own spelling.
DaVinci does not grow that way. Its features are few kinds of thing combined:

| DaVinci | Kind of thing | What it is |
|---|---|---|
| Magic Mask, Depth Map, the trackers, Smart Reframe, scene cut detection, transcription | **Analysis** | data about a clip, computed once by the Neural Engine or a tracker, cached, then used by many tools |
| Fusion MatteControl, Merge with a mask input, power windows, qualifiers, keyers, track mattes on the Edit page | **Matte** | where an image is visible, from any source, plugged into any node |
| Fusion Transform and Merge chains, Camera3D, compound clips, Dynamic Zoom, parenting a node to a tracker | **Rig** | one transform that moves many things, or one thing that follows another |
| Fusion modifiers (Shake, Perturb, Expression, Follower), Edit page keyframe curves | **Generated motion** | a value computed over time rather than placed key by key |

UberScene already has the first kind without naming it: the asset manifest holds `transcript`, `shots`, `silences`,
`beats`, `waveform` and `subjects`, each made once by `uberscene add`, and `word:`, `shot:` and `beat:` refs turn them
into time. This record names the four kinds as seams: each is one shape that new features plug into, so the next
analysis, matte source, rig or motion is an entry, not a new spelling.

## Decision

### Seam 1. Analyses: data about an asset, made once, kept in the manifest

- An analysis is a named entry on an asset in the manifest: what it found, which tool made it, and with which
  version. Large results live in a file beside the asset; the entry names it. This is the shape `transcript`,
  `beats` and `subjects` already have, and the shape 0039 gives the matte.
- A registry lists the analyses: name, what it needs (video, audio), the command that makes it, how the player reads
  it, which refs it adds. `uberscene analyze <kind> <asset> [--model]` runs one; `uberscene add` runs the cheap ones,
  as today. `uberscene matte` from 0039 is `analyze matte`.
- An analysis never runs inside a render. The preview and the export read the same file, so a render stays fast and
  repeatable, and a result made by another tool (a roto artist, a paid service) drops in the same way.
- Refs into an analysis are how the timeline uses it. Time refs exist (`word:`, `shot:`, `beat:`, `marker:`). This
  adds **space refs**: `tracked:<asset>.<name>` names a tracked point, box or plane over time, in composition pixels.

Kinds, in order of use:

| Analysis | Made from | Gives | Used by |
|---|---|---|---|
| `matte` | a matting model (0039) | a greyscale video, the person's alpha | seam 2 |
| `tracking` | a point or planar tracker, or the `subjects` boxes | named points, boxes or corner pins over time | seam 3 `follow`, `cornerPin` |
| `depth` | a depth model | a greyscale depth video | seam 2 depth slices, later 2.5D parallax |
| `faces` | a face model (extends `subjects`) | boxes and a few landmarks per face | layout check, `follow`, smart reframe |
| `transcript`, `beats`, `shots`, `silences`, `subjects` | exist | exist | unchanged; listed in the registry |

### Seam 2. Mattes: one `matte` prop, many sources

Every visual element (clip, title, shape, svg, layer, nested sequence) takes `matte`: where it is visible. The source
is one of a fixed list, and the list is the extension point:

```tsx
<Clip id="speaker" src="asset:talk" cutout />                                // shipped in #199; short for matte="asset"
<Clip id="speaker" src="asset:talk" matte={{ source: "asset", shrink: 1, feather: 1.5, despill: 0.8 }} />
<Clip id="plate" src="asset:talk" matte={{ source: "element", id: "logo", channel: "alpha", invert: true }} />
<Clip id="far" src="asset:talk" matte={{ source: "depth", near: 0.6, far: 1 }} />   // later: a depth slice
<Clip id="green" src="asset:screen" matte={{ source: "key", color: "#00ff00", tolerance: 0.3 }} />
```

- `asset` reads the asset's matte. This is what `cutout` does since #199, and `cutout` stays as its short form:
  files written today keep working, and `matte` adds the other sources.
- `element` uses another element's alpha or luma at the same moment: a track matte, as on DaVinci's Edit page.
- `key` is today's `colorKey` effect expressed as a matte, so a key and a cut-out combine the same way.
- `shape` takes what `<Mask>` holds today. `<Mask>` children stay until the shape source has the same edit support
  (feather and keys), then the lint moves them.
- `shrink`, `feather`, `invert` apply to every source. The matte multiplies into the element's alpha before its
  `effects`, so `grayscale` or `halftone` act on the visible part alone (0039 §2).
- A new source (a sky matte, a hair refinement, a matte from a 3D scene clip) is a registry entry: a name, its params
  schema, and a function that gives a greyscale texture for a frame.

**Text behind a person** is no new feature: the footage twice, the full shot on a lower track and the same clip with
`cutout` on a higher one, the title on a track between. The docs gain that recipe and a test.

### Seam 3. Rigs: one transform over many elements, and elements that follow

A rig moves things it does not own. Two forms, both literal props the editor can change:

```tsx
<Composition ...>
  <Camera id="cam"
    x={[{ at: 1.0, value: 0, easing: "snappy" }, { at: 1.3, value: 180 }]}
    zoom={[{ at: 2.1, value: 1, easing: "snappy" }, { at: 2.4, value: 1.06 }]}
    drift={{ x: 12, zoom: 0.03 }}>
    <Track id="speaker">...</Track>
    <Track id="cards">...</Track>
  </Camera>
  <Track id="subtitles">...</Track>
</Composition>

<Title id="name" ... follow={{ ref: "tracked:talk.face", offset: { x: 0, y: -220 } }} />
```

- **`<Camera>` is optional, and it is a parent.** A composition without one draws exactly as today; no file has to
  change. Where there is one, it is a 2D view over the tracks written inside it: `x`, `y`, `zoom`, `rotation` around
  the frame's centre, each a constant, keys (0035) or a generator (seam 4). Tracks outside it (subtitles, a logo, the
  frame of the card) stay fixed to the screen. What a camera moves is read from the file's structure, not from a
  list of ids that can be misspelled, and file order still decides what draws over what, across the camera's edge.
- Each element inside keeps its own entrance and timing; the camera adds the shared move on top, so the sdk's edits,
  the editor's drags and the layout check work as before, the check reading positions after the camera.
- **`push`** reframes on entrances: `push={{ on: ["tv", "film", "radio"] }}`. As each named element starts, the view
  moves as little as it can to hold it with everything else on screen under the camera (or only what `keep` names):
  it pans the shortest way, and pulls back only when all of it cannot fit. It is always derived: the resolver makes
  ordinary camera keys from it each time the file is read, so the player and the tools read a pushed camera as one
  keyed by hand, and a card that moves takes the camera's move with it. It is never written back into the file on
  its own. An explicit action, `camera/bakePush`, turns it into keys for someone who wants to tune them by hand, and
  removes the prop. With a push, `x`, `y` and `zoom` are numbers (where the view starts), not keys.
- **`follow`** pins an element's `box` to a space ref (seam 1): a tracked face, a planar corner pin, or another
  element's box (parenting). The offset is in pixels and may be keyed.
- Its values are a camera's, not an element's: `x` and `y` say where the view's centre has moved, so `x: 180` puts
  everything 180 px to the left; `zoom` closes in about the frame's centre; `rotation` turns the view clockwise, so
  what it shows turns the other way. A key's `at` is seconds on the video's clock, since a camera has no start.
- Extendable by design: a track may later carry `depth`, and the camera then moves near tracks more than far ones
  (2.5D parallax, as Fusion's Camera3D over image planes). The field is added when parallax is built, not reserved
  now: the schema says only what is drawn, and a file without `depth` keeps its meaning when it arrives. A true 3D
  camera stays inside a 3D scene clip (0040).
- One camera per composition to start, not nested; a nested sequence may have its own.

### Seam 4. Generated motion: a third kind of value

0035 made a value a constant or a list of keys. A third form is an object naming a generator:

```tsx
transform={{ rotation: { type: "wiggle", amount: 2, frequency: 1.5, seed: 3 } }}
transform={{ scale: { type: "drift", base: 0.8, speed: 0.06 } }}
transform={{ rotation: { type: "wiggle", amount: 3, base: [{ at: 0, value: 0 }, { at: 1, value: 90 }] } }}
transform={{ opacity: { type: "loop", mode: "pingpong", keys: [{ at: 0, value: 1 }, { at: 0.6, value: 0.25 }] } }}
```

- Generators are pure functions of time and their params, seeded, so a frame is the same in the preview, the export
  and the cache. No expressions and no code in props: a generator is data with a params schema, which keeps files
  readable by a model and editable by the inspector.
- As built: `wiggle` (smooth seeded noise, Fusion's Perturb and Shake) and `drift` (a steady change) are added to a
  `base`, a number or keys, so one goes on top of a keyed move; `loop` plays a key list again, or back and forth.
  `base` replaces the `then` first written here: the generator wraps the value, which reads better than keys that
  carry a generator. A wiggle's seed, left out, comes from the element and the prop.
- `overshoot` is not a generator: a settle after a move is how a value leaves a key, and the easings already have
  springs.
- The resolver makes a `generator` item beside the keys of the value it is written at, and the player's one
  function for an animated value applies it. So the tools that read keys (the layout check, `inspect`, the frame
  cache, motion blur) follow without knowing.
- The camera's `drift` is a `drift` on its `zoom`; on a pushed camera a generator goes on top of the push's keys.
- Anything keys can move takes a generator, including numeric effect params, except `speed` (it bends time) and
  `volume` and `pan` (the mixer builds its envelope from key times; a generated one needs sampling of its own).
- Free code (`<Layer>`, `<Motion>`) remains the way to anything a generator cannot express.

### Outside the seams, needed by the same edits

These do not need a new shape, only work:

| | Item | Why |
|---|---|---|
| a | Motion blur in the player preview | snaps only read with blur; today it is export only, so timing is judged on a different picture. The preview takes fewer shutter samples while playing and the export's count when paused |
| b | Styled runs inside one title (`text` with marked words: colour, background, weight) | one word in blue inside a stack; 0039 gap 2 |
| c | A duration that ends on a word or a beat (`end="word:42.end"` on overlays) | cards land on the word; 0039 gap 4 |
| d | Checks: text over text, a title that wraps or overflows its box, read time | flash cards this fast are what the checks should catch; 0039 gaps 5 and 6 |
| e | Loudness target with a limiter on export | 0039 gap 3; DaVinci's Fairlight normalises and limits on delivery |
| f | Blocks: photo card, sticker stack | the next edit in this style is quick to start; built with the seams, not part of them |

### What UberScene does not take from DaVinci

- **No node graph.** The file is the graph: tracks are the merge order, `matte` is the mask input, the camera is the
  transform above a group. A node editor would be a second way to say what the file says.
- **No neural work in the render.** Matting, depth, tracking and transcription are analyses, made once and kept.
- **No paint or frame by frame rotoscoping tools.** A matte from another tool is used as is (seam 1).
- **No particles in the vocabulary.** A particle system is a 3D scene clip (0040) or free code.

## Order

One PR each, from fresh `main`, each with its decision section moved to accepted when it merges:

1. **Analyses registry and `uberscene analyze`**, with the existing manifest fields listed in it. No behaviour change.
2. **`analyze matte`** makes the matte `cutout` already reads (#199); then **`matte`** with the `element` source,
   `cutout` as the short form of the `asset` source; the text behind a person recipe and test.
3. **`<Camera>`** around tracks, with keys, the layout check after the camera, and `push` (done).
4. **Generators**: `wiggle`, `drift` and `loop`, over a `base`; the camera's drift is one (done).
5. **Preview motion blur** (a).
6. **Styled runs and word-ended durations** (b, c).
7. **`tracking` analysis and `follow`**, from `subjects` first, a point and planar tracker after.
8. **The blocks and `examples/kinetic-interview`**, a recreation of the edit's style on public domain footage: the
   end to end proof that every beat in the Context is expressible.
9. Checks, loudness, `key` and `shape` matte sources, `depth`: as needed, in any order.

Steps 1 to 4 give most of the look; 5 makes it judgeable in the preview.

## What the first film on the seams showed

`examples/interview/cards.tsx` is 17 seconds of the NASA interview in the style of the edit in the Context: the
speaker cut out on blue with a sticker edge, a word behind him, a card for each of his three lines, the camera
making room for each, the cards bobbing and the view drifting. It was written after the camera, its push and the
generators were built, to find what is still awkward.

**Worked the first time, as designed:**

- The camera's push: three cards, three moves, no pan worked out by hand. Changing a card's place or its word moved
  the camera with it.
- Never still: a `wiggle` on each card and on the camera's rotation, a `drift` on its zoom, and not one idle key.
- A word behind the speaker: a title on the track before his (#192). The sticker edge: `outline` after the key.
- Everything on his words: `anchor` and `at="word:N"`.

**Awkward, in order of what it cost:**

1. **A push holds what it keeps inside the margin on every side.** The speaker stands on the frame's bottom edge, so
   keeping him lifted him 54 px off it. The film keeps the word behind him instead. A push needs to know which
   sides of what it keeps matter, or that an element stands on an edge.
2. **A camera that pulls back lifts whatever stands on the bottom edge.** With three cards on screen the push zoomed
   out and the speaker's cut torso floated. The film has each card leave as the next lands, so the camera only
   swings. That is also what the reference does, but it was found by rendering, not said by any check.
3. **A card is three elements that cannot move as one.** Frame, picture and label share a wiggle seed and repeat
   each other's place by hand (three `y`s a card, kept in step), and cannot tilt about one pivot. This is `follow`
   from seam 3 (one element pinned to another), or a group inside the camera.
4. **A duration cannot end on a word** (BACKLOG item 8). The first two cards' lengths are seconds worked out from
   the words, and the push depends on them: a card that outlives the next one's start by a frame makes the camera
   pull back.
5. **Footage has no entrance or exit.** A card's frame and label `pop` and fade; its picture is a clip, so its pop
   and its fade are keys written beside it.
6. **B-roll shorter than its card** is slowed by a `speed` chosen by hand for each clip. Footage has no "last as long
   as this" (hold the last frame, or loop).
7. **A push counts a clip's whole box**, not the person in it. The speaker's box is the picture's frame, far wider
   than he is. A matte (seam 2) knows his outline.
8. **One colour to a title** (BACKLOG item 7): the blue word in the caps stack is a title of its own.

Items 1, 2 and 7 are the camera's; 3 is `follow`; the rest were known. None stopped the film, and each is written
where the file works around it.

## Consequences

- One new value form (a generator) and two new props (`matte`, `follow`) and one new tag (`<Camera>`) cover what
  would otherwise be a dozen props. Each later feature is a registry entry: a new analysis, matte source or generator
  does not change the schema of any element.
- `cutout` (#199) stays, as the short form of `matte="asset"`; 0039's model registry and its measurements stand, and
  making the matte becomes `analyze matte`.
- The resolver gains a camera pass and a matte dependency (an element matted by another needs that one drawn first);
  a matte cycle is an error naming both elements.
- The layout check and `inspect` report positions after the camera and `follow`, so what an agent reads matches what
  is drawn.
- 2.5D parallax later is a new optional `depth` on tracks, so a feature and not a migration.
- Risk: the camera changes the meaning of "where an element is" for the editor. Drags inside a camera write the
  element's own `box`, in the camera's space; the editor shows both. This needs its own test in the editor suite.

## Open questions

- Closed: `push` is a camera prop, not a generator. It reads other elements, which no generator does, and it makes
  keys rather than a value.
- Whether `matte` from an element and `follow` should also be said by structure rather than by id. Proposed: ids,
  as anchors use today, because the two elements usually sit on different tracks; an unknown id is an error.
- Whether generators should also be allowed on non-numeric values (a colour wiggle). Proposed: numbers only at first.
- Whether `follow` replaces anchors (`at` refs between elements) or sits beside them. Proposed: beside; anchors place
  once, `follow` holds over time.
