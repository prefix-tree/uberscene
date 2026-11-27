---
"@uberscene/sdk": minor
"@uberscene/player": minor
---

A placement says whether its props parsed: `Placement.parsed`. When it is true, `props` are what the kind's schema
parsed, every prop of its type and every default filled.

What the schema refuses is still reported and left out, now as narrowly as the rest allows. A refused key inside an
object prop goes alone, so `style={{ size: -1, color: "#f00" }}` keeps its colour and takes the default size; before,
the whole element fell back to its props as written. If the object does not parse without that key, the whole prop is
left out, as a refused prop of the element itself always was.

An element that still does not parse (a prop it cannot do without is missing or wrong, such as a `<Sticker>` with no
`src`) has `parsed: false` and its props as written. It keeps its place on the timeline, its row and its errors, and
it is no longer drawn or played: before, the player drew what it could from the written props. Only files that
already had a `SCHEMA` error on such an element change.
