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
