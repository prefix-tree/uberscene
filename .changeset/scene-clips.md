---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": minor
"@uberscene/graphics": minor
---

A clip can play a 3D scene: `<Clip src={crossing} times={{ reveal: "marker:reveal" }} />`, where `crossing` is a plain JavaScript scene file that exports `length`, `stage` (where things stand and how they move, as data) and `build` (three.js, once), and optionally `sample`. The clip treats it as footage: trims, speed, holds, transitions and the export work as they do for a file, in the scene's own seconds. A key's `at` may name a time the clip hands in, so a pose lands on a beat wherever the clip or the marker moves. `editStage` in `@uberscene/sdk` writes a viewport change into the scene file's `stage`. `installFreeCodeLibraries` installs the three.js scene source (`installSceneSource` in the kit). Video files may import plain `.js` modules.
