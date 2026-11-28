---
"@uberscene/sdk": patch
---

Removing a track no longer leaves another track's elements pointing at what went with it: one anchored to an element
of the track keeps its start, a length that matched one keeps its seconds, and one that followed one stays where it
was drawn. Before, `track/remove` was refused as breaking the file.
