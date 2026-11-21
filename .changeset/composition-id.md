---
"@uberscene/sdk": patch
---

A composition written with an id of its own (`<Composition id="intro">`) can be edited. Its settings, fonts and markers
are addressed as `"composition"`, but the composition took the id the file gave it, so `composition/updateSettings`,
`font/use` and the rest were refused with `element "composition" does not exist`. The composition is now always
`"composition"` to the resolver and the fold, and the file keeps the id it was written with.
