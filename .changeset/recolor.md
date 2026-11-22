---
"@uberscene/kit": minor
---

A `recolor` effect turns one colour into another and leaves the rest of the picture: `effects={[{ type: "recolor", from: "#c4202b", to: "#2f9e4f" }]}` makes a red cup green while the steam, the background and the cup's shading stay as they were. `tolerance` and `softness` say how close a hue must be to `from`, greys and whites are never touched, and `amount` mixes it in. Like every param, each can take keys.
