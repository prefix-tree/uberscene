---
"@uberscene/kit": patch
"@uberscene/sdk": patch
---

`<Shape>`, `<Svg>` and `<Sticker>` take `ground`, as `<Layer>` already did: a card that a cut-out speaker sits on is marked as a ground, and the layout check leaves it out of the safe zone and the captions rules. `uberscene inspect` marks any such element `ground`.
