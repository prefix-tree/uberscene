---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": minor
"@uberscene/render": minor
---

An overlay can move with another one: `<Shape id="hand" follow="arm" ... />`. Titles, shapes, SVG, stickers and layers take `follow`, and any of them can be followed. The follower's `box` is then read in that element's box (pixels from its top left, centred in it when `x` or `y` is left out), and that element's place, rotation, scale and `enter`/`exit` carry it, up the chain. Opacity, crop and corner rounding stay the follower's own. An element places its followers even outside its own start and duration: before it, where its entrance leaves it; after it, where it stood before its exit.

- The resolver names a `follow` that does not exist, one that is not an overlay, an SVG read from a file (its size is only known once drawn), two elements on different sides of a `<Camera>`, and a circle of follows (every element in it).
- Removing an element others follow hands them to what it followed, or to none, in the same undoable edit, with their numbers written again so they stay where they were drawn.
- A camera `push` makes room for a following element where it really stands.
- `uberscene inspect` says what an element follows and where it lands, and its rows carry `follow`; the layout check measures after the chain and gives its fix in the follower's own numbers; the frame cache redraws a follower when only what it follows changed.
- Every overlay takes its size from one place (`overlaySize`), so where it is placed and how it is drawn agree; `spacesAt` and `spaceOf` (the frame and matrix an overlay is placed in) are exported from `@uberscene/player/engine`.
