# @uberscene/kit

## 0.6.0

### Minor Changes

- 28bdc58: `uberscene blocks add <name>` copies a block into the project and records it in the manifest; with `--into video.tsx --track <id> --at <moment>` it also writes the import and a `<Layer>` holding it, leaving the video as it was if that would give it errors. `uberscene blocks update` replaces copies nobody edited and prints what differs in edited ones. The kit gets `insertLayer` in `@uberscene/sdk`, an optional `blocks` record on `AssetManifest`, and a component imported from one of the file's own modules now gets the Layer's handles, as one declared in the file does.
- 68c7b7c: Blocks: scene-sized pieces of motion design that ship with the CLI. `uberscene blocks` lists them by the job each does
  (`--for`, `--aspect`, `--json`) and `--sheet` pastes their previews into one image. The first three are a grid of
  cells that fills and counts, a wall of characters that changes on the beat, and a row of points lit in turn; the
  example shorts are built on them. The kit gains `themeCss` (a theme token as a CSS value, for components that take
  `$accent`) and `blockMetaSchema`.
- cf23cb8: One coordinate system: every element that draws is placed by `box`, the rectangle it occupies, in pixels from the
  frame's top left as in CSS. `x` and `y` place the point `origin` names (`topLeft` by default, or `center`, `top`,
  `bottomRight` and the rest of the nine), `width` and `height` size it, and `fit` fills it as CSS `object-fit` does;
  `transform` (scale, rotation, opacity, crop, rounded corners) applies after. With no box an element fills the frame as
  before, so nothing written without a position moves. Clips, nested sequences, titles, shapes, SVG, stickers and
  layers all take `box`, and keys on `box.x` and `box.y` move it.
  
  `transform.position`, which measured from the frame's centre, is removed. Captions lose `style.position` and their
  flat `x`, `y` and `width`: they sit in their default box, the lower safe area, unless their `box` changes a field of
  it, and `style` on captions is look only. Components take `box`, with `x` and `y`, for their centre from the frame's
  top left in place of their flat `x` and `y`. An axis left out is centred on the composition's frame, whatever its
  size, as before; `LowerThird` and `Callout` keep defaults set for a 1920 by 1080 frame. A
  component called as a function takes its frame from `withFrame(size, fn)`. A new `box/update`
  action places an element or the captions, the layout check's fixes name the `box` values to write, and
  `uberscene inspect --at` prints each element's box.
  
  To move a file, run `uberscene lint --fix video.tsx`. It turns `transform.position` into a box with
  `origin: "center"` at the same point (each coordinate plus half the frame), keys on `transform.position.x` and
  `.y` into keys on `box.x` and `box.y`, the captions' `style.position`, `x`, `y` and `width` into the box that draws them where
  they were, and components' `x` and `y` into `box`. It also gives a box to a `LowerThird` or `Callout` placed by its
  default on a frame that is not 1920 by 1080, where that default was an offset from the centre. It needs the composition's width and
  height written as numbers or as top-level constants. Two things it cannot move: a
  `Callout`'s `to` written without the callout's `x` and `y` (now a point from the top left; add half the frame to it),
  and placements built in code (a transform object in a constant, a spread). The theme's `note` title preset no
  longer carries a position: a title that used it alone now sits centred, so give it a box.
- 327d103: `Executor.can(action)` answers whether `execute` would accept an action, with the same errors, and changes nothing. `affordances(state, id)` says what can be done to one element: how each prop can be written (`literal`, `bound`, `locked`) and which actions are about it and accept it. Handlers that act on one element gain an optional `targets` face, and `actionTarget(input)` names the element an action is about.
- 0800d5e: Removing, splitting and trimming a clip carry along what is placed from it. Titles anchored to a removed clip move to
  the clip before it, held inside it, or are removed with it when there is none; a transition left with one side is
  removed; a length that followed the clip becomes seconds. A split moves titles at a word of its second half, end
  anchors, `until` lengths and an out-edge transition to the new clip. A trim keeps a title whose word it takes away at
  its time, as an offset inside the clip. Undo puts all of it back, and the write-back writes it into the file.
  `dependentsOf(state, id)` lists what depends on an element. Fixes: undoing a removal puts an anchored element back on
  its own line and a Layer back with its handles, and restoring an element anchored to an end (`a.end`) is accepted.
