---
"@uberscene/sdk": patch
---

Removing an element a camera's `push` names no longer leaves the push pointing at nothing. The element leaves
`push.on` and `push.keep` in the same edit, and a push with nothing left to make room for is taken off the camera.
Undo puts both back. `dependentsOf` lists the camera as a `push` dependent of the element.
