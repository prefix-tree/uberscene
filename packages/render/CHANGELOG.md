# @uberscene/render

## 0.6.1

### Patch Changes

- The first 0.6 on npm. 0.6.0 was tagged but never published: its GitHub release was published before the native codecs were attached, and the repository's releases cannot be changed once published. 0.6.1 holds everything 0.6.0 lists, with its codecs attached; the release is now kept a draft until its packages are staged.
- Updated dependencies
  - @uberscene/kit@0.6.1
  - @uberscene/sdk@0.6.1
  - @uberscene/player@0.6.1
  - @uberscene/graphics@0.6.1

## 0.6.0

### Minor Changes

- 28bdc58: `uberscene blocks add <name>` copies a block into the project and records it in the manifest; with `--into video.tsx --track <id> --at <moment>` it also writes the import and a `<Layer>` holding it, leaving the video as it was if that would give it errors. `uberscene blocks update` replaces copies nobody edited and prints what differs in edited ones. The kit gets `insertLayer` in `@uberscene/sdk`, an optional `blocks` record on `AssetManifest`, and a component imported from one of the file's own modules now gets the Layer's handles, as one declared in the file does.
- 0ef018c: Six more blocks ship with the CLI: `ranked-list` (rows that slide to new places when their values change),
  `bar-race` (bars that overtake each other period by period), `chat-reveal` (a question, then a reply that types in),
  `terminal-typing` (commands typed after a prompt, their output line by line), `phone-tap` (a phone screen with
  taps that ripple and select) and `quote-build` (a quote built word by word, key words stressed). `uberscene blocks`
  lists nine.
- 68c7b7c: Blocks: scene-sized pieces of motion design that ship with the CLI. `uberscene blocks` lists them by the job each does
  (`--for`, `--aspect`, `--json`) and `--sheet` pastes their previews into one image. The first three are a grid of
  cells that fills and counts, a wall of characters that changes on the beat, and a row of points lit in turn; the
  example shorts are built on them. The kit gains `themeCss` (a theme token as a CSS value, for components that take
  `$accent`) and `blockMetaSchema`.
- 8155b03: The native codecs download on first use: the first export with `UBERSCENE_CODECS` fetches `uberscene-codec` for your machine (macOS arm64 and x64, Linux x64 and arm64 with glibc, Windows x64) from the version's GitHub release into `~/.cache/uberscene/codecs` (`UBERSCENE_CODEC_CACHE` moves it), and checks it against the SHA-256 the package carries. `npx uberscene codecs install` downloads it ahead, for a Dockerfile or a CI step. Before, the binary had to be built from the repository with Rust. `UBERSCENE_CODEC_BIN` still names a binary built elsewhere.
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
- efb3f7f: `uberscene lint <file.tsx>... [--fix] [--json]` runs the kit's static checks from the command line: one line per finding with its file, line and column, exit code 1 when an error is left. The file is read, never run. `--fix` writes the fixes the findings carry.
  
  A lint `Diagnostic` can now carry a `fix` (source edits), and `fixSource(text, options)` from `@uberscene/sdk` applies them round by round. A new rule, `deprecated-props`, reports props and values spelled the way an earlier version took them, from a `DEPRECATIONS` table (empty for now) and from `lint(text, { deprecations })`; where the new spelling is certain its fix renames the prop, respells the value or moves the prop into an object prop. The helpers it uses are exported for rules of your own: `renameProp`, `renameValue`, `movePropInto`, `movePropsInto`, `jsxTags`. The `free-code-clock` rule fixes `window.requestAnimationFrame` and the like to their bare names, and takes `willReadFrequently: true` out.
