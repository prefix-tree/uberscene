---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": patch
"@uberscene/render": patch
---

A number that can change over time can be linked to another element's:
`transform={{ rotation: { link: "logo.transform.rotation", scale: 2, offset: 10, delay: 0.25 } }}` is the logo's
rotation at the same moment of the video, times `scale`, plus `offset`, `delay` seconds late. A link reads whatever
is written there (a number, keys, a wiggle, a drift, a loop, another link), on `transform`, `box.x` and `box.y`, a
shape's own numbers, a camera's values, a sound's `volume` and `pan`, and an effect's numeric params
(`logo.effects.0.radius`).

The resolver writes a link as the keys and the generator of the value it names, the way a camera's `push` becomes
camera keys, so the preview, the export, motion blur, the frame cache and the checks read it as any keyed value. A
link to an element that does not exist is `UNKNOWN_REF`, to a value that is not a number `WRONG_KIND`, and a circle
of links is `CYCLE`, with the links it goes through. The key actions refuse a linked value and say where its keys
are. Removing the element a link names leaves the motion in place, written out as keys.
