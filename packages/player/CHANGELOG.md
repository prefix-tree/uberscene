# @uberscene/player

## 0.6.1

### Patch Changes

- The first 0.6 on npm. 0.6.0 was tagged but never published: its GitHub release was published before the native codecs were attached, and the repository's releases cannot be changed once published. 0.6.1 holds everything 0.6.0 lists, with its codecs attached; the release is now kept a draft until its packages are staged.
- Updated dependencies
  - @uberscene/kit@0.6.1
  - @uberscene/sdk@0.6.1

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
- b80a44b: New package `@uberscene/editor`: editor parts that share one player and can sit anywhere in a page:
  `<Editor.Root>`, `<Editor.Preview>`, `<Editor.Controls>`, `<Editor.Layers>` and `<Editor.Timeline>`, with
  `useSelection()` and `useEdit()` for undoable edits through the sdk's `Executor`. The player splits `<Player>` into
  `<PlayerProvider>` (the core) and `<PlayerView>` (the picture); `<Player>` is unchanged.
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
- 23f68a7: The main entry exports what an app uses: `Player` and its props and ref, `PlayerCore`, `Controls`, the hooks, the events, `MediaResolver` and the font loader. `@uberscene/player/engine` lists the frame and audio plans, the compositor, painter, decoder pool and sources a renderer needs, instead of re-exporting every module. Warnings start with `[uberscene]`. The player now takes its resolver and actions from `@uberscene/sdk`.
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

- 9cfd718: A clip whose sound starts in the middle of a WebM (Opus) file now plays and exports where the file has it. It was 1 ms late, half a cycle of a 440 Hz tone, because WebM rounds block times to the millisecond and Mediabunny shifts Opus by its rounded codec delay. The preview's audio and the export's mix now decode from 120 ms before the range, so the decoder settles, and place each block on the grid its stream's blocks start on.
- f654ff7: An element whose `box.x` or `box.y` has keys keeps its box's `width` and `height` while it moves. They were dropped, so a clip sliding across the frame in a 9:16 box filled the whole frame instead.
- 71e136e: A Motion sequence's steps placed later with `at`, and its fades, draw again in a still, a `look` and a piece of an export that starts inside the layer: the layer's animation hold leaves alone the animations a library already drives on the video's clock.
- 3796367: The player's `ease` reads easings through the kit's `easingCurve`, so a name every object inherits (`"valueOf"`) is drawn linear with a warning instead of throwing. The unused `filterString` and `hasKeyframes` are gone, and the audio envelope is read by one function.
- 3e4e7c5: Two player fixes:
  
  - A player that makes its own `AudioContext` now closes it on `dispose()`. Each remount (a media change, React
    StrictMode, switching projects) left one open, and browsers refuse new contexts past their limit. A context passed in
    as `audioContext` is still the caller's to close.
  - An `<Svg>` tint reads its colour as CSS does. A name such as `red` came out grey, `rgb(100%, 0%, 0%)` dark red and
    `hsl(...)` white; the tint now uses the same colour reading as the filters.
- 49ed5eb: Reverse playback decodes every frame again. Each reverse window kept only its newest frames but counted the whole second as loaded, so about half of every second showed one stale frame, in the preview and in exports.
  
  A frame that fails to decode is now reported. A clip whose frame could not be decoded used to leave the picture frozen with no error, and an export went on repeating the last frame. The player now sends an `error` event naming the clip and its asset, and the export's frame step fails with that error, so the render stops and says which frame and clip failed.
