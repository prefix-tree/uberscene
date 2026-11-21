---
"@uberscene/sdk": patch
---

Two save fixes:

- Saving no longer fails after an element is edited and its track then deleted. The fold wrote the edit and the
  track's removal over the same text and threw `overlapping edits`; any edit inside removed text now goes with it.
- A title with a line break, an entity such as `&amp;`, or spaces at either end is written in braces, so the file
  reads it back as typed. Plain JSX text joined the lines into one and decoded `&amp;` to `&`.
