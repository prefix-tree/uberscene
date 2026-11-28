---
"@uberscene/render": patch
---

`uberscene add --bpm` and `--first-beat` work again: they crashed with "Cannot read properties of undefined", as the
two flags were missing from the number checks.
