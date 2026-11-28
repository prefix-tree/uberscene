---
"@uberscene/sdk": patch
---

Removing a track no longer leaves a sound ducking under nothing. A `duck` that names the track by its id, or by a
role no other track has, is dropped in the same edit; one that names a role another track still has stays. A
camera's `push` also stops naming the elements that go with the track. Undo puts it all back. `dependentsOf` lists
the sounds that duck under a track.
