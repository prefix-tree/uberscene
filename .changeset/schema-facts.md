---
"@uberscene/kit": minor
"@uberscene/sdk": patch
---

What a schema says of an element kind is read from the schema, and no table writes it a second time.

`@uberscene/kit/schema`:

- The paths a key list may sit at are read from each kind's schema: a value written with `animatable`, `keyed` or
  `linked` is marked, and `keyPathsIn(schema)` walks a schema once. `keyPathsOf(kind)` answers as before, in the same
  order. `TRANSFORM_KEY_PATHS`, `BOX_KEY_PATHS`, `PLACED_KEY_PATHS`, `AUDIO_KEY_PATHS`, `VOLUME_KEY_PATHS`,
  `CAMERA_KEY_PATHS`, `SHAPE_KEY_PATHS` and `CAMERA_FIELDS` stay, read from the schemas.
- A `KeyPath` has `generated`: whether the value takes a generator. A sound's level and pan are numbers that do not.
- `capabilitiesOf(kind)` reads `transformable`, `audio`, `trimSource`, `container` and `keyPaths` from the kind's
  schema and child kinds. A kind's own row is a `KindTraits`, which has none of them.
- A `KitElement` says its row as `traits` (it was `capabilities`).
- A track holds every kind placed on one: a kind with a folder of its own needs no line in the track's list.

No file is written differently, and nothing is drawn differently.
