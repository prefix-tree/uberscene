# uberscene

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

### Patch Changes

- Updated dependencies [9cfd718]
- Updated dependencies [28bdc58]
- Updated dependencies [0ef018c]
- Updated dependencies [68c7b7c]
- Updated dependencies [cf23cb8]
- Updated dependencies [8155b03]
- Updated dependencies [fa69b88]
- Updated dependencies [e559ffa]
- Updated dependencies [efb3f7f]
- Updated dependencies [974c884]
- Updated dependencies [3d2979b]
- Updated dependencies [261d5b6]
- Updated dependencies [8ff4285]
- Updated dependencies [9cfd718]
- Updated dependencies [8ff4285]
- Updated dependencies [3796367]
- Updated dependencies [23f68a7]
- Updated dependencies [3e4e7c5]
- Updated dependencies [e410297]
- Updated dependencies [c8d956f]
- Updated dependencies [472246e]
- Updated dependencies [45aabbd]
- Updated dependencies [41f2ced]
  - @uberscene/render@0.6.0

## 0.5.0

### Minor Changes

- 97d54f4: A video file may import modules of its own: `import { ChatReveal } from "./blocks/chat-reveal"`. Each is a `.ts` or `.tsx` file inside the project (the folder of the nearest `uberscene.json`), compiled and run like the file, once. `gatherLocalFiles(source, read)` collects their texts and `loadModule(source, { files })` runs them; the command line reads them from disk, refuses one outside the project, names a missing one with where it looked, passes them to the export page, and keys cached frames drawn by their code on their text.
- 24a2570: CutCraft is now UberScene. The packages are `uberscene` (the CLI, run as `npx uberscene`) and `@uberscene/kit`, `@uberscene/player`, `@uberscene/render` and `@uberscene/graphics`; change your imports from `@cutcraft/*`. The manifest is `uberscene.json`, and a `cutcraft.json` is still found. The environment variables are `UBERSCENE_*` instead of `CUTCRAFT_*`, and the caches move to `~/.cache/uberscene`.
- a8f1cd3: A file's `schema` values are knobs an editor and an agent can read. `knob.color()`, `knob.font()` and `knob.image()` mark a string that wants a colour picker, a font menu or an image picker; `.describe("…")` is the label; `z.enum` is a choice and a number's `.min()`/`.max()` bound it. `knobsOf(schema, values)` returns each with its key, kind, description, value, options and bounds. `uberscene inspect` lists them before the timeline, and `--json` has them as `knobs`. The recipes mark their colours and logos.
- 4571f15: `uberscene skills install` writes the agent skill that ships with the installed CLI into `.claude/skills/uberscene` (or `--dir`), so the skill always teaches the commands of the version you have. Run again after an upgrade, it replaces the folder it wrote; a folder with edits, or one it did not write, needs `--force`. The `@uberscene/render` package now carries the skill in `dist/skill/uberscene`, and exports `installSkill`.

### Patch Changes

- Updated dependencies [933fa0c]
- Updated dependencies [97d54f4]
- Updated dependencies [24a2570]
- Updated dependencies [a8f1cd3]
- Updated dependencies [4571f15]
  - @uberscene/render@0.5.0

## 0.4.0

### Minor Changes

