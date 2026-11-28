---
"@uberscene/sdk": patch
---

`clip/setAnchor` is offered only on elements whose kind takes an `anchor`, and it no longer fails with
`BREAKS_FILE` on an element with a written `start`: anchoring replaces the start with the anchor and offset, and
taking the anchor off writes back the start the element stood at (on a free track, which needs one).
