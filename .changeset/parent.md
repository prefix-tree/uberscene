---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": minor
"@uberscene/render": minor
---

An overlay can move with another one: `<Shape id="hand" parent="arm" ... />`. Titles, shapes, SVG, stickers and layers take `parent`, and any of them can be a parent. The child's `box` is then read in its parent's box (pixels from its top left, centred in it when `x` or `y` is left out), and the parent's place, rotation, scale and `enter`/`exit` carry it, up the chain. Opacity, crop and corner rounding stay the child's own. A parent places its children even outside its own start and duration, held at its first or last moment.

- The resolver names a `parent` that does not exist, one that is not an overlay, a child and parent on different sides of a `<Camera>`, and a circle of parents (every element in it).
- Removing a parent hands its children to its own parent, or to none, in the same undoable edit.
- A camera `push` makes room for a parented element where it really stands.
- `uberscene inspect` says what an element moves with and where it lands; the layout check measures after the parents and gives its fix in the child's own numbers; the frame cache redraws a child when only its parent changed.
- `spaceOf` (the frame and matrix an overlay is placed in) is exported from `@uberscene/player/engine`.
