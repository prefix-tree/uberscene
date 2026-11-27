---
"@uberscene/kit": patch
---

A sound's `volume` and `pan` say in their schema that they take a link to another value
(`volume={{ link: "talk.volume", scale: -0.5, offset: 1 }}`). The resolver already read one; the prop's type refused
it, so a file that wrote it worked and did not type-check. A generator there is still refused: the mixer reads a
level and a pan from keys.
