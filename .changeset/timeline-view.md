---
"@uberscene/kit": minor
"@uberscene/sdk": minor
---

`<TimelineView>` draws a film's own timeline as an editor shows it: a lane for each track (overlapping clips stacked
in more lanes), its clips as named blocks, each sound's waveform, and a playhead on the clock. `timelineLanes(state)`
in the SDK makes its lanes from any resolved timeline, with each sound's level from the waveform `uberscene add`
measured.
