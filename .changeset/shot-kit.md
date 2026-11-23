---
"@uberscene/kit": minor
---

A 3D shot on the timeline. `defineShot` declares a shot's objects and inputs and builds its three.js scene; `<Three shot>` stages it with literal props: `objects` (each `position`, `rotation`, `scale` as `[x, y, z]` or keys), `inputs`, and `in`, where in its own time the layer starts. Keys are in shot time, and a key's `at` may be `"marker:ID"`. The camera's `position`, `lookAt` and `fov` take keys. Decision 0037, with a prototype in `examples/3d`.
