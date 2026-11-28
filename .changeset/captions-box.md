---
"@uberscene/kit": patch
---

A `<Captions>` box takes `x` and `y` as numbers only. Its schema allowed keys and a generator there, as an element's
box does, but nothing moved the captions by them: the block was drawn at a wrong place. A key list written there is
now a schema error that names the prop.
