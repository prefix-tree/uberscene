---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": minor
"@uberscene/render": minor
"@uberscene/editor": patch
---

A `<Camera>` moves the tracks written inside it as one: `<Camera id="cam" x={…} zoom={…}><Track>…</Track></Camera>`. `x` and `y` say where the view has moved in pixels, `zoom` how close it is about the frame's centre, `rotation` how far it is turned; each is a number, or keys on the video's clock. Footage, titles, shapes, layers and nested sequences on those tracks move, zoom and turn together, each keeping its own place and entrance; tracks outside the camera, captions and the background stay fixed to the screen, and tracks still draw in the order the file writes them. A file without a camera draws as before, and a composition has at most one.

- The layout check measures after the camera and gives its fix in the element's own numbers; `inspect` gives the camera's values at a moment and marks the elements under it; timeline rows say which tracks the camera holds.
- New actions `camera/add`, `camera/update` and `camera/remove`; the key actions take a camera's `x`, `y`, `zoom` and `rotation`.
- `track/add`, `track/reorder`, `track/duplicate` and `track/restore` count a camera's tracks in the camera's place, and take `camera: true | false` to decide at its edge. In a file without a camera their positions mean what they did.
- The shadcn editor lists the camera in the layers panel and edits its values in the inspector.
