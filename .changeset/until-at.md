---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/render": patch
---

`duration={{ until: "talk", at: "word:54.end" }}` ends an element where another plays a word, shot, silence or beat of its source, as an anchor's `at` starts one there. It follows that element when it is trimmed, moved or sped up. A moment the element trims out is an error on `duration`. Splitting the clip moves the length to the half that plays the moment, and trimming the moment away keeps the seconds it had. Components take it too, and `inspect` prints what a length follows (`until talk word:54.end`).
