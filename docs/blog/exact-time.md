---
title: Exact time, and why a cut never lands a frame off
description: What shipped in UberScene's timing this month. A one-frame flash at a cut traced to 0.1 + 0.2, and the move that fixes the whole class of bug, timeline time stored in ticks and carried by a Time class.
sidebar: false
outline: [2, 2]
---

# Exact time, and why a cut never lands a frame off

<p class="blog-meta">November 27, 2026 · DAN</p>

This one starts with a bug you could barely see. At some cuts, the player showed one frame of the old clip before the
new one: a flash. The export did it too.

## The bug: 0.1 + 0.2

A sequence finds where each clip starts by adding up the lengths before it. Clips of 0.1 s and 0.2 s end at
`0.1 + 0.2`, which in JavaScript is `0.30000000000000004`. At 30 fps, frame 9 starts at exactly `0.3`. So the first
clip ended a hair past frame 9's start, and frame 9 drew the old clip.

We fixed that cut by comparing in ticks
([#264](https://github.com/prefix-tree/uberscene/pull/264)). Then we went looking and found about thirty more places
with the same shape: a key, a freeze or a word that fired a frame late, a subtraction that came out just under the
length it meant ([#265](https://github.com/prefix-tree/uberscene/pull/265)). Each got fixed, and we added a rule:
every turn of a time into a frame goes through the tick helpers.

A rule every new line of code has to remember isn't a fix. It's a bug waiting for the next contributor, human or model.

## The decision: time is ticks, not seconds

Professional tools don't store time as float seconds. Premiere counts ticks, OpenTimelineIO and Final Cut count
rational frames. So we made it the engine's rule
([decision 0044](https://github.com/prefix-tree/uberscene/blob/main/docs/decisions/0044-timeline-time-in-ticks.md)):

- **Inside the engine, timeline time is a whole number of ticks**, 254,016,000,000 a second, the same unit as
  Premiere. Every frame rate and sample rate divides it exactly, 23.976 and 29.97 included.
- **The file keeps seconds.** `start={2.5}` is what a person and a model write and read. The tick count divides 1000,
  so any time written to the millisecond is an exact number of ticks, and 0.1 and 0.2 add up to exactly 0.3.
- **Seconds turn into ticks once, where they come in**, and back into frames, samples or seconds only where they go
  out. Nothing in between adds, subtracts or compares seconds.

Before the resolver changed, we recorded golden frames: the first and last frame of every element in every example
and fixture, at 23.976, 24, 25, 29.97 and 60 fps ([#268](https://github.com/prefix-tree/uberscene/pull/268)). Each
step since has had to leave them exactly as they were, except for bugs it names. The resolver now places everything
in ticks ([#270](https://github.com/prefix-tree/uberscene/pull/270)), edits and `inspect` work in ticks
([#271](https://github.com/prefix-tree/uberscene/pull/271)), and the player reads placements through tick ranges
([#273](https://github.com/prefix-tree/uberscene/pull/273)).

## A time that refuses to be a number

A branded number was the first step, but a branded number is still a number. `a + b` and `a < b` compile, and each is
a way back to the bug. So a time became a class
([decision 0045](https://github.com/prefix-tree/uberscene/blob/main/docs/decisions/0045-time-as-a-class.md),
[#274](https://github.com/prefix-tree/uberscene/pull/274)):

```ts
import { Time, TimeRange } from "@uberscene/kit/schema";

const end = Time.seconds(0.1).plus(Time.seconds(0.2));
end.equals(Time.seconds(0.3));          // true
`${end}`;                               // "0.3s"

const clip = TimeRange.between(Time.seconds(0.3), Time.seconds(0.4));
clip.contains(Time.frames(9, { num: 30, den: 1 }));   // true: frame 9 is in it
clip.duration.toFileSeconds();          // 0.1, not 0.09999999999999998

end + 1;   // TypeScript refuses it; at run time it throws:
           // "a Time is not a number: use plus, minus, compare or isBefore, or toSeconds() for animation code"
```

`Time` holds whole ticks and nothing else. It's made from seconds, text, frames, samples or a container timestamp,
never by hand. All math is methods, exact by construction. It leaves as seconds only at the edge: for animation code,
which is continuous, and for writing back to the file as the shortest decimal that reads back to the same tick, so a
file says `2.2` and never `2.2000000000000003`. Past about 9.85 hours it throws instead of quietly losing ticks.

A placement's range is now a `TimeRange` of `Time` values
([#275](https://github.com/prefix-tree/uberscene/pull/275)). The old seconds fields stay for a release, then go. When
they're removed, code that still reads them won't compile, and that's how we'll know every reader moved.

## Why this matters

A model is bad at frame math. That's why cuts in UberScene name a word, a shot or a beat, and the engine works out the
frames. That promise is only as good as the engine's own arithmetic. If `word:12` lands one frame off because two
floats didn't add up, the model gets blamed for a bug it didn't write, and no check can explain it.

Exact time is the floor the rest stands on: the [checks](./the-video-checks-itself) report a title 101 ms off its beat,
and [the camera](./animation-and-camera) moves on the frame a card starts. Both need the frame to be the frame.

[Timing](/guide/time) · [Decision 0044](https://github.com/prefix-tree/uberscene/blob/main/docs/decisions/0044-timeline-time-in-ticks.md) ·
[Code on GitHub](https://github.com/prefix-tree/uberscene)
