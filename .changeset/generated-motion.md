---
"@uberscene/kit": minor
"@uberscene/sdk": minor
"@uberscene/player": minor
---

A value can be computed instead of keyed: in place of a number or a list of keys, a generator. `{ type: "wiggle", amount: 2, frequency: 0.6 }` adds a smooth, seeded wobble; `{ type: "drift", speed: 0.06 }` adds a steady change; both go over an optional `base` (a number or keys), so a wobble sits on top of a keyed move. `{ type: "loop", keys, mode }` plays a key list again, or back and forth. Generators work on everything keys can move in `transform` and `box`, on numeric effect params and on a camera's values (on a pushed camera, on top of the push); not on `speed`, `volume` or `pan`. A frame is the same in the preview, the export and from the cache.

- New action `generator/set` writes a generator at a path or takes it off; the number or keys there become its `base`. The key actions work on the keys under a generator.
- Timeline rows list generators (`generators`).
- `@uberscene/kit/schema` exports `generatedValue`, `smoothNoise`, `isGenerator` and `GENERATOR_TYPES`.
