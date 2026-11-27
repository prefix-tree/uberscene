---
"@uberscene/kit": minor
"@uberscene/sdk": minor
---

The paths a key may sit at are one table per kind: `keyPathsOf(kind)` and `keyPathOf(kind, path)` in
`@uberscene/kit/schema`, with `KeyPath` saying how each value moves and what stays written. The key actions
(`key/add`, `key/setAll`, `generator/set`) now refuse a path the element's kind does not have, such as `volume` or
`speed` on a title, where they used to write keys that nothing read. The error names the paths the kind takes.