- 19fbf0b: The manifest is found without `--manifest`: commands take the nearest `cutcraft.json` from the video file's folder upward, so videos in subfolders share one. A `manifest.json` beside the video file is still read. `cutcraft add` updates the nearest `cutcraft.json` from the current folder upward and creates one there when there is none; it used to create `manifest.json` beside the media. Without `--media`, media is looked for in the video file's folder, the manifest's folder and `media/` beside the manifest. `loadVideo` returns `manifestPath`, `directoryResolver` takes a list of folders, and `findManifest` is exported.
- 2ba9bb8: `cutcraft look` and `--still` keep the frames they draw in `.cutcraft/cache` beside the file, each under a key made from what draws it (the elements on screen with their resolved props, the media files, the composition, the fonts, the versions of CutCraft and Chrome). After an edit only the frames it changed are drawn again, and a look whose cells are all kept starts no browser. `--no-cache` draws everything again; `renderLook` and `renderStill` take a `cacheDir` and report what was `cached`. A look's sheet is now always a PNG, put together in Node from its cells: `--out sheet.jpg` is an error.
- ad357a2: `cutcraft inspect video.tsx` reads a timeline back as text, with no browser: each track's elements with their seconds, the words each clip plays, effects, keyframes and cuts, or with `--json` as flat rows for `jq`. `--at` says what is on screen and heard at chosen moments, with effect values after keyframes. A moment is written the way the file is (`hook.end`, `x1`, `word:14`, `hook@word:14`, `shot:1`, `marker:intro`) or as time (`4.5`, `90f`, `2..6/0.5`). The kit exports what it is built from: `timelineRows`, `parseMoments`, `resolveMoments`, `playsOf` and `spokenWords`; `@cutcraft/render` exports `inspect` and `describeAt`.
- 4dbdc56: `cutcraft look --listen <stretch>` shows the sound of a stretch under the sheet's cells: the mix an export would write, as its level over time on a decibel scale, with a time scale, the words of the transcript where the cut says them, and silent stretches shaded. The stretch is `all`, a range such as `2..6` or `60f..180f`, or an element's id. The legend gains `listen`: the stretch, `peakDb` and `rmsDb` in dBFS (null for silence), `silences` (at least 0.3 s below -50 dBFS) and the words. The strip is kept in the frame cache under a key of the whole file and its media. `renderLook` takes `listen`, and the kit exports `listenRange`.
- fd5c06c: `cutcraft look video.tsx` draws many frames in one browser start, on one contact sheet with a JSON legend that says what each cell is. With no moments it skims the cut as an editor does (each clip's first frame, both sides of every cut, each overlay); `--at` takes the moments `inspect` takes, `--around <id>` follows a transition or an element coming in and going out, and `--without <id>` draws each frame with and without an effect, an adjustment or an overlay, side by side. The kit exports `aroundMoments` and `skimMoments`; `@cutcraft/render` exports `renderLook`.

### Patch Changes

- Updated dependencies [12fbb4e]
- Updated dependencies [7595324]
- Updated dependencies [09a773a]
- Updated dependencies [8b3bb93]
- Updated dependencies [19fbf0b]
- Updated dependencies [06ad6a4]
- Updated dependencies [8cf667b]
- Updated dependencies [2ba9bb8]
- Updated dependencies [96b43b4]
- Updated dependencies [ad357a2]
- Updated dependencies [6526cb1]
- Updated dependencies [b4d81bb]
- Updated dependencies [4dbdc56]
- Updated dependencies [4fb0ebb]
- Updated dependencies [d43b815]
- Updated dependencies [fd5c06c]
- Updated dependencies [12bdf63]
- Updated dependencies [1a535f5]
  - @cutcraft/render@0.4.0

## 0.3.0

### Minor Changes

- bedea28: Grade with a LUT: `<Effect type="lut" params={{ src: "asset:look", amount }} />` reads a 3D `.cube` file, a new manifest asset kind `lut` that `cutcraft add look.cube` checks and lists. An effect param that names an asset is read by the shader as a texture (a LUT as a `sampler3D`, an image as a `sampler2D`), loaded before the frame that needs it. `parseCube` reads the format.

### Patch Changes

- Updated dependencies [bedea28]
- Updated dependencies [c37a87f]
- Updated dependencies [fa7c303]
- Updated dependencies [e1e5bdb]
  - @cutcraft/render@0.3.0

## 0.2.0

### Minor Changes

- [#13](https://github.com/prefix-tree/cutcraft/pull/13) [`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f) Thanks [@bsnisar](https://github.com/bsnisar)! - The kit's `holdLayerFrame` lets an engine layer (three.js, Motion) hold a frame until it has drawn it, so an export
  never captures a frame half drawn. `loadVideo` returns the file's `source`, which the export page loads.

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

- [#19](https://github.com/prefix-tree/cutcraft/pull/19) [`47b40b0`](https://github.com/prefix-tree/cutcraft/commit/47b40b0fc69a3c338ef44c252bcc193fc505abad) Thanks [@bsnisar](https://github.com/bsnisar)! - `cutcraft add talk.mp4` writes a media file's manifest entry, probed from the file, with its words from the transcript beside it (`talk.json` from Whisper or ElevenLabs, `talk.vtt`, `talk.srt`). `parseTranscript()` reads the same formats in code; words from subtitles are marked `estimated`. `--srt` and `--vtt` write the captions the cut plays as subtitle files, and `subtitles(state, …)` returns them in code. `<Captions breakAfter={["word:5"]}>` ends a line after the named words.

### Patch Changes

- [#27](https://github.com/prefix-tree/cutcraft/pull/27) [`e5e2ef0`](https://github.com/prefix-tree/cutcraft/commit/e5e2ef0ff232c254285dc1de074d4119af3b8cc4) Thanks [@bsnisar](https://github.com/bsnisar)! - The player drops what only the removed Node renderer used: `Frame.paintFull` and `Frame.prepare`, the
  `FrameSourceHooks` argument of `mediabunnyFrameSourceFactory`, and the `intercept` argument of `Compositor.step`. A
  `path` media handle given to the player now fails with a message asking for a URL. `cutcraft browser install` keeps a
  Chrome already in the cache and no longer contacts the network for it.

- [#8](https://github.com/prefix-tree/cutcraft/pull/8) [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e) Thanks [@bsnisar](https://github.com/bsnisar)! - Every package has a README written for its users, with links to the documentation site that work on npm.
  The graphics README leads with three.js and Motion, its deprecated `<Graphic>` kinds below.
- Updated dependencies [[`f9ecdb4`](https://github.com/prefix-tree/cutcraft/commit/f9ecdb40e0cd3897fac4ba138b86aab700b9d28f), [`a7965d3`](https://github.com/prefix-tree/cutcraft/commit/a7965d3b766a4570026d7cde47f5e6525895dc3a), [`83664f3`](https://github.com/prefix-tree/cutcraft/commit/83664f327df1e106685132199f2d0506b42609ad), [`7130e8c`](https://github.com/prefix-tree/cutcraft/commit/7130e8cf75b2c8e026f3e8950400f8106adbe98c), [`0803ecf`](https://github.com/prefix-tree/cutcraft/commit/0803ecfd09d9e75c61ac504955ef7e9c7e177acd), [`e5e2ef0`](https://github.com/prefix-tree/cutcraft/commit/e5e2ef0ff232c254285dc1de074d4119af3b8cc4), [`0a6b41a`](https://github.com/prefix-tree/cutcraft/commit/0a6b41a6703b784288cadfbbb3e963d3b9723c22), [`47b40b0`](https://github.com/prefix-tree/cutcraft/commit/47b40b0fc69a3c338ef44c252bcc193fc505abad), [`80a5673`](https://github.com/prefix-tree/cutcraft/commit/80a5673db211290f52e058630664af27b2327c6e)]:
  - @cutcraft/render@0.2.0
