---
"@uberscene/sdk": patch
---

`affordances()` offers an edit that sets props only where its own test says it applies: removing, toggling or
updating an effect needs an effect to be there, moving or removing a key needs a key, and no key or generator edit is
offered on a kind with no value that changes over time (a gap, a transition).
