---
"@uberscene/render": minor
"@uberscene/kit": patch
"@uberscene/player": patch
---

`--check-layout` reports a title on screen for less than 0.5 s plus 0.3 s a word (rule `read-time`), plus the time its words take to type in or appear one by one. It is worked out from the resolved timeline, points at the title's `duration`, and gives the seconds it has and the seconds it needs. `checkReadTime(state)` runs it alone. Kit exports `titleWords` and `readTimeNeeded`, and the player counts a word-by-word title's words with the same split.
