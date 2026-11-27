---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": patch
"@uberscene/render": patch
---

An element kind is a closed type, and a placement can be read as its kind.

`@uberscene/kit/schema` exports `Kind` (the kinds, and nothing else), `KindProps` (each kind's props once its schema
has parsed them) with a named interface per kind (`TitleProps`, `ShapeProps`, `ClipProps`…), the props many kinds
share (`TimedProps`, `PlacedProps`, `OverlayProps`, `VisualProps`, `FitProps`, `EntranceProps`, `SoundProps`),
`KindWith<"transform">` (the kinds whose props have a prop), `KINDS` and `isKind`. `capabilitiesOf`, `keyPathsOf`,
`keyPathOf`, `isDomOverlay`, `onOverlayPlane`, `isSequenceItem` and `applyTheme` take a `Kind`, so a misspelled kind
does not compile; `kindsWhere` and `kindsWithProp` return kinds. Code that passes a string from outside (a tag read
from a file, an action's JSON) checks it with `isKind` first.

`@uberscene/sdk` types a node's, a placement's, a node spec's, an inspect row's and an affordance's `kind` as `Kind`,
and adds placements typed by kind: `Parsed<K>`, `Unparsed`, `Placed` and one named type per kind (`PlacedTitle`…),
with `placed(placement, "title")`, `typed(placement)` and `hasProp(placement, "transform")` to narrow a placement
and read its props with no cast. `propsAsWritten(placement)` gives a resolver-made element's props without the
defaults filled in.

A camera push's keys no longer carry an `id` in their props (it is the item's id), and a multicam's clips hold the
clip schema's defaults (`speed`, `reverse`) like any other clip.
