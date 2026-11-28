---
"@uberscene/kit": minor
"@uberscene/sdk": minor
---

`<TimelineView>` draws a film's own timeline as an editor shows it: a lane for each track (overlapping clips stacked
in more lanes), its clips as named blocks, each sound's waveform, and a playhead on the clock. `timelineLanes(state)`
in the SDK makes its lanes from any resolved timeline, with each sound's level from the waveform `uberscene add`
measured.

It draws as an editor's timeline does: a picture clip's frames (`thumbs`), fine waveforms as thin strokes, fade
ramps, markers in a strip on top, a thin playhead with a head, and the clip in play outlined. `timelineLanes` gives
each clip what it plays (`title`), its `fade`, a level per 10 ms, and the file's markers.


`ground` draws it as a background, so the layout check does not hold it to the safe zone: for a timeline that runs
under a phone app's buttons, as in a sound-breakdown post.
