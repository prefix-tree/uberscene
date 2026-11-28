# Decision records

Why UberScene is built the way it is, one decision per file, in the order they were
made. A record is never edited to say something else; a change of mind adds a
new record that supersedes the old one. [Core principles](../guide/principles.md)
sums them up.

| | Decision |
|---|---|
| [0032](./0032-native-codecs-behind-a-flag.md) | Native codecs behind a flag: craft-video decodes and encodes with `UBERSCENE_CODECS` (experimental) |
| [0033](./0033-time-in-ticks.md) | Time in ticks: frame and sample conversions count 1/254,016,000,000 s, NTSC rates are exact, drop-frame timecode |
| [0034](./0034-the-editor-is-a-constructor.md) | The editor is a constructor of building blocks with context and hooks; its styling is a shadcn registry (accepted in part: the registry and its demo) |
| [0035](./0035-everything-is-a-prop.md) | Everything about an element is a prop: keys over time, `effects` and `freezes` as values, `<Keyframe>`, `<Effect>`, `<SpeedKey>`, `<Freeze>` and `automation` removed |
| [0036](./0036-clips-straight-in-the-composition.md) | Clips straight in the composition are its main track: the bottom one, id `main`, with `<Track>` for the rows above |
| [0037](./0037-a-3d-shot-on-the-timeline.md) | A 3D shot on the timeline: a module builds the scene, the `<Three>` tag stages it with literal objects, keys in shot time and marker-tied keys (proposed, prototype in `examples/3d`) |
| [0038](./0038-generated-takes-from-the-blockout.md) | Generated takes from the blockout: takes are assets beside their shot, compared at the same moment; first experiment measures whether a 0.5 s move of the reveal survives generation, by text or by blockout (proposed) |
| [0039](./0039-a-person-cut-out-of-the-background.md) | A person cut out of their background: a matte beside the footage, `cutout` on a clip, `uberscene matte` with a registry of matting models; what an interview edit found hard, and seven models measured (proposed) |
| [0040](./0040-a-3d-scene-is-a-clip-source.md) | A 3D scene is a clip source: a plain scene file with `stage` data, played by `<Clip src={scene} times={…}>`; replaces the `<Three shot>` shape of 0037 |
| [0041](./0041-motion-design-seams.md) | Motion design on the timeline: four seams (analyses in the manifest, one `matte` prop with many sources, an optional `<Camera>` around tracks and `follow`, generated motion as a third kind of value) that DaVinci-style edits plug into (proposed) |
| [0042](./0042-music-as-code.md) | Music as code: a Strudel score is an audio source, `<Audio src={score}>`, with `beat`, `bar`, `section` and `hit` moments from the pattern, sections placed by `times`, `useScore` in a layer, one offline renderer for preview and export; Strudel (AGPL) fetched at run time, never shipped (proposed) |
| [0043](./0043-sync-an-llm-can-read.md) | Sync an LLM can read: beats and roles as `inspect` rows, every moment in one events list, and `--check-sync` (each cut and start against its nearest beat, `near-beat` and `music-cut-off`), as text and JSON with no browser; documented in a guide page and a skill reference |
| [0044](./0044-timeline-time-in-ticks.md) | Timeline time is stored in ticks: files keep seconds, the resolver turns them into whole ticks once, `Placement` carries a `TimeRange`, seconds come back out only for display, animation and write-back; same unit and shape as craft-time; supersedes 0033's seconds in the resolver |
| [0045](./0045-time-as-a-class.md) | Timeline time is a `Time` class: immutable, whole ticks, exact parsing of `"0.4"` and of seconds, all math as methods, no number operators; `TimeRange` is a class too; amends 0044's branded `Ticks` |
| [0046](./0046-how-the-vocabulary-grows.md) | How the vocabulary grows: an element kind is a closed type with typed props, a folder of the same name in each package and a line in each registry, checked by the build, a conformance suite and a scaffold; what a schema says (traits, key paths, action targets, references) is read from it; every reference between elements is an edge of one graph (one grammar, marked props, one registry, uniform errors, dependents and repairs read from it); no expression language, a value linked to another (`{ link, scale, offset, delay }`) in its place; counts of kind checks and props casts that may only go down (built for six overlay kinds; the rest listed) |
| [0047](./0047-keep-craft-libs-codecs.md) | Keep craft-libs as the codec layer: this repository owns only `native/` and its protocol, codec fixes go upstream and the pin moves; "its own codecs" means no FFmpeg and no browser dependency for formats that matter; toward a default in three measured steps (native decode as a fallback for footage Chrome cannot decode, then its default for those formats, native encode opt-in until it is as fast as the browser's); the preview may decode natively through a local helper, the hosted page stays browser only; builds on 0032 |
