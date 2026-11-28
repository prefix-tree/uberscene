---
"@uberscene/kit": minor
"@uberscene/sdk": minor
---

A prop that names something else in the file says so in its schema, and the SDK reads references from there.

`@uberscene/kit/schema` exports `ref(type, schema)`, which marks a value as a reference of one kind (`anchor`,
`follow`, `push`...), and `refSitesIn(schema)`, every place a schema holds one: a prop, a list of them, an object of
them by name, one way of writing a value. `RefSite` is one such place.

In `@uberscene/sdk`, an entry of `REF_KINDS` no longer has `holders` and `read` (a link keeps `read`): it says how
the text at a marked prop reads as what it names (`written`) and how its holder reads as a dependent (`dependent`).
`RefName` is the name of a way to refer, and `RefDependent` every entry's dependent, which `Dependent` is with a
transition `beside` a clip. An anchor, a length that matches and a time written as a marker are read only on the
kinds whose schema has the prop.
