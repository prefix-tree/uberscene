---
"@uberscene/kit": patch
"@uberscene/sdk": patch
---

A list of keys on `transform.scale` can give each key `{ x, y }`, for squash and stretch: `scale={[{ at: 0, value: 1 }, { at: 0.5, value: { x: 1.3, y: 0.7 } }]}`. Each axis takes its own half. Before, the file resolved without an error but each axis got the whole `{ x, y }`, and the element was drawn at the frame's top left corner.
