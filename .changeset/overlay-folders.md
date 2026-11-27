---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": patch
"@uberscene/render": patch
"@uberscene/editor": patch
---

An SVG, a sticker, a layer and an adjustment each have a folder of their own in every package, as a title and a
shape do.

`@uberscene/kit/schema` exports `schemaFor(kind, props)`: the schema an element as written is checked against, which
for a `<Three>` or `<Motion>` layer is its engine's. `ENGINE_SCHEMAS` stays and is deprecated for it. It also exports
`keepsInterior(kind)` (whether a kind's children are free code and not elements: a layer's), and the element types
`SvgElement`, `StickerElement`, `LayerElement` and `AdjustmentElement`. A `KitElement` may say `variants` (the schemas
of a kind that more than one tag writes), `interior` and `sampleBeneath`.

`@uberscene/sdk`: an `SdkElement` may say `cannotBeFollowed`, which is where "an SVG read from a file can't be
followed yet" now comes from.

No file is written differently, and nothing is drawn differently.
