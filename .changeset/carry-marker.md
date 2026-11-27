---
"@uberscene/sdk": patch
---

Removing a marker no longer breaks the times written as it. A clip's `in` or `out`, a caption cue's `start` or `end`
and a scene's `times` that read `marker:ID` become the seconds the marker stood at, in the same edit, so nothing on
the timeline moves. Undo puts the marker and the references back. `dependentsOf` lists what names a marker.
