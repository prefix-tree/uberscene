---
"@uberscene/render": patch
"uberscene": patch
---

The agent skill gets numbers for motion and sound: a table of durations and eases by kind of move, springs by damping ratio (1.0 for text, 0.8 for products, 0.5 for characters, with the `damping` that gives each), stagger, overlap and follow-through; effects one frame after their picture, -14 LUFS and at most -2 dBTP measured on the rendered file too; a hero at least 15 % of the frame's width; a check for stretches where nothing moves; a "when it goes wrong" table in `review.md`; and what "done" means.
