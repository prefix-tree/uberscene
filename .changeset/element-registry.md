---
"@uberscene/kit": minor
"@uberscene/sdk": patch
---

A new element kind is listed in fewer places: a registry in each package and the kit's tags, where it was eleven files.

`@uberscene/kit/schema`: a `KitElement` says its `summary` (its sentence in the reference) and its `group` (the
heading it is filed under, an `ElementGroup`). `MigratedKind` is read from `KIT_ELEMENTS`.

`@uberscene/sdk`: `PlacementMap` gives a kind without a named placement type `Parsed<kind>`, so a new kind has a
typed placement with nothing added. The named types (`PlacedTitle` and the others) are unchanged.
