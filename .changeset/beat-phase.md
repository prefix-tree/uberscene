---
"@uberscene/sdk": patch
"@uberscene/render": patch
"uberscene": patch
---

Beat detection puts the beats on the kick, not on a brighter hat between beats (low-frequency onsets count once more on their own), places each beat between analysis steps instead of on one, and no longer counts beats on into silence. The lint's `repeated-source` rule reads a clip with `in` and a `duration` as that long, not as playing to the end of its source, so shots cut from one long take are not warned about. The motion catalog gains a spring damping card, and the examples a film cut on the beat.
