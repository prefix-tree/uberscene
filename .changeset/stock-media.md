---
"@uberscene/render": minor
"@uberscene/sdk": minor
---

`uberscene find` searches a stock library for footage or sounds, `uberscene fetch` brings a result into the project,
and `uberscene credits` writes the credits. The libraries are Pixabay (videos; `PIXABAY_API_KEY`) and Wikimedia
Commons (videos and sounds; no key). A fetched asset's manifest entry keeps where it came from, its author and its
licence (`source`). `findStock`, `fetchStock` and `stockCredits` do the same from a script.
