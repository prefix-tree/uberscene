---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": patch
"@uberscene/render": patch
---

Every reference between elements is in one graph, `state.refs`: an edge for each anchor, follow, transition edge,
matched or bounded length, camera push target, ducked track, marker and scene time, with an index each way and an
order to work them out in. The ways to refer are entries of `REF_KINDS`, and the text of a reference is read by one
grammar, `parseRef` and `refPattern` in `@uberscene/kit/schema`.

Two error codes are new, with the messages unchanged. A `follow` onto something that cannot be followed (another
kind, an SVG read from a file) is `WRONG_KIND`, and a `follow` across the camera's edge is `WRONG_SCOPE`; both were
`SCHEMA`. A camera `push` that names an element not on the camera's tracks is `WRONG_SCOPE`; it was `UNKNOWN_REF`.
Code that matches on those codes needs the new names.
