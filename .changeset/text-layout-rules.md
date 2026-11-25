---
"@uberscene/render": minor
---

`--check-layout` checks titles against each other and against their box. `text-over-text` reports a title whose ink overlaps another title's, once per pair, on the one drawn over it, with a move or "start it after" as the fix. `text-fit` reports a title whose whole text (as it is once every word shows) spills out of its box, across or down, or wraps in a box the file gives a width, with the box size or font size that fixes it. A wrap in a title laid out across the frame, or at a line break the text writes, is not reported.