- 71e136e: `LowerThird` and `Callout` take a `size`: the name's or the note's size in pixels, with the card, the bar and the box scaled to match. The defaults (44 and 30) draw them as before.
- fa69b88: Everything about an element is a prop. A value is a constant, or a list of `{ at, value, easing? }` keys when it changes over time (`at` is seconds into the element; `easing` says how the value leaves that key, linear when left out). Effects are an ordered list on the element, a speed ramp is keys on `speed`, and held frames are a `freezes` list:
  
  ```tsx
  <Clip id="pour" src="asset:coffee" in={8} out={14}
    transform={{ scale: [{ at: 0, value: 1, easing: "easeInOut" }, { at: 3.5, value: 1.2 }] }}
    effects={[{ type: "lut", src: "asset:warm" }, { type: "blur", radius: [{ at: 0, value: 8 }, { at: 1, value: 0 }] }]}
    speed={[{ at: 0, value: 1, easing: "easeInOutQuad" }, { at: 1.6, value: 0.4 }]}
    freezes={[{ start: 4.2, duration: 1.4, source: 12.4 }]}
    volume={[{ at: 0, value: 0 }, { at: 0.5, value: 1 }]} pan={-0.3} />
  ```
  
  - Keys animate `transform.scale` (one list moves both axes, `{ x, y }` each on its own), `rotation`, `opacity`, `anchor.x` and `anchor.y`, `borderRadius`, `crop.x`, `crop.y`, `crop.width` and `crop.height`, `box.x` and `box.y`, `volume`, `pan`, `speed` and every effect param.
  - `effects` is on clips, titles, shapes, SVG, stickers, adjustments, nested sequences and layers: each entry `{ type, ...params, enabled? }`, `type` a built-in name or an `effect()` the file declares.
  - `freezes` is on clips and audio: each hold `{ start, duration, source }`, from `start` seconds into the element, for `duration`, showing the source frame at `source`. `start` follows the naming rule: the second something starts at is `start`; keys keep `at`, a moment rather than a span.
  - The `halftone` effect's `mode` param, `type` for a while on the way to 0.6, is `inks` (`"mono"` or `"cmyk"`): in an entry of `effects`, `type` names the effect.
  - `pan` is a new prop; `volume` and `pan` keys replace `automation`.
  - Masks, captions, angles, cuts and markers stay children.
  
  Errors on a key or an effect name the element and the prop path (`pour` at `effects.1.radius`). The edit actions address a key by element id, path and time (`key/add`, `key/update`, `key/move`, `key/remove`, `key/setAll`), an effect by its index (`effect/add`, `effect/remove`, `effect/update`, `effect/toggle`, `effect/setOrder`, `effect/setStack`), and the holds with `freeze/setAll`. The player and the export draw the same frames as before.
  
  Breaking: `<Keyframe>`, `<Effect>`, `<SpeedKey>`, `<Freeze>` and the `automation` prop are removed, with the `keyframe/*`, `speed/*` and `audio/setAutomation` actions. A file that still uses them fails with an error naming the fix. To move a file, run:
  
  ```sh
  uberscene lint --fix video.tsx
  ```
  
  The new `everything-is-a-prop` rule rewrites the children into props and their imports, gives the params and easings their 0.6 names on the way (a shadow's `radius` is `blur`, `"ease-in-out"` is `"easeInOut"`), and folds `automation` into `volume` keys with the same gain. The playground upgrades a shared link when it opens it.
- 89e5b4b: Removed `Frame`, `Background`, `ProgressBar`, `Arrow`, `Highlight` and `QuoteCard`. Each was one element with defaults or a duplicate of a block: draw a border as a `<Shape>` with no fill and a `stroke`, a gradient backdrop as `<Composition background={{ mode: "gradient" }}>`, and the rest as free code in a `<Layer>` (a quote with marked phrases is the `quote-build` block).
- efb3f7f: `uberscene lint <file.tsx>... [--fix] [--json]` runs the kit's static checks from the command line: one line per finding with its file, line and column, exit code 1 when an error is left. The file is read, never run. `--fix` writes the fixes the findings carry.
  
  A lint `Diagnostic` can now carry a `fix` (source edits), and `fixSource(text, options)` from `@uberscene/sdk` applies them round by round. A new rule, `deprecated-props`, reports props and values spelled the way an earlier version took them, from a `DEPRECATIONS` table (empty for now) and from `lint(text, { deprecations })`; where the new spelling is certain its fix renames the prop, respells the value or moves the prop into an object prop. The helpers it uses are exported for rules of your own: `renameProp`, `renameValue`, `movePropInto`, `movePropsInto`, `jsxTags`. The `free-code-clock` rule fixes `window.requestAnimationFrame` and the like to their bare names, and takes `willReadFrequently: true` out.
- 974c884: Clips can be written straight in `<Composition>`, with no `<Track>`: they play in the order they are written, as the video's main track, the bottom one (id `main`). `<Transition>` and `<Gap>` go between them the same way. Tracks written beside them draw on top, so adding a b-roll or title track leaves the main cut as it is. Write `<Track id="main">` around the clips when the track needs a setting of its own; the editor does that when you mute, lock or move it. A clip written after a `<Track>` gets the lint warning `main-clips-first`. `uberscene add` now prints the element to paste (`<Clip id="talk" src="asset:talk" />`), `@uberscene/sdk` gets `wrapMainTrack`, and `ResolvedTrack.implicit` marks a main track with no element. `<Composition> cannot contain <title>` now says to put it in a `<Track>`.
- 261d5b6: One name for one idea. A kind is always `type`: a shape's `shape`, a title's `animation.preset`, a lower third's
  `variant`, the composition's `background.mode`, an svg's `color.mode` and the `halftone` effect's `mode` param are each
  `type` now. A line's thickness is `thickness`: `stroke.width` on a shape, and in a title's and the captions' `style`, is
  `stroke.thickness`, the `outline` effect's `width` param is `thickness`, and a diagram `Label`'s `lineWidth` is
  `lineThickness`. The `shadow` effect's `radius` param is `blur`, the name a shadow's softness has everywhere else (the
  blur effects keep `radius`, a Gaussian's standard deviation). The second something starts at is `start`: a `<Marker>`'s
  `at`, the diagram parts' `at` (`DrawnLine`, `Label`, `CountUp`, `progress` and `useProgress`), and the `at` of the
  hundred-cells and point-list blocks. The bar-race and quote-build blocks' `start`, seconds into their layer, is
  `after`, as it is on every other block and diagram part.
  
  Values are camelCase: the blend modes `colorDodge`, `colorBurn`, `hardLight`, `softLight` and `linearDodge`; the
  easings `easeIn`, `easeOut` and `easeInOut` (and a crossfade's `curve`); the entrances and exits `slideLeft`,
  `slideRight`, `slideUp`, `slideDown`, `wipeLeft`, `wipeRight`, `wipeUp`, `wipeDown`, `revealCenter`, `revealEdges`,
  `flipHorizontal` and `flipVertical`; a title's animations `slideUp`, `slideDown`, `slideLeft`, `slideRight` and
  `wordByWord`; the captions' `wordHighlight` and `wordByWord`; and the decoration `lineThrough`. Every frame draws as it
  did. A file written the old way is refused with an error that names the new spelling (`` `shape` is now `type` ``,
  `"ease-in-out" is now "easeInOut"`). Free code keeps working: `interpolate`, `ease`, `progress` and `useProgress` still
  take an old easing name, and `progress` an old `at`, each with one warning that names the new spelling. `style.preset`
  stays: it names a theme preset. The kit's `TEXT_ANIMATION_PRESETS` and `SVG_COLOR_MODES` are `TEXT_ANIMATION_TYPES`
  and `SVG_COLOR_TYPES`. The editor's actions follow: `marker/add` and `marker/update` take `start`, and
  `composition/setBackground` takes `type`.
  
  To move a file, run `uberscene lint --fix video.tsx`. It renames each key and respells each value where the file
  writes it on a tag, also inside object props (`animation={{ preset: "word-by-word" }}` becomes
  `animation={{ type: "wordByWord" }}`), and the effect params only on an effect of that type: `params={{ radius: 3 }}`
  on `<Effect type="shadow">` becomes `blur`, and so does a `<Keyframe param="radius">` inside it, while a blur effect's
  `radius` is left alone. A lint rule can now depend on the element's literal `type` (a `Deprecation`'s `when`). The fix
  cannot reach a value it cannot see on the tag: one in an array (a point-list block's `points`), a spread or a shared
  constant (`<Shape {...RING} />`), a theme's own presets (a shape preset's `stroke.width`), or a call in free code
  (`useProgress({ at: 2, easing: "ease-out" })`). Move those by hand; the resolver's errors and the free-code warnings
  name what is left.
- 2ebd6a9: The schemas no longer take props that were never drawn. Each of these was accepted and silently ignored; it is now an error that names the prop, so delete it from the file (the picture does not change):
  
  - `fit` on `<Title>`, `<Shape>` and `<Sticker>` (it still fits a `<Clip>`, a `<Nested>` and an `<Svg>`);
  - `blendOpacity` on `<Title>`, `<Shape>`, `<Svg>` and `<Sticker>` (it still applies to a `<Clip>` and a `<Nested>`; elsewhere use `transform.opacity`);
  - `transform` on `<Adjustment>`, which always filters the whole frame;
  - `expansion` and `easing` on `<Mask>`, and keys on a mask;
  - `unit` and `params` in a `<Title>`'s `animation`;
  - `spread` and `inset` in the `shadow` of a `<Title>` and of a `<Captions>` style (a `<Shape>`'s shadow keeps `spread`).
  
  `MASK_EASINGS`, `ANIMATION_UNITS` and the object-shaped `vec3Schema` are gone with them. The `clip/setBlend` action sets an `opacity` only on a clip or a nested sequence, and `transform/update` no longer applies to an adjustment.
  
  The capability table matches what the resolver and the player do: a `<Multicam>` belongs on a track, not in the composition; an `<Adjustment>` has no source to trim; an `<Audio>` takes speed keys and freezes, which already worked.
  
  The reference now says what a key's `easing` does: it shapes the move from that key to the next one (on `speed` too), so the easing on the last key of a move is not used. The player has always worked this way; only the description was the other way round.
- 2daa802: A param's name now always says its scale. The zoom transition's `blur`, a strength from 0 to 1, is now `smear`, and the scanlines effect's `thickness`, a share of the spacing from 0 to 1, is now `coverage`. So `blur` and `thickness` are pixels wherever they appear. An old name is an error that names the new one, and `uberscene lint --fix` renames it, as for the other 0.6 renames.
- f654ff7: A `recolor` effect turns one colour into another and leaves the rest of the picture: `effects={[{ type: "recolor", from: "#c4202b", to: "#2f9e4f" }]}` makes a red cup green while the steam, the background and the cup's shading stay as they were. `tolerance` and `softness` say how close a hue must be to `from`, greys and whites are never touched, and `amount` mixes it in. Like every param, each can take keys.
- fd3e555: The executor refuses an action that would leave the file with resolve errors it did not have, with the new error code `BREAKS_FILE` naming each one; nothing of it is kept. Errors the file already had do not count, a `batch/apply` is checked as a whole, and undo and redo are not checked.
  
  Edits that broke the file before and now work:
  
  - `font/use` and `composition/setProps` no longer leave a schema error on the composition for the values they hold until the fold (`$fonts`, `$defaults`).
  - `multicam/create` and `multicam/restore` place a multicam by position on a free track, rather than writing a `start` it does not take.
  - Removing a clip keeps a transition beside it only when the next element is a clip, not a gap.
  
  `mask/create` refuses a locked track, a model-only element and a generated element, as the other handlers do.
- 23f68a7: The kit is split in two. `@uberscene/kit` keeps what a video file imports, and the new `@uberscene/sdk` holds what a tool is built with.
  
  - **`@uberscene/kit`** exports the elements, components, hooks, helpers, diagram parts, knobs and theme, 105 names where it had 450. Video files need no change.
  - **`@uberscene/kit/schema`** is new: the vocabulary as data, for tools. It has the element schemas and capabilities, the effect and transition registries, enums, easings, fonts and themes.
  - **`@uberscene/sdk`** is new: the resolver, the actions and executor, the patch log, the write-back to source, the lint, the inspection rows and the manifest types. Install it next to the kit and import `collectModule`, `resolve`, `Executor`, `foldToSource`, `lint`, `loadModule` and the rest from it. `@uberscene/sdk/resolver` has the resolver and the manifest types alone, without the parser, for an app that only plays files.
  - **`@uberscene/kit/source` is removed.** Everything it exported is exported by `@uberscene/sdk`.
  - Handler-authoring helpers (`define`, `makePropHandler`, `registerHandler` and the validators) are no longer exported.
  
  The actions are smaller too:
  
  - One `element/create`, `element/update` and `element/remove` serves every overlay kind (title, shape, svg, sticker, adjustment, nested, layer); `element/create` takes the kind as `kind`. The per-kind `text/*`, `shape/*`, `svg/*`, `sticker/*`, `adjustment/*` and `nested/*` create, update and remove are removed (`text/setContent` and `nested/extract` stay).
  - `clip/remove` and `clip/restore` are now `element/remove` and `element/restore`. Every remove takes what depends on the element with it.
  - `layer/setTransform` is removed; use `transform/update`.
  
  The theme's CSS variables are `--us-*` (`var(--us-accent)`) where they were `--cc-*`. A new lint rule, `old-theme-variables`, reports the old spelling in any string, and `uberscene lint --fix` respells it.
- 45aabbd: One way to style text: a title's look is one `style`, as the captions' is. `style` is a theme preset's name
  (`style="h1"`) or an object of the look's fields, `font`, `size`, `weight`, `italic`, `color`, `background`, `stroke`,
  `shadow`, `align`, `valign`, `lineHeight`, `letterSpacing` and `decoration`, with the same defaults as before. In an
  object, `preset` names the preset it starts from and every field written beside it wins:
  `style={{ preset: "h1", size: 64, color: "$primary" }}`. Those thirteen props are no longer written flat on `<Title>`,
  and a title's text box, its flat `width` and `height`, is now its box's size, `box.width` and `box.height`. A Title
  takes `id`, its timing, `box`, `transform`, `blend`, `enter`, `exit`, `style`, `animation` and its text.
  
  The captions' `style` object takes `preset` too, where a preset's name used to replace the whole object, and their
  flat `align` is now `style.align`. A theme preset for titles or captions is a look only: the built-in `note` preset no
  longer carries a size, rounded corners or an entrance, and a field in a preset of your own that is not a look is
  reported once, on the composition's `theme`, naming the preset and the field; it reaches no element and the rest of
  the theme still applies. An unknown preset name is reported on `style.preset`.
  
  Editing keeps up: `font/use` writes `style.font` (and `style.weight`) on a title as on the captions, turning
  `style="h1"` into `{ preset: "h1", font }`, and no longer refuses captions styled by a preset name; `caption/setStyle`
  takes a preset's name or an object. A `style` object with a key that is an expression, such as a font the file
  declares (`style={{ font: brand, size: 64 }}`), locks only that key (`style.font`): the rest stays editable, and a key
  that reads one of the file's props (`color: accent`) is bound as a whole prop is. The layout check suggests a smaller
  `style.size` or a narrower `box.width` for a title.
  
  To move a file, run `uberscene lint --fix video.tsx`. It folds a title's look props, and a `style` preset name beside
  them, into one `style` object in the order the file wrote them (`style="h1" size={64}` becomes
  `style={{ preset: "h1", size: 64 }}`), moves a title's `width` and `height` into its `box` (a new one, or the one it
  has, before its `origin`), and moves the captions' `align` into their `style`. It cannot move a style built in code
  (`style={LOOK}`, a spread) or a box that already sets its own size. A title that used the `note` preset now writes the
  card's size, corners and entrance itself: `box={{ width: 840, height: 160 }}`, `transform={{ borderRadius: 28 }}` and
  `animation={{ preset: "scale", in: 0.2, out: 0.15 }}` give what `note` drew before.
- 41f2ced: Time in ticks. Every turn of a time into a frame, a frame into a time, or a time into an audio sample now counts in ticks (1/254,016,000,000 s), which divide every frame and sample rate in use, so frame boundaries are exact and `FRAME_EPS` is gone. The kit exports the `time` module from `@uberscene/kit/schema` (`parseRate`, `frameAtSeconds`, `frameStartSeconds`, `framesUntil`, `nearestFrame`, `sampleAtSeconds`, `samplesUntil`, `timecode`, `TICKS_PER_SECOND`, `MAX_SECONDS`).
  
  `<Composition fps>` takes a whole number, an NTSC string (`"23.976"`, `"29.97"`, `"47.952"`, `"59.94"`, `"119.88"`) or `{ num, den }`. The resolved composition carries the exact `rate` beside `fps`. The player shows drop-frame timecode at 29.97 and 59.94, and the export hands the encoder the exact fraction.
  
  Breaking: `fps={29.97}` as a number is 2997/100, not NTSC, and is now an error; run `uberscene lint --fix` to write `fps="29.97"`. A composition longer than 35,459 s (about 9.85 hours), or a `sampleRate` that does not divide into ticks, is an error. Code that builds a `ResolvedState` by hand adds `composition.rate`.

### Patch Changes

- c8d956f: An easing name inherited from `Object` (`toString`, `constructor`, `valueOf`) is no longer taken for an easing.
  `ease()`, `interpolate()` and the diagram parts' `progress()` read it off every object and returned a string or
  `null`, which broke the frame; they now ease linearly (`progress()` with its own `easeInOut`), as they already did for
  any other unknown name.
- 3e4e7c5: `narrate()` times and cues text in any script. A word's length counted only the letters a to z, so "Привет, друзья."
  was timed at about half its length and the subtitles ran twice as fast as the speech; letters (and their combining
  marks) in any alphabet count now. Cue names in `[brackets]` and `{braces}` take letters in any script too, so
  `[світло]` makes a cue and `.at("світло")` finds it.
- 3796367: `clamp01` and `round3` come from `@uberscene/kit/schema`, once, for the other packages; the kit's own copies use them.
- 472246e: - A shader that fails to compile is compiled once: later frames report the same error instead of building and leaking a new program every frame. Shaders and programs of a failed build are deleted.
  - WebGL contexts are given back: a painter or compositor that is disposed, or replaced on a size change, releases its context, and effect boxes keep at most four frame sizes at once.
  - Audio sources that fail to open, or cannot be decoded, are closed and not remembered, so a later play tries again; at most eight stay open.
  - Timecode at rates such as 12.5 fps counts frames within each second correctly (kit's new `secondAndFrame`).
- f81b912: Splitting a clip that animates gives each half a key at the cut with the value the clip had there, for keys on its transform, on its effects' params and on its speed, so neither half jumps; keys on an effect's params are now split and shifted like the clip's own. Undoing the split puts the clip back whole. Removing a transition, alone or with the clip it joined, carries what is anchored to it (a sound on the cut) to the clip it led into. A word-by-word title wraps inside its width like any title, with the spaces between its words.

## 0.5.0

### Minor Changes

- 4fac602: Three small helpers for free code that draws a board or happens in steps. `grid({ columns, rows, width, height, x, y })` is the geometry of a grid and draws nothing: it returns every cell with its index, column, row and box, and `rect(column, row)`. `stepAt(times, t)` says which step a moment has reached in a list of seconds. `random()` takes several keys, so `random("wall", cell, turn)` names one number among many; with one seed it gives what it always gave.
- 933fa0c: `<Layer ground>` marks a layer as a ground that other things sit on (a wall behind a game, a scrim under a title), so the layout check, `uberscene where` and `look --zones` treat it like a background. `<Three>` and `<Motion>` take it too. `uberscene inspect` prints `ground` on its line. This replaces the `data-ground` attribute on an element inside the layer, which is no longer read: a file that used it moves the marker to the `<Layer>`.
- 97d54f4: A video file may import modules of its own: `import { ChatReveal } from "./blocks/chat-reveal"`. Each is a `.ts` or `.tsx` file inside the project (the folder of the nearest `uberscene.json`), compiled and run like the file, once. `gatherLocalFiles(source, read)` collects their texts and `loadModule(source, { files })` runs them; the command line reads them from disk, refuses one outside the project, names a missing one with where it looked, passes them to the export page, and keys cached frames drawn by their code on their text.
- 24a2570: CutCraft is now UberScene. The packages are `uberscene` (the CLI, run as `npx uberscene`) and `@uberscene/kit`, `@uberscene/player`, `@uberscene/render` and `@uberscene/graphics`; change your imports from `@cutcraft/*`. The manifest is `uberscene.json`, and a `cutcraft.json` is still found. The environment variables are `UBERSCENE_*` instead of `CUTCRAFT_*`, and the caches move to `~/.cache/uberscene`.
- a8f1cd3: A file's `schema` values are knobs an editor and an agent can read. `knob.color()`, `knob.font()` and `knob.image()` mark a string that wants a colour picker, a font menu or an image picker; `.describe("…")` is the label; `z.enum` is a choice and a number's `.min()`/`.max()` bound it. `knobsOf(schema, values)` returns each with its key, kind, description, value, options and bounds. `uberscene inspect` lists them before the timeline, and `--json` has them as `knobs`. The recipes mark their colours and logos.
- 34c8b8a: `useSeekable(create, deps?)` plays an animation from another library on the layer's clock: built once, paused, on the element its ref is on, seeked to the layer's seconds before every frame is painted, and reverted (or destroyed, or killed) when the layer ends or `deps` change. A GSAP timeline fits as it is; Anime.js and Lottie take a two-line wrapper. A `seek` that returns a promise holds the export's frame until it settles.

### Patch Changes

- 546f81a: Writing edits back no longer fails when an element is moved and something inside it is also edited, such as reordering a track and changing the volume of a sound on it. The moved element is printed with those edits in it; before, the two edits overlapped and `foldToSource` threw "overlapping edits".

## 0.4.0

### Minor Changes

- 96799e4: Captions can sit at any height. `style={{ position: 0.6 }}` on `<Captions>` puts their middle 60% of the way down the frame; `top`, `center` and `bottom` work as before. Over a talking head in a vertical video, `center` lands on the speaker's mouth and `bottom` is under the platforms' controls; a number between puts the captions under the chin.
- 12fbb4e: Captions can be placed exactly: `x` and `y` on `<Captions>` are the middle of the captions in pixels from the
  frame's centre, `width` is the widest a line may be, and `align` is the side the lines sit against. `y` takes the
  place of `style.position`, which stays as the short form. The layout check's advice for captions names these.
- 22d44a7: Captions can box the word being said. `style={{ highlightBox: "#4aa3ff" }}` on `<Captions>` puts a filled, rounded box behind the current word with any word animation (`word-highlight`, `karaoke`, `word-by-word`); `highlight` stays the colour of its letters. The box takes no room of its own, so the line does not move as the box passes along it.
- b0f2630: Three components for a talking head cut into a short, and a way for a graphic to end with another element:
  
  - `TypeCard`: a card of big type that builds line by line. A line can sit on a pill, and a line can be struck out. Each line and strike takes `at="word:N"` (a word of the card's `anchor`) or an `offset` in seconds.
  - `QuoteCard`: a passage on a paper card with its source above it, and a marker that sweeps across the phrases you name, each at its own word or offset.
  - `Frame`: a rounded border around part of the picture, for the speaker under a card.
  - `duration={{ until: "id" }}` on any element outside a sequence: it lasts from its own start until that element ends. One that starts after its target has ended reports `INVALID_TIME_RANGE`.
  - Inside a `<Layer>`, the theme is now there as CSS variables (`var(--cc-accent)`, `var(--cc-heading)` and the rest). `Counter` read them already and was getting its fallbacks, so it now draws in the theme's heading font and text colour.
- 1f5e897: Parts for drawing a diagram inside a `<Layer>`: `DrawnLine` (a line that draws itself), `Label` (a word with a
  line to the point it names, named for the layout check), `CountUp` (a number that counts) and `Cells` (a row of
  cells with values). Each renders SVG and happens `at` a second of the video or `after` so many seconds of its
  layer, taking `over` seconds. `useProgress` and `progress` give the same timing to your own drawing.
- 9b27e92: Five new effects. `halftone` prints the picture as a dot screen, in one ink or in CMYK. `pixelate` makes a mosaic of the frame or of a box in it. `scanlines` adds the rolling lines of an old screen. `lightLeak` washes wandering warm light over the picture. `fractalNoise` blends evolving clouds of noise over it, as mist, texture or a moving background. They are shader effects with no CSS fallback, and every param keyframes. These names are now built in, so a file that declares its own effect under one of them needs to rename it.
- 06ad6a4: A font catalogue and `cutcraft fonts`. The kit exports `FONT_CATALOG` (the bundled families and a short list from Google Fonts, each with its category, weights, roles, a line on how it looks and its pairings), `findFont`, `fontsFor`, `nearestFont` and `fontFamily`. `cutcraft fonts` prints the list, filtered with `--for` and `--category`, and `--sheet` draws the families as one image setting your words. `googleFont()` now refuses a weight or an italic a listed family does not have, and the `font-available` lint gives the declaration to write.
- a12dd56: `font/use`, the action a font picker calls: it sets a family from the font catalogue on a title, the captions or a theme role. A Google family the file does not declare is loaded for the preview at once, and the fold writes its `googleFont()` declaration, adds the import and names it at the use site; a new weight of a declared family is added to its `weights`.
- 8cf667b: `audio/setDuck` takes a track role in `duck.under`, as a file does; it used to refuse anything but a track id. `<Multicam activeAngle>` and the `multicam/setActiveAngle` action are removed: nothing in the player or the export read the prop, so it changed nothing. A file that sets it now fails with an unrecognized key. `cutcraft inspect` names the element and the edge of a transition written with `on` and `edge`, where it printed `undefined → undefined`.
- 96b43b4: Free code runs on the video's clock in an export. The file's own `requestAnimationFrame` callbacks run once per frame with the frame's time, `performance.now()`, `Date.now()` and `new Date()` follow it, and `Math.random()` gives the same numbers in every export, so a loop written the usual way exports at the same speed on any machine. A Layer now holds CSS transitions and `element.animate()` animations at the layer's time as well as CSS animations, in the player and the export. `loadModule` takes a `scope` of names the file sees in place of globals. The `free-code-clock` lint warns about `Math.random()` (use `random(seed)`) and about `window.requestAnimationFrame`, `window.performance` and `window.Date`, which stay on the browser's clock.
- ad357a2: `cutcraft inspect video.tsx` reads a timeline back as text, with no browser: each track's elements with their seconds, the words each clip plays, effects, keyframes and cuts, or with `--json` as flat rows for `jq`. `--at` says what is on screen and heard at chosen moments, with effect values after keyframes. A moment is written the way the file is (`hook.end`, `x1`, `word:14`, `hook@word:14`, `shot:1`, `marker:intro`) or as time (`4.5`, `90f`, `2..6/0.5`). The kit exports what it is built from: `timelineRows`, `parseMoments`, `resolveMoments`, `playsOf` and `spokenWords`; `@cutcraft/render` exports `inspect` and `describeAt`.
- 4dbdc56: `cutcraft look --listen <stretch>` shows the sound of a stretch under the sheet's cells: the mix an export would write, as its level over time on a decibel scale, with a time scale, the words of the transcript where the cut says them, and silent stretches shaded. The stretch is `all`, a range such as `2..6` or `60f..180f`, or an element's id. The legend gains `listen`: the stretch, `peakDb` and `rmsDb` in dBFS (null for silence), `silences` (at least 0.3 s below -50 dBFS) and the words. The strip is kept in the frame cache under a key of the whole file and its media. `renderLook` takes `listen`, and the kit exports `listenRange`.
- fd5c06c: `cutcraft look video.tsx` draws many frames in one browser start, on one contact sheet with a JSON legend that says what each cell is. With no moments it skims the cut as an editor does (each clip's first frame, both sides of every cut, each overlay); `--at` takes the moments `inspect` takes, `--around <id>` follows a transition or an element coming in and going out, and `--without <id>` draws each frame with and without an effect, an adjustment or an overlay, side by side. The kit exports `aroundMoments` and `skimMoments`; `@cutcraft/render` exports `renderLook`.
- c425d5c: `narrate(script)` times a narration. In the script a word in square brackets is a cue, a number in round brackets
  a pause in seconds, and a name in curly brackets a cue with no word. It returns every word with its start and end,
  the subtitles a phrase at a time, the cues by name (`at(name)` throws on a name the script does not have) and the
  duration. The times come from a speaking pace, or from the transcript of a recorded voice.

### Patch Changes

- 98d38b7: The ready-made components take `duration={{ until: "id" }}`, as plain elements do. A `LowerThird`, `TypeCard` or any other component can now last until a clip ends, and every one of its parts ends there, however late the part comes in. Before, a component refused the prop with "duration Invalid input".
- 4fb0ebb: `cutcraft look --motion <stretch>` draws a short stretch as a strip of small frames at even steps, each labelled
  with its time, so a move, an entrance or a transition can be read left to right without a render. The stretch is a
  range or an element's id; `--step` sets the seconds between frames, twelve frames without it.
- f22acb1: The resolver no longer places anything at a time that is not a number, before zero, backwards or for ever, whatever the file says. Found by a new suite of 129 pinned edge cases and 3,000 timelines made at random:
  
  - A prop the schema refuses (a speed of 0, a negative duration or start, a prop the element does not take) is reported as before and then left out, so the element takes its default instead of the refused value.
  - A transition that does not fit is reported and held to what its clips have. Two transitions that would meet inside a short clip are now reported (`INSUFFICIENT_HANDLES`), and two transitions in a row report `NOT_ADJACENT`.
  - A `duration="fill"` clip or music bed shorter than the video stops where its file ends and reports `TRIM_PAST_SOURCE`, instead of claiming to play past the end of the file.
  - `duration={{ match }}` on an element that fills now takes its length instead of reporting a cycle.
  - A `<Freeze>` that starts after its clip has ended no longer lengthens the clip, and reports `INVALID_TIME_RANGE`. A speed key or a hold written past its clip's end no longer lengthens the video.
  - An element with no length no longer makes the video longer.
- 3da2e2a: `TypeCard` no longer confuses `cutcraft --check-layout`. The line a card part shows used to force itself visible, so it stayed on screen while the check hid everything else to measure one element, and every card was reported as covering the captions. A part now only hides the other lines, and a strike leaves its line's letters clear instead.

## 0.3.0

### Minor Changes

- e1e5bdb: Ready-made components: `LowerThird`, `Callout`, `Badge`, `Counter`, `ProgressBar`, `Arrow`, `Highlight` and
  `Background`, exported from `@cutcraft/kit`. Each is an ordinary function that returns the kit's own elements
  (titles, shapes, SVG, a layer for the counter), so it is timed by words, styled by the theme and checked like any
  element; its parts get ids from its own (`lt-name`). Editing a part in the editor writes that use out into the file as
  plain elements, imports included. `COMPONENTS` lists them with their props schemas. They replace the most used
  `<Graphic>` kinds, which stay deprecated.
- ee3a1e9: Declarations are values, not registrations: no global store. Breaking.
  
  - `effect()` and `transition()` return the definition itself (`EffectRef`, `TransitionRef`: `{ name, definition }`), and `font()` and `googleFont()` return a `FontRef` that stands for its family wherever a string goes (a `font` prop, a theme, a CSS `fontFamily`, a template string, JSON). Nothing is registered anywhere.
  - A tree's effects, transitions and fonts are collected from the elements that use them (however deep in a prop, and in a Layer's free code) and from the module's exports. Each file's declarations are its own, so many players on one page never share them, and a file imported directly (a bundled preview) needs no wrapper.
  - An effect or font the editor should offer before anything uses it must be exported. The `declaration` lint warns on one that is neither exported nor used.
  - The editor's fold writes a declared effect, transition or font back as its identifier: `type={glitch}`, `font={titan}`.
  - Two different definitions under one name are an error.
  - Removed: `collectShaders`, `shadersOf`, `MODULE_SHADERS`, `collectFonts`, `fontsOf`, `MODULE_FONTS`, and the stores on `globalThis`.
- 6ac1d41: A typed API for effects and transitions. Breaking:
  
  - `defineEffect()` and `defineTransition()` are now `effect()` and `transition()`. They take the same options and return the effect typed with its params schema (`EffectRef<P>`, `TransitionRef<P>`).
  - `<Effect>` and `<Transition>` check `type` and `params` at compile time: a built-in type against its registry schema, and what `effect()` or `transition()` returned against its own schema. A plain string is no longer accepted for a file's own effect; pass what `effect()` returned.
  - Shaders read their params as `params.<name>`, not by the bare name, so a param can take any name, a GLSL function's or an input's included. `effect()` refuses a shader that reads a param its schema does not declare. Update a shader by writing `params.` before each param it reads.
  - `longShadow`'s `reach` param is now `length`.
  - The `declaration` lint accepts `passes` as well as `shader`.
- ab5cec4: Colour effects for footage, drawn as shaders: `exposure` (stops), `vibrance`, `whiteBalance` (temperature and tint as a chromatic adaptation), `shadowsHighlights` (a local adjustment over a blurred luminance), `duotone` and `curves` (monotone splines through points, per channel). Effect params may now hold lists of points. A built-in shader can compute tables from its params (`ShaderDefinition.tables`). These names are now built in, so a file that declares its own effect under one of them (`duotone`, for example) needs to rename it.
- 4756002: Footage tools drawn as shaders: `colorKey` (green screen, with spill suppression), `regionBlur` (a feathered, rounded box, or everything but it), `cornerPin` (a perspective pin to four corners), `zoomBlur` and `chromaticAberration` (linear or radial). Keyframes now move lists of numbers element by element, so a box or a corner follows its keys. These names are now built in, so a file that declares its own effect under one of them needs to rename it.
- 1fdf930: Breaking: a keyframe that animates an effect param goes inside the `<Effect>`, with `param`: `<Effect id="plate" type="regionBlur"><Keyframe id="k1" param="box" at={0} value={[…]} /></Effect>`. `property="effect.<id>.<param>"` is removed, and its error shows the nested form. The resolver now checks that `param` is one of the effect's params and that the value fits it, where before a typo or a renamed effect detached the animation silently. `keyframe/add` takes `param` (on the effect) or `property` (on the element).
- bedea28: Grade with a LUT: `<Effect type="lut" params={{ src: "asset:look", amount }} />` reads a 3D `.cube` file, a new manifest asset kind `lut` that `cutcraft add look.cube` checks and lists. An effect param that names an asset is read by the shader as a texture (a LUT as a `sampler3D`, an image as a `sampler2D`), loaded before the frame that needs it. `parseCube` reads the format.
- 5b492f0: One way to do each thing. Breaking:
  
  - Temperature and tint are only `whiteBalance`. `<ColorGrade>` is removed, along with its `colorGrade.temperature` and `colorGrade.tint` keyframe paths and the `colorGrade/set` action. So are the `temperature` and `tint` effect types. Each old form is an error naming `<Effect type="whiteBalance" …>`. `whiteBalance` gains a CSS fallback where WebGL is missing (the old temperature and tint filters).
  - Every blur reads `radius` the same way. `blur` stays a CSS filter, and on an element whose effects run as shader passes it is the same Gaussian the shader effects use. A blur's `radius` is the Gaussian's standard deviation in pixels everywhere, as CSS reads it. `glow`, `regionBlur` and `shadowsHighlights` (and `bevel`'s `size`) used three times that: their defaults are now 7, 7, 10 and 1.5, and a radius written for them before blurs three times as much. Divide it by 3.
  - The built-ins share one Gaussian, which samples every pixel out to three deviations where the old one took 33 taps, so large blurs no longer band. It costs more: in the export without a GPU, `regionBlur` and `shadowsHighlights` render about 1.8x slower at the same look.
- 7e411a0: Effects can run several shader passes: `effect({ passes: [...] })` runs each in order, reading the pass before as `image` and the element's picture as `original`. `levels` is now drawn by a built-in shader, so its `gamma` renders; where there is no WebGL it falls back on the old filter. `ShaderDefinition.shader` is now `passes`, and a player `ShaderPass` carries `sources`.
- 7db2452: Every built-in effect and transition is now one entry in a registry (`EFFECTS`, `TRANSITIONS`, with `EFFECT_FAMILIES` and `TRANSITION_FAMILIES`): its name, a strict params schema, and how it draws. The type lists, shader lists, transition params and CSS fallbacks are derived from it, and the reference gains a generated page of every effect and transition with its params. Breaking: the CSS-type effects (`brightness`, `blur`, `shadow`, `vignette`…) now have params schemas, so an out-of-range or unknown param is an error, and the undocumented aliases `value` and `intensity` are gone (use `amount`, `radius` or `angle`). An unknown param on a shader effect is now an error too, where it was dropped.
- e7301f9: One scale per kind of value in the built-in effects and transitions (the reference's new Units table). Breaking: the old values are errors.
  
  - Strengths and shares are fractions. `brightness`, `contrast`, `saturation`, `temperature` and `tint` take `amount` -1..1 (was -100..100). `grayscale`, `sepia` and `invert` take 0..1 (default 1). `vignette` and `grain` take 0..1 (defaults 0.5 and 0.2). `whiteBalance` takes `temperature` and `tint` -1..1. `<ColorGrade>` takes `temperature` and `tint` -1..1.
  - `shadow` takes `radius` (was `blur`), and `color` as `#rgb`/`#rrggbb` with `opacity` 0..1 (was any CSS colour).
  - Pixel distances are named as such: `zoomBlur` `length` and `chromaticAberration` `distance` (both were `amount`), and `filmBurn` `size` (was `scale`).
  - Angles are degrees clockwise from up: `chromaticAberration` (default 90), `longShadow` (default 135) and `blinds` (default 90) used to count from the right.
  - `bevel` `intensity` is now `amount`, since `intensity` is kept for gains.
  - `clockWipe` `direction` is `"clockwise"`, `"counterclockwise"` or `"both"` (was 1, -1, 0). Its `feather` in degrees is now `softness`, a share of the turn. `blinds` and `pixelDissolve` rename `feather` to `softness`, with the same values.
- 4e5e3cb: Effects that shape an element by its silhouette, for titles, shapes, stickers, Layers and clips: `glow` (with a threshold and a bloom in the element's own colours, and a CSS fallback where the shader cannot run), `outline`, `longShadow` and `bevel`. These names are now built in, so a file that declares its own effect under one of them needs to rename it.
- ac13aea: Six built-in transitions drawn as shaders: `iris` (circle, polygon or star), `clockWipe`, `blinds`, `filmBurn`, `pixelDissolve` and `zoom`. They crossfade where there is no WebGL and fade at an overlay's edge. These names are now built in, so a file that declares its own transition under one of them needs to rename it.
- 5d99f1b: A faster Gaussian for every built-in blur.
  
  - `glow`, `regionBlur`, `shadowsHighlights` and `bevel` draw their blur at half size from 4 px of σ and at a quarter from 8 px, and read it back full size through linear filtering.
  - Each direction takes its taps in linear pairs once the colour is premultiplied, halving the reads.
  - `regionBlur`, unless inverted, blurs only its box and as far as the blur reaches.
  - CSS's `blur()` and `drop-shadow()`, run as passes, stay full size so the frame's edge fades as CSS's does, and take the paired taps.
  - Built-in definitions can now plan their passes as `steps` (a size and a region per pass). The kit exports `gaussSteps`, `gaussSources` and `gaussScale` in place of `GAUSS_PASS`.
  - In the export without a GPU, the `regionBlur` and `shadowsHighlights` bench goes from 0.6 to 6.6 fps.
- 40b5a9f: A run of colour effects is drawn as one pass.
  
  - Consecutive built-in colour effects on an element run as one shader that calls each one's function in file order: `levels`, `lut`, `exposure`, `vibrance`, `whiteBalance`, `duotone`, `curves`, and on the shader path brightness, contrast, invert, saturation, hue, sepia and grayscale. That is one read and one write of the picture instead of one per effect, with no 8-bit rounding between them.
  - A run breaks at any other effect, and at a second `whiteBalance` or `curves`.
  - Against separate passes, the result differs by at most 3 levels.
  - The kit exports `fusedColourSource`, and colour transforms keep their function in parts (`ColourFunction`: `fn`, `uses`, `prelude`, `code`).
- 3847609: A faster `outline` and `zoomBlur`, and a `glow` that keeps its element's colours.
  
  - `outline` measures the exact distance to the silhouette in a pass down each column and one along each row: about 34 reads per pixel at the default width instead of 288. Its corners round as a circle's, and its outer edge fades over one pixel.
  - `zoomBlur` takes one sample per pixel of each pixel's streak, at least 2 and at most `samples`.
  - `glow` is a halo under its element, which keeps its own colours inside; it used to add its light on top, washing a white glow on white text to a flat blob. With a `threshold` it also blooms over the bright parts, as before on footage.
  - In the export without a GPU, outline and glow on footage go from 0.3 to 3.0 fps, and a zoom blur from 2.8 to 3.5.
- fa7c303: `<Graphic>` and its 34 kinds are removed (decision 0024), with the `graphic/*` actions, the `graphic-props` and
  `deprecated-graphic` lint rules and `graphicControls`. A file that still uses `<Graphic>` gets an error naming what
  replaces it. Use the components in `@cutcraft/kit`:
  
  | Was | Now |
  |---|---|
  | `kind="lower-third"`, `-card`, `-split` | `<LowerThird>` |
  | `callout`, `speech-bubble` | `<Callout>` |
  | `badge`, `pill` | `<Badge>` |
  | `counter` | `<Counter>` |
  | `progress-bar` | `<ProgressBar>` |
  | `arrow`, `curved-arrow`, `hand-arrow` | `<Arrow>` |
  | `underline`, `marker`, `circle-scribble`, `strike` | `<Highlight>` |
  | `gradient-`, `dots-`, `grid-background` | `<Background>` |
  
  The other kinds have no component: draw them as free code (`<Svg>`, `<Motion>`, a `<Layer>`).
  
  `<Sticker src>` takes an image asset; `icon:` stickers are removed, and Lucide with them (about 0.7 MB out of every
  bundle). Draw an icon as an `<Svg>`. `@cutcraft/graphics` now holds only the free-code libraries
  (`installFreeCodeLibraries`, `/three`, `/motion`), and the kit and the player no longer depend on it.
  `GRAPHIC_ANIMATIONS` is renamed `ENTRANCE_ANIMATIONS`: they are every overlay's entrances and exits.
  
  The export also waits for an overlay's image or SVG file before it captures a frame, so a still of a sticker shows
  the image rather than nothing.
- e9107f6: Effects that change nothing are skipped, and the built-ins share their shapes.
  
  - A built-in effect at its neutral params is not drawn: `exposure` at 0 stops, `levels` at 0, 1 and 1, an amount at 0, a curve on the diagonal. If those are an element's only shader effects, it stays off the WebGL path. The check uses each frame's params, so a keyframed amount is skipped only where it passes through neutral. Each neutral is proven by a render test, and the kit exports `isNeutral(type, params)`.
  - The colour built-ins (`levels`, `lut`, `exposure`, `vibrance`, `whiteBalance`, `duotone`, `curves`) are colour transforms: a function of colour alone, kept on the definition so a run of them can be fused later.
  - `iris`, `clockWipe`, `blinds` and `pixelDissolve` are mask transitions.
  - Output is unchanged.
- 41e9b6b: Shader uniforms are typed by the params schema, once, instead of by each frame's values.
  
  - A `z.enum` param now reaches a shader as an `int`, and the shader names its options: `params.direction == params.direction.clockwise`. `clockWipe` uses this, and the built-in `uniforms` hook is gone.
  - `effect()` refuses a shader that reads a param no uniform can carry (a list of points, say), naming it.
  - Definitions carry `uniforms` (`ShaderUniform`, `uniformsOf`), and passes carry them to the player.
  - The player builds a program's text once, keeps it by source and declared types, and looks up each uniform's location once.
  - Shared GLSL in the built-ins is a module, placed once with its dependencies.
  - The output is unchanged.

### Patch Changes

- 8a0f302: Vignette and grain on an `<Adjustment>` are drawn: they darken and speckle everything beneath it, before its other
  effects, in the preview and the export. Before, they drew nothing. On an overlay (a title, shape, SVG, sticker,
  graphic or layer) they are still not drawn; the `not-rendered` lint now reports that, and the preview warns once.

## 0.2.0

### Minor Changes

- [#13](https://github.com/prefix-tree/cutcraft/pull/13) [`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f) Thanks [@bsnisar](https://github.com/bsnisar)! - The kit's `holdLayerFrame` lets an engine layer (three.js, Motion) hold a frame until it has drawn it, so an export
  never captures a frame half drawn. `loadVideo` returns the file's `source`, which the export page loads.

- [#18](https://github.com/prefix-tree/cutcraft/pull/18) [`a7965d3`](https://github.com/prefix-tree/cutcraft/commit/a7965d3b766a4570026d7cde47f5e6525895dc3a) Thanks [@bsnisar](https://github.com/bsnisar)! - Fonts are declared in the file: `font({ family, src: "asset:brand" })` for a font file and `googleFont("Titan One")` for a Google Fonts family, each returning the family to pass as a `font` prop, a theme font or a CSS `fontFamily`. The player and the export load every declared face (`state.fonts`), WOFF2 included; the export downloads Google faces once into `~/.cache/cutcraft/fonts`, so later exports need no network. The `declaration` lint checks the calls, and `font-available` takes declared families as available.

- [#14](https://github.com/prefix-tree/cutcraft/pull/14) [`57f969f`](https://github.com/prefix-tree/cutcraft/commit/57f969fe2a316d3c70b76738eaf1eada043b3d7a) Thanks [@bsnisar](https://github.com/bsnisar)! - `<Graphic>` and its kinds are deprecated and will be removed in a later release. The lint warns on each one with the
  new `deprecated-graphic` rule, and `Graphic`, `GRAPHIC_KINDS` and `graphicControls` are marked `@deprecated`. Draw the
  same things with `<Motion>`, `<Three>` or a `<Layer>`; the examples and the brand-spot recipe show how.

- [#20](https://github.com/prefix-tree/cutcraft/pull/20) [`83664f3`](https://github.com/prefix-tree/cutcraft/commit/83664f327df1e106685132199f2d0506b42609ad) Thanks [@bsnisar](https://github.com/bsnisar)! - `<Composition motionBlur={{ shutterAngle: 180, samples: 8 }}>` gives the export a film camera's motion blur: the export draws each frame `samples` times across the open shutter and averages them, for footage, titles, Motion, three.js and free code alike. The preview stays sharp. The player's `exactTime` option re-renders overlays for every change of time, which the export uses for the moments inside a frame.

- [#24](https://github.com/prefix-tree/cutcraft/pull/24) [`f5cd9c7`](https://github.com/prefix-tree/cutcraft/commit/f5cd9c7b7dd1433bb1eff2e2346594baacc9d01e) Thanks [@bsnisar](https://github.com/bsnisar)! - Effects the file declares (`defineEffect()`) work on overlays too: titles, shapes, SVG, stickers and any `<Layer>`, including `<Three>` and `<Motion>`. The player draws the overlay into a canvas with HTML-in-Canvas, runs the shaders over it and shows the result; a browser without the feature shows the overlay without them and warns, and the export always draws them. `<Effect>` and `<Keyframe>` written inside a `<Layer>` are collected as its children, apart from its free code. A title with an `<Effect>`, `<Keyframe>` or `<Mask>` child keeps its text (it was lost before).

- [#21](https://github.com/prefix-tree/cutcraft/pull/21) [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22) Thanks [@bsnisar](https://github.com/bsnisar)! - What a file can say is what renders. Types and props no renderer drew are removed instead of accepted and warned about: 18 transition types (zoom, glitch, whipPan…), 6 video effects (sharpen, glow, motion-blur, radial-blur, chromatic-aberration, hue-saturation), `<AudioEffect>` and its actions, 16 title animation presets, the `bounce` caption animation, `emphasis`, 3D transform fields and keyframe properties, path keyframes, keyframe `handles` and `roving`, `chromaKey`, `stabilize`, `smoothSlowMo`, `interpolation`, `pitchCorrection`, `audioTrack`, `behindSubject`, `text3d`, an adjustment's `affects`, matte masks, colour wheels, curves, LUTs and HSL bands, and the wipe's `softness` and diagonal direction. A file that uses one now fails to resolve with the prop named, and TypeScript flags it in the editor. The OpenReel parity table and test are gone.

- [#21](https://github.com/prefix-tree/cutcraft/pull/21) [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22) Thanks [@bsnisar](https://github.com/bsnisar)! - Effects and transitions of your own: `defineEffect({ name, params, shader })` and `defineTransition({ name, params, shader })` declare a GLSL function and a zod schema for its params, and return the name to use as an `<Effect>` or `<Transition>` type. Params are validated and given defaults by the schema, keyframable, and passed to the shader as uniforms; transitions get both pictures and their progress. The player draws them with WebGL 2 in any browser, in the preview and the export. The `declaration` lint checks that they sit at the top of the file with a literal `name` and `shader`.

- [#7](https://github.com/prefix-tree/cutcraft/pull/7) [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd) Thanks [@bsnisar](https://github.com/bsnisar)! - `<Three>` and `<Motion>`: a Layer can hold a three.js scene (through React Three Fiber, or plain three.js in `setup`)
  or a Motion sequence, both on the video's clock, so they scrub both ways. `@cutcraft/graphics/libraries`
  (`installFreeCodeLibraries`), `@cutcraft/graphics/three` and `@cutcraft/graphics/motion` offer them to a cut file's
  free code. The export draws them as the player does. CSS animations inside a `<Layer>` are held at the layer's time:
  they count from the layer's start, pause with the video and scrub both ways.

- [#19](https://github.com/prefix-tree/cutcraft/pull/19) [`47b40b0`](https://github.com/prefix-tree/cutcraft/commit/47b40b0fc69a3c338ef44c252bcc193fc505abad) Thanks [@bsnisar](https://github.com/bsnisar)! - `cutcraft add talk.mp4` writes a media file's manifest entry, probed from the file, with its words from the transcript beside it (`talk.json` from Whisper or ElevenLabs, `talk.vtt`, `talk.srt`). `parseTranscript()` reads the same formats in code; words from subtitles are marked `estimated`. `--srt` and `--vtt` write the captions the cut plays as subtitle files, and `subtitles(state, …)` returns them in code. `<Captions breakAfter={["word:5"]}>` ends a line after the named words.

### Patch Changes

- [#26](https://github.com/prefix-tree/cutcraft/pull/26) [`7130e8c`](https://github.com/prefix-tree/cutcraft/commit/7130e8cf75b2c8e026f3e8950400f8106adbe98c) Thanks [@bsnisar](https://github.com/bsnisar)! - The export runs the real player in headless Chrome, so it draws everything the preview draws: any CSS in a `<Layer>`,
  three.js, Motion, declared shaders and motion blur. The first export downloads Chrome for Testing into
  `~/.cache/cutcraft/browsers`; `cutcraft browser install` does it ahead of time, and `CUTCRAFT_CHROMIUM` names your own.
  The Node renderer is gone, and with it `skia-canvas`, `satori` and `node-av`: there is no native module to install.
  
  - Formats: MP4 (H.264 or AV1, with AAC), WebM (VP9 or AV1, with Opus), MP3, WAV, and PNG or JPEG stills. `.mov`
    (ProRes), HEVC and VP8 are no longer written.
  - The soundtrack is mixed and encoded in the page; the layout check measures each overlay as the export draws it.
  - `renderVideo`, `renderStill` and `checkLayout` take `source` (from `loadVideo`), which is required; `interiors`,
    `parallel`, `speed` and `hardware` are removed, and `tabs` renders pieces on several browser pages.
    `loadVideo` no longer returns `interiors`, and `OverlayFont` is now `FontFile`.
  - CLI: `--workers`, `--speed` and `--software` are removed; `--tabs` and `cutcraft browser install` are new;
    `--codec` takes `avc`, `vp9` or `av1`.
  - `@cutcraft/player` no longer exports `@cutcraft/player/overlays`, which only the Node renderer used.

- [#24](https://github.com/prefix-tree/cutcraft/pull/24) [`f5cd9c7`](https://github.com/prefix-tree/cutcraft/commit/f5cd9c7b7dd1433bb1eff2e2346594baacc9d01e) Thanks [@bsnisar](https://github.com/bsnisar)! - `defineEffect()` and `defineTransition()` refuse a param named after a GLSL built-in function (`mix`, `step`, `length`…) or a shader input, with a message naming it; before, the shader failed to compile with an unclear error.

- [#8](https://github.com/prefix-tree/cutcraft/pull/8) [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e) Thanks [@bsnisar](https://github.com/bsnisar)! - Every package has a README written for its users, with links to the documentation site that work on npm.
  The graphics README leads with three.js and Motion, its deprecated `<Graphic>` kinds below.
- Updated dependencies [[`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f), [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e), [`57f969f`](https://github.com/prefix-tree/cutcraft/commit/57f969fe2a316d3c70b76738eaf1eada043b3d7a), [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd)]:
  - @cutcraft/graphics@0.2.0
