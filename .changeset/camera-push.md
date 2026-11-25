---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": patch
"@uberscene/editor": patch
---

A camera can make room by itself: `<Camera id="cam" push={{ on: ["card-a", "card-b"] }}>`. As each element in `on` starts, the view moves as little as it can to hold it with everything else on the camera's tracks that is on screen then (or only what `keep` names): it pans the shortest way, and pulls back only when all of it cannot fit. `margin`, `duration` and `easing` tune it. The moves are worked out each time the file is read, so a card that moves takes the camera's move with it; `x`, `y` and `zoom` beside a push are numbers, where the view starts.

- New actions `camera/setPush` and `camera/bakePush`; the second writes the moves as keys on `x`, `y` and `zoom` and removes the push, for changing them by hand. The key actions refuse those three paths on a pushed camera and say so.
- The box placement rule (`placeBox`, `fitRect`, `placeAxis`) now lives in `@uberscene/kit/schema`; the player uses it from there.
- The shadcn editor's inspector offers "Turn its moves into keys" on a pushed camera.