- 974c884: Clips can be written straight in `<Composition>`, with no `<Track>`: they play in the order they are written, as the video's main track, the bottom one (id `main`). `<Transition>` and `<Gap>` go between them the same way. Tracks written beside them draw on top, so adding a b-roll or title track leaves the main cut as it is. Write `<Track id="main">` around the clips when the track needs a setting of its own; the editor does that when you mute, lock or move it. A clip written after a `<Track>` gets the lint warning `main-clips-first`. `uberscene add` now prints the element to paste (`<Clip id="talk" src="asset:talk" />`), `@uberscene/sdk` gets `wrapMainTrack`, and `ResolvedTrack.implicit` marks a main track with no element. `<Composition> cannot contain <title>` now says to put it in a `<Track>`.
- 8ff4285: Experimental native codecs behind `UBERSCENE_CODECS`. `native-decode`, `native-encode` or `native` hands decoding the footage, encoding the export, or both to `uberscene-codec`, a Rust process on FilmCraft's craft-video (no FFmpeg), built from source with `pnpm native:build` or named by `UBERSCENE_CODEC_BIN`. It decodes HEVC (8 and 10 bit), ProRes and DNxHR, which Chrome cannot without hardware, alongside H.264, VP8, VP9 and AV1, falling back to the browser for an asset it cannot read. It encodes H.264 to MP4 and ProRes to `.mov` (`--codec prores`, the profile from `--quality`). The browser's codecs stay the default. `RenderResult.codecs` says which ran, and `codecModes` is exported.
- 9cfd718: The native codecs make the soundtrack too. With `UBERSCENE_CODECS=native-encode` or `native`, `uberscene-codec` encodes the sound (AAC in MP4, 24-bit PCM in `.mov`, 16-bit WAV, on FilmCraft's craft-audio); with `native`, the mix is made outside the browser from sound it decodes (AAC, Opus, MP3, AC-3, ALAC, PCM). An asset whose sound it cannot read sends the mix back to the page with a warning, and MP3 keeps the page's encoder.
- 8ff4285: The export runs on Chrome 157 only. A binary named by `UBERSCENE_CHROMIUM` (or `executablePath`) of any other version is refused when it starts, with its version and what to do instead; before, any Chrome 153 or later was taken and could draw text differently from the preview and the goldens. The downloaded Chrome for Testing is unchanged.
- 23f68a7: The mixer internals (`mixBlock`, `mixPlan`, `envelopeAt` and their types), `loadFonts` and `subjectRects` are no longer exported; the export, `inspect` and `checkLayout` use them as before. The renderer now takes its resolver and lint from `@uberscene/sdk`.
- 41f2ced: Time in ticks. Every turn of a time into a frame, a frame into a time, or a time into an audio sample now counts in ticks (1/254,016,000,000 s), which divide every frame and sample rate in use, so frame boundaries are exact and `FRAME_EPS` is gone. The kit exports the `time` module from `@uberscene/kit/schema` (`parseRate`, `frameAtSeconds`, `frameStartSeconds`, `framesUntil`, `nearestFrame`, `sampleAtSeconds`, `samplesUntil`, `timecode`, `TICKS_PER_SECOND`, `MAX_SECONDS`).
  
  `<Composition fps>` takes a whole number, an NTSC string (`"23.976"`, `"29.97"`, `"47.952"`, `"59.94"`, `"119.88"`) or `{ num, den }`. The resolved composition carries the exact `rate` beside `fps`. The player shows drop-frame timecode at 29.97 and 59.94, and the export hands the encoder the exact fraction.
  
  Breaking: `fps={29.97}` as a number is 2997/100, not NTSC, and is now an error; run `uberscene lint --fix` to write `fps="29.97"`. A composition longer than 35,459 s (about 9.85 hours), or a `sampleRate` that does not divide into ticks, is an error. Code that builds a `ResolvedState` by hand adds `composition.rate`.

### Patch Changes

- 9cfd718: A clip whose sound starts in the middle of a WebM (Opus) file now plays and exports where the file has it. It was 1 ms late, half a cycle of a 440 Hz tone, because WebM rounds block times to the millisecond and Mediabunny shifts Opus by its rounded codec delay. The preview's audio and the export's mix now decode from 120 ms before the range, so the decoder settles, and place each block on the grid its stream's blocks start on.
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
- e559ffa: A failed export no longer destroys the file it would have replaced. Videos, soundtracks, stills and contact sheets are written beside the output as a `.partial` file and renamed over it only once they are whole, so a timeout, a missing asset or a crash keeps the last good file. A still is now checked for failed media before it is written, and the partial file is removed when an export fails.
- 3d2979b: When a media fetch fails and several assets are missing, the export error names all of them, the failed one first, instead of whichever fetch happened to fail first.
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
- 3796367: Times and clamps use the kit's `round3` and `clamp01`.
- 3e4e7c5: Three export fixes:
  
  - A failed asset stops the export after the first piece it fails in, not after the last frame: a one-hour export with
    one missing image no longer renders everything before it throws. With `onAssetError: "continue"`, a missing clip
    with sound is silent, with a warning, instead of failing the soundtrack before the first frame.
  - A cancel (`signal`) stops the export at once: the browser is closed, ending the piece in flight, where before the
    piece (minutes of video in a long export) was finished first. A signal already aborted stops it before it starts.
  - The native decoder's stream (`UBERSCENE_CODECS=native-decode`) is read without copying: each picture's bytes are
    joined once, where every 64 KB chunk copied everything not yet read, about 24 times a 1080p picture.
- e410297: Three fixes:
  
  - With the native codecs on, a `uberscene-codec` process that cannot start (the binary missing, too many open files)
    fails the request or piece that asked for it, with the reason, instead of crashing the export with an unhandled
    error.
  - `uberscene skills install --force` deletes nothing it did not write. In a folder without its record it writes the
    skill beside what is there, where before it removed the folder: `--dir .claude/skills --force` deleted every other
    skill. In its own folder it replaces only the files it wrote, and keeps files you added.
  - `look` and `--still` notice a replaced file whose asset id has a dot (`asset:logo.v2`); the frame cache looked up
    `logo` instead and kept showing the old picture.
- c8d956f: Two export fixes:
  
  - An asset id can no longer name another file. The export's local server answered `/media/<id>` by joining the
    decoded id onto the media folder, so code in a file could fetch `/media/..%2F..%2F.ssh%2Fid_rsa` and read any file
    on the host. Asset ids are now only what an `asset:` reference allows (letters, digits, `_`, `-`, `.`, no `..`),
    checked in `directoryResolver`, on `/media/` and on the native codec routes.
  - A long export no longer runs out of memory. Pieces were a third of the frames per tab, so an hour at 1080p with one
    tab made pieces of about 930 MB, each held whole in the page and in Node. A piece now runs a minute at most.
- 472246e: - Number flags (`--from`, `--to`, `--step`, `--cell`, `--columns`, `--bitrate`, `--keyframe`) are checked, and a value that is not a number is an error naming the flag.
  - An export error is reported as itself; it is replaced by a missing-media error only when it is that media's fetch failing.
  - A native encode frame with an index out of range, or sent twice, is refused instead of waiting forever.
  - The frame cache is kept under 500 MB, deleting the frames used longest ago.
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
- Updated dependencies [c8d956f]
- Updated dependencies [9cfd718]
- Updated dependencies [28bdc58]
- Updated dependencies [68c7b7c]
- Updated dependencies [cf23cb8]
- Updated dependencies [327d103]
- Updated dependencies [0800d5e]
- Updated dependencies [71e136e]
- Updated dependencies [e410297]
- Updated dependencies [c8d956f]
- Updated dependencies [208c96c]
- Updated dependencies [b80a44b]
- Updated dependencies [fa69b88]
- Updated dependencies [89e5b4b]
- Updated dependencies [6e711ad]
- Updated dependencies [f654ff7]
- Updated dependencies [efb3f7f]
- Updated dependencies [974c884]
- Updated dependencies [71e136e]
- Updated dependencies [261d5b6]
- Updated dependencies [3e4e7c5]
- Updated dependencies [3796367]
- Updated dependencies [3796367]
- Updated dependencies [3796367]
- Updated dependencies [2ebd6a9]
- Updated dependencies [2daa802]
- Updated dependencies [3e4e7c5]
- Updated dependencies [23f68a7]
- Updated dependencies [49ed5eb]
- Updated dependencies [f654ff7]
- Updated dependencies [fd3e555]
- Updated dependencies [7dee501]
- Updated dependencies [23f68a7]
- Updated dependencies [472246e]
- Updated dependencies [472246e]
- Updated dependencies [f81b912]
- Updated dependencies [45aabbd]
- Updated dependencies [6e711ad]
- Updated dependencies [41f2ced]
- Updated dependencies [e410297]
  - @uberscene/sdk@0.6.0
  - @uberscene/player@0.6.0
  - @uberscene/kit@0.6.0
  - @uberscene/graphics@0.6.0

## 0.5.0

### Minor Changes

- 933fa0c: `<Layer ground>` marks a layer as a ground that other things sit on (a wall behind a game, a scrim under a title), so the layout check, `uberscene where` and `look --zones` treat it like a background. `<Three>` and `<Motion>` take it too. `uberscene inspect` prints `ground` on its line. This replaces the `data-ground` attribute on an element inside the layer, which is no longer read: a file that used it moves the marker to the `<Layer>`.
- 97d54f4: A video file may import modules of its own: `import { ChatReveal } from "./blocks/chat-reveal"`. Each is a `.ts` or `.tsx` file inside the project (the folder of the nearest `uberscene.json`), compiled and run like the file, once. `gatherLocalFiles(source, read)` collects their texts and `loadModule(source, { files })` runs them; the command line reads them from disk, refuses one outside the project, names a missing one with where it looked, passes them to the export page, and keys cached frames drawn by their code on their text.
- 24a2570: CutCraft is now UberScene. The packages are `uberscene` (the CLI, run as `npx uberscene`) and `@uberscene/kit`, `@uberscene/player`, `@uberscene/render` and `@uberscene/graphics`; change your imports from `@cutcraft/*`. The manifest is `uberscene.json`, and a `cutcraft.json` is still found. The environment variables are `UBERSCENE_*` instead of `CUTCRAFT_*`, and the caches move to `~/.cache/uberscene`.
- a8f1cd3: A file's `schema` values are knobs an editor and an agent can read. `knob.color()`, `knob.font()` and `knob.image()` mark a string that wants a colour picker, a font menu or an image picker; `.describe("…")` is the label; `z.enum` is a choice and a number's `.min()`/`.max()` bound it. `knobsOf(schema, values)` returns each with its key, kind, description, value, options and bounds. `uberscene inspect` lists them before the timeline, and `--json` has them as `knobs`. The recipes mark their colours and logos.
- 4571f15: `uberscene skills install` writes the agent skill that ships with the installed CLI into `.claude/skills/uberscene` (or `--dir`), so the skill always teaches the commands of the version you have. Run again after an upgrade, it replaces the folder it wrote; a folder with edits, or one it did not write, needs `--force`. The `@uberscene/render` package now carries the skill in `dist/skill/uberscene`, and exports `installSkill`.

### Patch Changes

- Updated dependencies [546f81a]
- Updated dependencies [4fac602]
- Updated dependencies [933fa0c]
- Updated dependencies [97d54f4]
- Updated dependencies [24a2570]
- Updated dependencies [a8f1cd3]
- Updated dependencies [34c8b8a]
  - @uberscene/kit@0.5.0
  - @uberscene/player@0.5.0
  - @uberscene/graphics@0.5.0

## 0.4.0

### Minor Changes

- 7595324: `cutcraft <file> --out video.mp4 --draft` renders the video for watching: every second frame, each shown twice as
  long, at half the width and height and the `low` quality preset. The length and the sound are unchanged. It is
  written beside `--out` as `video.draft.mp4` and never replaces the video. From code: `renderVideo({ draft: true })`
  and `draftPath(out)`.
- 09a773a: An export no longer hangs in silence. Each frame has a deadline (60 s; `--frame-timeout <s>`, or `frameTimeout` on `renderVideo`, `renderStill`, `renderLook` and `checkLayout`), and a frame that outlasts it fails the command with the frame, its time and the step it was in: `frame 412 (13.73 s) did not finish within 60 s: stuck in settle`. Any other error while a frame is drawn now names the frame too. When the browser never confirms a frame's paint and the page goes on without it, the result carries a warning with how many frames that touched.
- 19fbf0b: The manifest is found without `--manifest`: commands take the nearest `cutcraft.json` from the video file's folder upward, so videos in subfolders share one. A `manifest.json` beside the video file is still read. `cutcraft add` updates the nearest `cutcraft.json` from the current folder upward and creates one there when there is none; it used to create `manifest.json` beside the media. Without `--media`, media is looked for in the video file's folder, the manifest's folder and `media/` beside the manifest. `loadVideo` returns `manifestPath`, `directoryResolver` takes a list of folders, and `findManifest` is exported.
- 06ad6a4: A font catalogue and `cutcraft fonts`. The kit exports `FONT_CATALOG` (the bundled families and a short list from Google Fonts, each with its category, weights, roles, a line on how it looks and its pairings), `findFont`, `fontsFor`, `nearestFont` and `fontFamily`. `cutcraft fonts` prints the list, filtered with `--for` and `--category`, and `--sheet` draws the families as one image setting your words. `googleFont()` now refuses a weight or an italic a listed family does not have, and the `font-available` lint gives the declaration to write.
- 2ba9bb8: `cutcraft look` and `--still` keep the frames they draw in `.cutcraft/cache` beside the file, each under a key made from what draws it (the elements on screen with their resolved props, the media files, the composition, the fonts, the versions of CutCraft and Chrome). After an edit only the frames it changed are drawn again, and a look whose cells are all kept starts no browser. `--no-cache` draws everything again; `renderLook` and `renderStill` take a `cacheDir` and report what was `cached`. A look's sheet is now always a PNG, put together in Node from its cells: `--out sheet.jpg` is an error.
- 96b43b4: Free code runs on the video's clock in an export. The file's own `requestAnimationFrame` callbacks run once per frame with the frame's time, `performance.now()`, `Date.now()` and `new Date()` follow it, and `Math.random()` gives the same numbers in every export, so a loop written the usual way exports at the same speed on any machine. A Layer now holds CSS transitions and `element.animate()` animations at the layer's time as well as CSS animations, in the player and the export. `loadModule` takes a `scope` of names the file sees in place of globals. The `free-code-clock` lint warns about `Math.random()` (use `random(seed)`) and about `window.requestAnimationFrame`, `window.performance` and `window.Date`, which stay on the browser's clock.
- ad357a2: `cutcraft inspect video.tsx` reads a timeline back as text, with no browser: each track's elements with their seconds, the words each clip plays, effects, keyframes and cuts, or with `--json` as flat rows for `jq`. `--at` says what is on screen and heard at chosen moments, with effect values after keyframes. A moment is written the way the file is (`hook.end`, `x1`, `word:14`, `hook@word:14`, `shot:1`, `marker:intro`) or as time (`4.5`, `90f`, `2..6/0.5`). The kit exports what it is built from: `timelineRows`, `parseMoments`, `resolveMoments`, `playsOf` and `spokenWords`; `@cutcraft/render` exports `inspect` and `describeAt`.
- 4dbdc56: `cutcraft look --listen <stretch>` shows the sound of a stretch under the sheet's cells: the mix an export would write, as its level over time on a decibel scale, with a time scale, the words of the transcript where the cut says them, and silent stretches shaded. The stretch is `all`, a range such as `2..6` or `60f..180f`, or an element's id. The legend gains `listen`: the stretch, `peakDb` and `rmsDb` in dBFS (null for silence), `silences` (at least 0.3 s below -50 dBFS) and the words. The strip is kept in the frame cache under a key of the whole file and its media. `renderLook` takes `listen`, and the kit exports `listenRange`.
- 4fb0ebb: `cutcraft look --motion <stretch>` draws a short stretch as a strip of small frames at even steps, each labelled
  with its time, so a move, an entrance or a transition can be read left to right without a render. The stretch is a
  range or an element's id; `--step` sets the seconds between frames, twelve frames without it.
- d43b815: `cutcraft look --zones <zone>` draws a safe zone over every cell of a sheet: what is outside it is shaded, and each
  overlay, the captions and each named part is outlined, lime inside the zone and red where it leaves the zone or the
  frame. The legend's cells gain `things`, the rows `cutcraft where` gives for that moment. From code: the `zones`
  option of `renderLook`, and `describeThings` and `zoneRect`.
- fd5c06c: `cutcraft look video.tsx` draws many frames in one browser start, on one contact sheet with a JSON legend that says what each cell is. With no moments it skims the cut as an editor does (each clip's first frame, both sides of every cut, each overlay); `--at` takes the moments `inspect` takes, `--around <id>` follows a transition or an element coming in and going out, and `--without <id>` draws each frame with and without an effect, an adjustment or an overlay, side by side. The kit exports `aroundMoments` and `skimMoments`; `@cutcraft/render` exports `renderLook`.
- 12bdf63: The soundtrack is measured before it is clamped to full scale. `look --listen` reports `lufs` (integrated loudness, ITU-R BS.1770), `truePeakDb`, `clipped` (samples above full scale) and `clippedAt` (the time of the first), and its `peakDb` can now be above 0. `look` and `render` warn when the mix clips. The exported sound is as before: nothing limits it.
- 1a535f5: `cutcraft where <file> --at <moments>` prints where each overlay, the captions and each named part is at a moment:
  its ink as a box in pixels, whether it is in the frame and in each safe zone, and what it overlaps. An element
  inside a `<Layer>` that carries `data-name` is a named part: `where` lists it as `<layer id>/<name>`, and
  `--check-layout` now checks it on its own and reports it at the line that names it. From code: `whereThings` and
  `formatWhere`.

### Patch Changes

- 12fbb4e: Captions can be placed exactly: `x` and `y` on `<Captions>` are the middle of the captions in pixels from the
  frame's centre, `width` is the widest a line may be, and `align` is the side the lines sit against. `y` takes the
  place of `style.position`, which stays as the short form. The layout check's advice for captions names these.
- 8b3bb93: An export no longer draws the odd frame one step behind when the file sets React state from its own `requestAnimationFrame` loop. The update was left to React's scheduler and about one frame in fifty was captured before it was committed; the export page now has React commit it before the frame is painted.
- 8cf667b: `audio/setDuck` takes a track role in `duck.under`, as a file does; it used to refuse anything but a track id. `<Multicam activeAngle>` and the `multicam/setActiveAngle` action are removed: nothing in the player or the export read the prop, so it changed nothing. A file that sets it now fails with an unrecognized key. `cutcraft inspect` names the element and the edge of a transition written with `on` and `edge`, where it printed `undefined → undefined`.
- 6526cb1: A `<Layer>` can mark itself as a ground with `data-ground` on an element inside it (a scrim over the footage that titles and captions sit on). The layout check, `cutcraft where` and `look --zones` then treat it like a background beneath the footage: it is not held to the safe zone and is not reported as covering the captions.
- b4d81bb: `cutcraft --check-layout` no longer stops with "No cached paint record for element" on a video whose captions have a pause between two lines. An overlay that draws nothing at the moment measured is now counted as having no ink, which is what it has.
- Updated dependencies [96799e4]
- Updated dependencies [12fbb4e]
- Updated dependencies [22d44a7]
- Updated dependencies [b0f2630]
- Updated dependencies [98d38b7]
- Updated dependencies [1f5e897]
- Updated dependencies [9b27e92]
- Updated dependencies [06ad6a4]
- Updated dependencies [d597a1e]
- Updated dependencies [a12dd56]
- Updated dependencies [8cf667b]
- Updated dependencies [96b43b4]
- Updated dependencies [ad357a2]
- Updated dependencies [4dbdc56]
- Updated dependencies [4fb0ebb]
- Updated dependencies [fd5c06c]
- Updated dependencies [c425d5c]
- Updated dependencies [0760cb9]
- Updated dependencies [f22acb1]
- Updated dependencies [3da2e2a]
  - @cutcraft/kit@0.4.0
  - @cutcraft/player@0.4.0
  - @cutcraft/graphics@0.4.0

## 0.3.0

### Minor Changes

- bedea28: Grade with a LUT: `<Effect type="lut" params={{ src: "asset:look", amount }} />` reads a 3D `.cube` file, a new manifest asset kind `lut` that `cutcraft add look.cube` checks and lists. An effect param that names an asset is read by the shader as a texture (a LUT as a `sampler3D`, an image as a `sampler2D`), loaded before the frame that needs it. `parseCube` reads the format.

### Patch Changes

- c37a87f: In the workspace, where the export page is served from source, the exports in one process share one Vite server and close it a few seconds after the last one. A Vite server closed after each export kept about 40 MB, so a process that exported many times ran out of memory. Published packages serve the built page and are unaffected.
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
- e1e5bdb: A frame is captured only once the faces its text uses have loaded. A bundled face is fetched when text first uses it,
  so text that appeared after the first frame could be drawn in the fallback face, in stills most of all.
- Updated dependencies [e1e5bdb]
- Updated dependencies [ee3a1e9]
- Updated dependencies [6ac1d41]
- Updated dependencies [ab5cec4]
- Updated dependencies [4756002]
- Updated dependencies [1fdf930]
- Updated dependencies [bedea28]
- Updated dependencies [5b492f0]
- Updated dependencies [4b3d65d]
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
  - @cutcraft/player@0.3.0
  - @cutcraft/graphics@0.3.0

## 0.2.0

### Minor Changes

- [#13](https://github.com/prefix-tree/cutcraft/pull/13) [`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f) Thanks [@bsnisar](https://github.com/bsnisar)! - The kit's `holdLayerFrame` lets an engine layer (three.js, Motion) hold a frame until it has drawn it, so an export
  never captures a frame half drawn. `loadVideo` returns the file's `source`, which the export page loads.

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

- [#7](https://github.com/prefix-tree/cutcraft/pull/7) [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd) Thanks [@bsnisar](https://github.com/bsnisar)! - The export loads a cut file the way the editor does: it may import `react`, `zod` and `@cutcraft/kit`, plus what the
  host offers (`loadVideo(file, { imports })`, `cutcraft --import`). A file that imports anything else now fails in the
  export with the editor's message. `--tsconfig` and `LoadOptions.tsconfig` are gone.

- [#21](https://github.com/prefix-tree/cutcraft/pull/21) [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22) Thanks [@bsnisar](https://github.com/bsnisar)! - Effects and transitions of your own: `defineEffect({ name, params, shader })` and `defineTransition({ name, params, shader })` declare a GLSL function and a zod schema for its params, and return the name to use as an `<Effect>` or `<Transition>` type. Params are validated and given defaults by the schema, keyframable, and passed to the shader as uniforms; transitions get both pictures and their progress. The player draws them with WebGL 2 in any browser, in the preview and the export. The `declaration` lint checks that they sit at the top of the file with a literal `name` and `shader`.

- [#19](https://github.com/prefix-tree/cutcraft/pull/19) [`47b40b0`](https://github.com/prefix-tree/cutcraft/commit/47b40b0fc69a3c338ef44c252bcc193fc505abad) Thanks [@bsnisar](https://github.com/bsnisar)! - `cutcraft add talk.mp4` writes a media file's manifest entry, probed from the file, with its words from the transcript beside it (`talk.json` from Whisper or ElevenLabs, `talk.vtt`, `talk.srt`). `parseTranscript()` reads the same formats in code; words from subtitles are marked `estimated`. `--srt` and `--vtt` write the captions the cut plays as subtitle files, and `subtitles(state, …)` returns them in code. `<Captions breakAfter={["word:5"]}>` ends a line after the named words.

### Patch Changes

- [#27](https://github.com/prefix-tree/cutcraft/pull/27) [`e5e2ef0`](https://github.com/prefix-tree/cutcraft/commit/e5e2ef0ff232c254285dc1de074d4119af3b8cc4) Thanks [@bsnisar](https://github.com/bsnisar)! - The player drops what only the removed Node renderer used: `Frame.paintFull` and `Frame.prepare`, the
  `FrameSourceHooks` argument of `mediabunnyFrameSourceFactory`, and the `intercept` argument of `Compositor.step`. A
  `path` media handle given to the player now fails with a message asking for a URL. `cutcraft browser install` keeps a
  Chrome already in the cache and no longer contacts the network for it.

- [#8](https://github.com/prefix-tree/cutcraft/pull/8) [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e) Thanks [@bsnisar](https://github.com/bsnisar)! - Every package has a README written for its users, with links to the documentation site that work on npm.
  The graphics README leads with three.js and Motion, its deprecated `<Graphic>` kinds below.
- Updated dependencies [[`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f), [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e), [`a7965d3`](https://github.com/prefix-tree/cutcraft/commit/a7965d3b766a4570026d7cde47f5e6525895dc3a), [`57f969f`](https://github.com/prefix-tree/cutcraft/commit/57f969fe2a316d3c70b76738eaf1eada043b3d7a), [`83664f3`](https://github.com/prefix-tree/cutcraft/commit/83664f327df1e106685132199f2d0506b42609ad), [`7130e8c`](https://github.com/prefix-tree/cutcraft/commit/7130e8cf75b2c8e026f3e8950400f8106adbe98c), [`f5cd9c7`](https://github.com/prefix-tree/cutcraft/commit/f5cd9c7b7dd1433bb1eff2e2346594baacc9d01e), [`e5e2ef0`](https://github.com/prefix-tree/cutcraft/commit/e5e2ef0ff232c254285dc1de074d4119af3b8cc4), [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22), [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd), [`47b40b0`](https://github.com/prefix-tree/cutcraft/commit/47b40b0fc69a3c338ef44c252bcc193fc505abad)]:
  - @cutcraft/kit@0.2.0
  - @cutcraft/graphics@0.2.0
  - @cutcraft/player@0.2.0
