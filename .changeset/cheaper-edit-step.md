---
"@uberscene/kit": patch
"@uberscene/sdk": patch
---

An edit while dragging costs a fraction of what it did. On a 200-clip project a trim takes about 0.14 ms (0.45 ms before), a prop change or a title moved about 0.06 to 0.08 ms (0.39 ms before); on 1,000 clips, about 0.7 ms and 0.35 ms (2.1 ms and 1.7 ms before). What a resolve gives is unchanged: a test holds every cached resolve to one worked out from nothing.

- The resolver keeps what an edit did not reach: a track's elements with their placements, an anchored element while the element it is anchored to is the same, and on a trim the elements after it, moved in time.
- A patched tree's `byId` is built when it is first read, not on every edit.
- `Time.plus`, `plusClamped` and `minus` return the time itself for a zero, and a `Time` is made without building the text of an error it rarely throws.
- `pnpm bench:edit` prints what one edit costs, the `Time`s it makes and how many placements it makes anew.
