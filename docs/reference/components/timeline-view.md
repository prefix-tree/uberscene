---
editLink: false
---

# `TimelineView`

A film's own timeline as an editor shows it: lanes, clips with their names, waveforms, a moving playhead.

<Example src="previews/components/timeline-view" alt="TimelineView">

<<< @/../examples/showcase/components/timeline-view.tsx

</Example>

## Props

Besides the timing props (`start`, `anchor`, `at`, `offset`, `duration`):

| param | type | default | description |
|---|---|---|---|
| `id` | string |  | The component's id; its layer's id starts with it. |
| `lanes` | { id, track, role, kind, clips }[] |  | The film's lanes, as `timelineLanes()` of `@uberscene/sdk` returns them for its resolved timeline. |
| `length` | number (> 0) |  | The film's length in seconds. |
| `box` | { x, y } | `{"x":60,"y":1060}` | The timeline's top left, in pixels from the frame's top left. |
| `width` | number (> 0) | `960` | The timeline's width in pixels: the film's length (or the window) across it. |
| `height` | number (> 0) | `720` | The timeline's height in pixels, shared by its lanes under a ruler. |
| `from` | number (0..∞) | `0` | The film's second at which the layer starts: the playhead is there, then moves with the layer's clock. |
| `window` | number (> 0) |  | Seconds across the view. Left out: the whole film, the playhead sweeping once. With it, the view scrolls. |
| `labels` | boolean | `true` | Write each clip's name on it. |
| `colors` | { ground, lane, picture, sound, wave, text, playhead } | `{"ground":"#1c1f26","lane":"#252932","picture":"#2b7a80","sound":"#2f8a55","wave":"#9ff0b8","text":"#e8f5ec","playhead":"#ff3b30"}` | The colours of the ground, the lanes, picture and sound clips, the waveforms, the names and the playhead. |

[All components](/reference/components/)
