---
"@uberscene/kit": patch
"@uberscene/sdk": patch
"@uberscene/player": patch
"@uberscene/render": patch
---

The other element kinds have folders of their own in each package, as titles and shapes do: what each is (its
schema, its traits, its drawing, its sound) is said in one place per package, and a kind is named only there. Files
draw and sound as before. `@uberscene/kit/schema` exports the kit's part of each kind (`ClipElement`, `AudioElement`,
`NestedElement` and the rest).
