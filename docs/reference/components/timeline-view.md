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
| `markers` | { time, label, color }[] | `[]` | Marks above the lanes, as an editor's ruler shows them: the film's markers, or moments chosen to point at. |
| `box` | { x, y } | `{"x":60,"y":1060}` | The timeline's top left, in pixels from the frame's top left. |
| `width` | number (> 0) | `960` | The timeline's width in pixels: the film's length (or the window) across it. |
| `height` | number (> 0) | `720` | The timeline's height in pixels: the strip of markers on top, then the lanes. |
| `from` | number (0..∞) | `0` | The film's second at which the layer starts: the playhead is there, then moves with the layer's clock. |
| `window` | number (> 0) |  | Seconds across the view. Left out: the whole film, the playhead sweeping once. With it, the view scrolls. |
| `labels` | boolean | `true` | Write each clip's name on it: its element id, and what it plays. |
| `ruler` | boolean | `true` | Number the seconds in the strip on top. |
| `ground` | boolean | `false` | Draw it as a ground, as a background is: the layout check does not hold it to the safe zone. For a post whose timeline runs under the app's own buttons and caption, as an editor's screen in a phone video does. |
| `colors` | { ground, lane, picture, sound, wave, waveLit, text, playhead, active, marker } | `{"ground":"#1b1e25","lane":"#22262e","picture":"#1f7a7f","sound":"#2d8a52","wave":"#a9f2c0","waveLit":"#e9fff0","text":"#e8f5ec","playhead":"#ff3b30","active":"#ff8a3d","marker":"#b06bd0"}` | The colours of the ground, lanes, picture and sound clips, waveforms, names, playhead, the clip in play, markers. |

[All components](/reference/components/)
