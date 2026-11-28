---
"@uberscene/kit": minor
"@uberscene/sdk": patch
---

An action that writes a prop applies to the kinds whose schema has that prop.

`@uberscene/sdk`: `clip/setSpeed`, `clip/setReverse`, `audio/setFade` and `audio/setDuck` are no longer offered on a
nested composition (`affordances()`, `can()`), which has no `speed`, `reverse`, `fade` or `duck`. Each was offered
and then refused for breaking the file; it is now refused by name ("clip/setSpeed does not apply to <nested>").
`audio/setVolume` on a nested composition is unchanged.

`@uberscene/kit/schema` exports `kindTakes(kind, prop)`: whether a kind's schema has a prop.
