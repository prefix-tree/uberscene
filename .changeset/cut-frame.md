---
"@uberscene/player": patch
---

The frame at a cut shows the new clip. A sequence adds its lengths up in seconds, so clips of 0.1 s and 0.2 s end at 0.30000000000000004, a hair past frame 9's start at 30 fps, and the player and the export drew one more frame of the old clip there: a flash at the cut. Placements and transitions are now compared in ticks, the same grid every frame starts on.
