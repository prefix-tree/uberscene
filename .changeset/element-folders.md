---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": patch
"@uberscene/render": patch
"@uberscene/editor": patch
---

A title and a shape each have a folder of their own in every package, and the packages are typed against them.

`@uberscene/kit/schema` exports `KitElement` (what the kit says of one kind: its schema, its row in the kind table, a
sample), `KIT_ELEMENTS` (the kinds that have a folder, by kind), `MigratedKind`, `isMigratedKind`, `kitElement`, and
`PlaneOf`. It also exports `TITLE_LOOK_KEYS` (the fields of a title's look), `shapeSize` and `SHAPE_SIZE` (the size a
shape draws at when it writes none), `PLACED_KEY_PATHS`, and the trait groups a kind's row starts from.

`@uberscene/sdk` exports `SdkElement`, `SDK_ELEMENTS`, `sdkElement` and `restSizeOf`. A placement of a title holds its
words: `placement.text` and `placement.runs` (typed as required on `PlacedTitle`, listed in `PlacementFacts`), so
tools read them from the placement in place of the file's tree. An inspect row's `text` and the editor's text field
read them there.

No file is written differently, and nothing is drawn differently.
