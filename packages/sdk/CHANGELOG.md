# @uberscene/sdk

## 0.6.0

### Minor Changes

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
- 2daa802: A param's name now always says its scale. The zoom transition's `blur`, a strength from 0 to 1, is now `smear`, and the scanlines effect's `thickness`, a share of the spacing from 0 to 1, is now `coverage`. So `blur` and `thickness` are pixels wherever they appear. An old name is an error that names the new one, and `uberscene lint --fix` renames it, as for the other 0.6 renames.
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

- c8d956f: A long anchor chain is no longer reported as a cycle. Elements timed off other elements were placed in at most 32
  passes, so 40 titles each starting where the one before ends, written last first, left the last 8 with a false `CYCLE`
  error at 0 s, and an edit that made such a chain longer was refused. The passes now run until one places nothing, at
  most one per element, so a chain of any length is placed and a real cycle is still reported.
- e410297: A composition written with an id of its own (`<Composition id="intro">`) can be edited. Its settings, fonts and markers
  are addressed as `"composition"`, but the composition took the id the file gave it, so `composition/updateSettings`,
  `font/use` and the rest were refused with `element "composition" does not exist`. The composition is now always
  `"composition"` to the resolver and the fold, and the file keeps the id it was written with.
- 208c96c: Two fixes found by the editor's end-to-end tests:
  
  - Undoing a delete writes the element back with the indent of its first line. Any element moved to a new place in the
    file lost it before.
  - A trim of an element without a source writes the edge it was given: trimming a title that starts at 3 to end at
    6.267 writes `duration={3.267}`, not `duration={3.2670000000000003}`.
- 6e711ad: Two save fixes:
  
  - Saving no longer fails after an element is edited and its track then deleted. The fold wrote the edit and the
    track's removal over the same text and threw `overlapping edits`; any edit inside removed text now goes with it.
  - A title with a line break, an entity such as `&amp;`, or spaces at either end is written in braces, so the file
    reads it back as typed. Plain JSX text joined the lines into one and decoded `&amp;` to `&`.
- 3796367: The `"move"` source edit kind is gone: nothing made one. Times are rounded by the kit's `round3`.
- 7dee501: Undoing a delete and then saving no longer writes the element into the file twice. An element put back as the file has it keeps its own text, so a Layer's component, a function prop or a binding comes back as written; one that changed before it was deleted is written once, in its new form. Elements put back after the same sibling are written in the order the timeline shows them.
  
  Saving no longer changes the edit history it saves. A save used to take a settings change (`defaults`) and the fonts a picker asked for out of the history, so a second save, or a save that first had to write out a generated element, left them out.
  
  Title text is written so the file reads it back as typed. Text with a brace or an angle bracket, such as `{50%}`, `a } b` or `x > y`, used to make the save fail or leave a file that did not compile; it is now written as a string in braces.
  
  A save with new settings and an edit to a prop bound to them, such as the colour of a title written `color={accent}`, no longer fails with overlapping edits. The edited value goes into the one rewrite of `export const defaults`.
  
  Strings with `&` are saved as they are. JSX reads HTML entities in an attribute string, so SVG content with `A &amp; B` used to come back as `A & B`. A string that an attribute cannot hold as it is, with an `&`, a quote, a backslash, a newline, a brace or an angle bracket, is now written in braces.
- 472246e: - A split must leave at least one frame on each side, and the times it writes are rounded, with no float noise.
  - Folding edits back into a file re-reads its imports only when the edits need them, which makes dragging faster on long files.
- e410297: `trimValue(item, at)` gives the value `clip/trim` takes for an edge moved to timeline time `at`: the edge's time in the
  source file for footage, at the clip's speed, and `at` itself for anything else. The shadcn editor's inspector typed a
  duration as a timeline time even for footage, so a clip starting at 10 with `in={2}` given a duration of 3 became 11 s
  long; its Duration field and the timeline's edge drags now both go through `trimValue`.
- Updated dependencies [28bdc58]
- Updated dependencies [68c7b7c]
- Updated dependencies [cf23cb8]
- Updated dependencies [327d103]
- Updated dependencies [0800d5e]
- Updated dependencies [71e136e]
- Updated dependencies [c8d956f]
- Updated dependencies [fa69b88]
- Updated dependencies [89e5b4b]
- Updated dependencies [efb3f7f]
- Updated dependencies [974c884]
- Updated dependencies [261d5b6]
- Updated dependencies [3e4e7c5]
- Updated dependencies [3796367]
- Updated dependencies [2ebd6a9]
- Updated dependencies [2daa802]
- Updated dependencies [f654ff7]
- Updated dependencies [fd3e555]
- Updated dependencies [23f68a7]
- Updated dependencies [472246e]
- Updated dependencies [f81b912]
- Updated dependencies [45aabbd]
- Updated dependencies [41f2ced]
  - @uberscene/kit@0.6.0