- 472246e: - A shader that fails to compile is compiled once: later frames report the same error instead of building and leaking a new program every frame. Shaders and programs of a failed build are deleted.
  - WebGL contexts are given back: a painter or compositor that is disposed, or replaced on a size change, releases its context, and effect boxes keep at most four frame sizes at once.
  - Audio sources that fail to open, or cannot be decoded, are closed and not remembered, so a later play tries again; at most eight stay open.
  - Timecode at rates such as 12.5 fps counts frames within each second correctly (kit's new `secondAndFrame`).
- f81b912: Splitting a clip that animates gives each half a key at the cut with the value the clip had there, for keys on its transform, on its effects' params and on its speed, so neither half jumps; keys on an effect's params are now split and shifted like the clip's own. Undoing the split puts the clip back whole. Removing a transition, alone or with the clip it joined, carries what is anchored to it (a sound on the cut) to the clip it led into. A word-by-word title wraps inside its width like any title, with the spaces between its words.
- 6e711ad: An SVG from someone else can no longer run script on the page. Its cleaning matched tag and attribute names by exact
  spelling, while the page's HTML parser reads `<foreignobject>`, `<IFRAME>` and `HREF` as the real thing: an SVG with
  `<foreignobject><IFRAME srcdoc="…">` or a `javascript:` link in `HREF` kept them. Names are now compared in lower
  case without their namespace prefix, `src`, `srcdoc` and form actions are dropped, and a `<STYLE>` element or `STYLE`
  attribute is cleaned as the lower-case ones are.
- Updated dependencies [c8d956f]
- Updated dependencies [28bdc58]
- Updated dependencies [68c7b7c]
- Updated dependencies [cf23cb8]
- Updated dependencies [327d103]
- Updated dependencies [0800d5e]
- Updated dependencies [71e136e]
- Updated dependencies [e410297]
- Updated dependencies [c8d956f]
- Updated dependencies [208c96c]
- Updated dependencies [fa69b88]
- Updated dependencies [89e5b4b]
- Updated dependencies [6e711ad]
- Updated dependencies [efb3f7f]
- Updated dependencies [974c884]
- Updated dependencies [261d5b6]
- Updated dependencies [3e4e7c5]
- Updated dependencies [3796367]
- Updated dependencies [3796367]
- Updated dependencies [2ebd6a9]
- Updated dependencies [2daa802]
- Updated dependencies [f654ff7]
- Updated dependencies [fd3e555]
- Updated dependencies [7dee501]
- Updated dependencies [23f68a7]
- Updated dependencies [472246e]
- Updated dependencies [472246e]
- Updated dependencies [f81b912]
- Updated dependencies [45aabbd]
- Updated dependencies [41f2ced]
- Updated dependencies [e410297]
  - @uberscene/sdk@0.6.0
  - @uberscene/kit@0.6.0

## 0.5.0

### Minor Changes

- 24a2570: CutCraft is now UberScene. The packages are `uberscene` (the CLI, run as `npx uberscene`) and `@uberscene/kit`, `@uberscene/player`, `@uberscene/render` and `@uberscene/graphics`; change your imports from `@cutcraft/*`. The manifest is `uberscene.json`, and a `cutcraft.json` is still found. The environment variables are `UBERSCENE_*` instead of `CUTCRAFT_*`, and the caches move to `~/.cache/uberscene`.

### Patch Changes

- Updated dependencies [546f81a]
- Updated dependencies [4fac602]
- Updated dependencies [933fa0c]
- Updated dependencies [97d54f4]
- Updated dependencies [24a2570]
- Updated dependencies [a8f1cd3]
- Updated dependencies [34c8b8a]
  - @uberscene/kit@0.5.0

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
- 96b43b4: Free code runs on the video's clock in an export. The file's own `requestAnimationFrame` callbacks run once per frame with the frame's time, `performance.now()`, `Date.now()` and `new Date()` follow it, and `Math.random()` gives the same numbers in every export, so a loop written the usual way exports at the same speed on any machine. A Layer now holds CSS transitions and `element.animate()` animations at the layer's time as well as CSS animations, in the player and the export. `loadModule` takes a `scope` of names the file sees in place of globals. The `free-code-clock` lint warns about `Math.random()` (use `random(seed)`) and about `window.requestAnimationFrame`, `window.performance` and `window.Date`, which stay on the browser's clock.

### Patch Changes

- d597a1e: A title or captions set in a font whose name has a word starting with a digit ("Source Sans 3", "Exo 2", "Press Start 2P") drew in the browser's default serif face, in the preview and in an export. The family is now written into CSS in quotes.
- 0760cb9: An overlay with a shader effect keeps its place in the page while that effect is at a value that changes nothing. Before, the overlay's content was made anew at the first frame the effect did something: a `<Three>` scene was set up a second time in the middle of the video, and the export captured that frame before the new scene had drawn, so the scene was missing from one frame. The box that runs an overlay's shaders now also waits for a three.js canvas inside it to draw before it takes the picture. A canvas inside the box is also given one more paint before the picture is taken: a contact sheet, which asks for frames out of order, showed a three.js scene under an effect as it was at the frame asked for before.
- Updated dependencies [96799e4]
- Updated dependencies [12fbb4e]
- Updated dependencies [22d44a7]
- Updated dependencies [b0f2630]
- Updated dependencies [98d38b7]
- Updated dependencies [1f5e897]
- Updated dependencies [9b27e92]
- Updated dependencies [06ad6a4]
- Updated dependencies [a12dd56]
- Updated dependencies [8cf667b]
- Updated dependencies [96b43b4]
- Updated dependencies [ad357a2]
- Updated dependencies [4dbdc56]
- Updated dependencies [4fb0ebb]
- Updated dependencies [fd5c06c]
- Updated dependencies [c425d5c]
- Updated dependencies [f22acb1]
- Updated dependencies [3da2e2a]
  - @cutcraft/kit@0.4.0

## 0.3.0

### Minor Changes

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
- 4b3d65d: Breaking: an element's effects now run in the order the file writes them. Before, every shader effect ran before every CSS-type effect (`brightness`, `contrast`, `saturation`, `hue`, `sepia`, `grayscale`, `invert`, `blur`, `shadow`, `temperature`, `tint`, `<ColorGrade>`) on clips, nested sequences and adjustments, and after them on overlays. When an element has a shader effect or a shader transition, its CSS-type effects now run as shader passes in their place, each matching Chrome's own filter within a step or two (blur within a few levels, being the true Gaussian where Chrome approximates). A shader transition no longer applies the incoming clip's CSS effects to the outgoing clip. An element with CSS-type effects only still draws them as one CSS filter.
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
- Updated dependencies [e1e5bdb]
- Updated dependencies [ee3a1e9]
- Updated dependencies [6ac1d41]
- Updated dependencies [ab5cec4]
- Updated dependencies [4756002]
- Updated dependencies [1fdf930]
- Updated dependencies [bedea28]
- Updated dependencies [5b492f0]
- Updated dependencies [7e411a0]
- Updated dependencies [7db2452]
- Updated dependencies [e7301f9]
- Updated dependencies [4e5e3cb]
- Updated dependencies [ac13aea]
- Updated dependencies [5d99f1b]
- Updated dependencies [40b5a9f]
- Updated dependencies [3847609]
- Updated dependencies [fa7c303]
- Updated dependencies [e9107f6]
- Updated dependencies [41e9b6b]
- Updated dependencies [8a0f302]
  - @cutcraft/kit@0.3.0

## 0.2.0

### Minor Changes

- [#18](https://github.com/prefix-tree/cutcraft/pull/18) [`a7965d3`](https://github.com/prefix-tree/cutcraft/commit/a7965d3b766a4570026d7cde47f5e6525895dc3a) Thanks [@bsnisar](https://github.com/bsnisar)! - Fonts are declared in the file: `font({ family, src: "asset:brand" })` for a font file and `googleFont("Titan One")` for a Google Fonts family, each returning the family to pass as a `font` prop, a theme font or a CSS `fontFamily`. The player and the export load every declared face (`state.fonts`), WOFF2 included; the export downloads Google faces once into `~/.cache/cutcraft/fonts`, so later exports need no network. The `declaration` lint checks the calls, and `font-available` takes declared families as available.

- [#20](https://github.com/prefix-tree/cutcraft/pull/20) [`83664f3`](https://github.com/prefix-tree/cutcraft/commit/83664f327df1e106685132199f2d0506b42609ad) Thanks [@bsnisar](https://github.com/bsnisar)! - `<Composition motionBlur={{ shutterAngle: 180, samples: 8 }}>` gives the export a film camera's motion blur: the export draws each frame `samples` times across the open shutter and averages them, for footage, titles, Motion, three.js and free code alike. The preview stays sharp. The player's `exactTime` option re-renders overlays for every change of time, which the export uses for the moments inside a frame.

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

- [#24](https://github.com/prefix-tree/cutcraft/pull/24) [`f5cd9c7`](https://github.com/prefix-tree/cutcraft/commit/f5cd9c7b7dd1433bb1eff2e2346594baacc9d01e) Thanks [@bsnisar](https://github.com/bsnisar)! - Effects the file declares (`defineEffect()`) work on overlays too: titles, shapes, SVG, stickers and any `<Layer>`, including `<Three>` and `<Motion>`. The player draws the overlay into a canvas with HTML-in-Canvas, runs the shaders over it and shows the result; a browser without the feature shows the overlay without them and warns, and the export always draws them. `<Effect>` and `<Keyframe>` written inside a `<Layer>` are collected as its children, apart from its free code. A title with an `<Effect>`, `<Keyframe>` or `<Mask>` child keeps its text (it was lost before).

- [#27](https://github.com/prefix-tree/cutcraft/pull/27) [`e5e2ef0`](https://github.com/prefix-tree/cutcraft/commit/e5e2ef0ff232c254285dc1de074d4119af3b8cc4) Thanks [@bsnisar](https://github.com/bsnisar)! - The player drops what only the removed Node renderer used: `Frame.paintFull` and `Frame.prepare`, the
  `FrameSourceHooks` argument of `mediabunnyFrameSourceFactory`, and the `intercept` argument of `Compositor.step`. A
  `path` media handle given to the player now fails with a message asking for a URL. `cutcraft browser install` keeps a
  Chrome already in the cache and no longer contacts the network for it.

- [#21](https://github.com/prefix-tree/cutcraft/pull/21) [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22) Thanks [@bsnisar](https://github.com/bsnisar)! - What a file can say is what renders. Types and props no renderer drew are removed instead of accepted and warned about: 18 transition types (zoom, glitch, whipPan…), 6 video effects (sharpen, glow, motion-blur, radial-blur, chromatic-aberration, hue-saturation), `<AudioEffect>` and its actions, 16 title animation presets, the `bounce` caption animation, `emphasis`, 3D transform fields and keyframe properties, path keyframes, keyframe `handles` and `roving`, `chromaKey`, `stabilize`, `smoothSlowMo`, `interpolation`, `pitchCorrection`, `audioTrack`, `behindSubject`, `text3d`, an adjustment's `affects`, matte masks, colour wheels, curves, LUTs and HSL bands, and the wipe's `softness` and diagonal direction. A file that uses one now fails to resolve with the prop named, and TypeScript flags it in the editor. The OpenReel parity table and test are gone.

- [#21](https://github.com/prefix-tree/cutcraft/pull/21) [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22) Thanks [@bsnisar](https://github.com/bsnisar)! - Effects and transitions of your own: `defineEffect({ name, params, shader })` and `defineTransition({ name, params, shader })` declare a GLSL function and a zod schema for its params, and return the name to use as an `<Effect>` or `<Transition>` type. Params are validated and given defaults by the schema, keyframable, and passed to the shader as uniforms; transitions get both pictures and their progress. The player draws them with WebGL 2 in any browser, in the preview and the export. The `declaration` lint checks that they sit at the top of the file with a literal `name` and `shader`.

- [#7](https://github.com/prefix-tree/cutcraft/pull/7) [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd) Thanks [@bsnisar](https://github.com/bsnisar)! - `<Three>` and `<Motion>`: a Layer can hold a three.js scene (through React Three Fiber, or plain three.js in `setup`)
  or a Motion sequence, both on the video's clock, so they scrub both ways. `@cutcraft/graphics/libraries`
  (`installFreeCodeLibraries`), `@cutcraft/graphics/three` and `@cutcraft/graphics/motion` offer them to a cut file's
  free code. The export draws them as the player does. CSS animations inside a `<Layer>` are held at the layer's time:
  they count from the layer's start, pause with the video and scrub both ways.

### Patch Changes

- [#8](https://github.com/prefix-tree/cutcraft/pull/8) [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e) Thanks [@bsnisar](https://github.com/bsnisar)! - Every package has a README written for its users, with links to the documentation site that work on npm.
  The graphics README leads with three.js and Motion, its deprecated `<Graphic>` kinds below.
- Updated dependencies [[`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f), [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e), [`a7965d3`](https://github.com/prefix-tree/cutcraft/commit/a7965d3b766a4570026d7cde47f5e6525895dc3a), [`57f969f`](https://github.com/prefix-tree/cutcraft/commit/57f969fe2a316d3c70b76738eaf1eada043b3d7a), [`83664f3`](https://github.com/prefix-tree/cutcraft/commit/83664f327df1e106685132199f2d0506b42609ad), [`7130e8c`](https://github.com/prefix-tree/cutcraft/commit/7130e8cf75b2c8e026f3e8950400f8106adbe98c), [`f5cd9c7`](https://github.com/prefix-tree/cutcraft/commit/f5cd9c7b7dd1433bb1eff2e2346594baacc9d01e), [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22), [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd), [`47b40b0`](https://github.com/prefix-tree/cutcraft/commit/47b40b0fc69a3c338ef44c252bcc193fc505abad)]:
  - @cutcraft/kit@0.2.0
  - @cutcraft/graphics@0.2.0
