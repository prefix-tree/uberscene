---
"@uberscene/kit": patch
"@uberscene/player": patch
"@uberscene/render": patch
"@uberscene/sdk": patch
"@uberscene/editor": patch
---

Times worked out by adding and subtracting seconds now land on the frame they mean. A sequence sums lengths in seconds, so 0.1 + 0.2 is 0.30000000000000004, and 0.4 minus that is 0.09999999999999998: a key, freeze, follower, step or word at 0.1 s into an element came a frame late, and a loop restarted a frame late. The time since an element started is now counted in ticks (`elapsedSeconds`), as are `stepAt`, `progress` and `loop` generators. Also fixed:

- `duration={{ until }}` and generated caption words no longer round to the ms, which made them outlive a clip that ends off the ms grid (121 frames at 24 fps) by a frame and could add a frame to the export.
- A transition as long as a clip whose length is a difference of seconds (in 1.1, out 1.3, a 0.2 s transition) is no longer refused, in the file or by `transition/add`.
- Split, trim, move and the other edits write times without float noise, and a frame-exact time stays exact (`tidySeconds`): from 10 s up, twelve significant digits moved a split a frame late. Splitting no longer puts a key or freeze that sits right at the cut on the wrong half.
- A partial export (`--from`, `--to`) starts and ends its sound on the frames it draws; the mixer no longer leaves out the sample at a cut; `inspect --at` and `look` describe the frame they name; `--still` picks the nearest frame, as `look` does, and never one past the end.
- `inspect` frame numbers are the first frame that shows an element, word or cut.
- Reverse playback no longer shows a frame twice when the container's timestamps are rounded to the ms.
- The editor's arrow-key nudge and timeline drag put a clip on its frame's exact start.
