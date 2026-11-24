# Motion across cuts

For single techniques by name (an overshoot, a stagger, a match cut), see [motion-catalog.md](motion-catalog.md).

Read this before you animate a video with more than one scene. A film is one movement cut into shots, not a row of
separate animations. Two mistakes come from writing scenes one at a time: the eye stops at every cut, and each scene
fidgets between its entrance and its exit.

## Every cut hands motion over

Where two clips meet, the second picks up the motion the first was making. Check four things at each cut:

- **The same axis.** Sideways stays sideways, up stays up, in depth stays in depth.
- **The same direction.** A shot that leaves to the left is followed by one that comes from the right and keeps
  moving left. In depth, the direction is whether the picture grows (pushing in) or shrinks (pulling back). A shot that
  shrinks away, followed by one that grows from small, reverses the move. That's the easiest one to miss, because
  "grow from small" is everyone's default entrance.
- **The same speed.** The first shot speeds up into the cut (`easing: "easeInQuart"` on its last key) and the second
  leaves it fast and settles (`easing: "easeOutQuart"` on its first key), over the same distance and time.
- **Still moving.** Cut while both are in motion. A shot that comes to rest before the cut, or one that starts from
  rest after it, is a dead beat.

A push that carries through a hard cut (`at` is seconds into each clip):

```tsx
<Clip id="a" src="asset:product" in={0} out={3} fit="cover"
  transform={{ scale: [{ at: 2.6, value: 1, easing: "easeInQuart" }, { at: 3, value: 1.25 }] }} />
<Clip id="b" src="asset:founder" in={4} out={9} fit="cover"
  transform={{ scale: [{ at: 0, value: 0.85, easing: "easeOutQuart" }, { at: 0.4, value: 1 }] }} />
```

Both shots grow, so the push never stops. The `zoom` transition is different: the first clip grows and the next one
shrinks down from large. Use it as a hit, not as a push.

`push` moves both clips the same way, so give it a `direction`. `slide` brings the next clip in, and `pushOut` moves
the old one too. `wipe` moves only an edge. `crossfade` carries no motion at all: use it for time passing or a change
of mood.

## One direction for the film

Pick the direction ordinary cuts travel, and keep it: by default `left`, so the next scene comes in from the right.
Then a different direction means something:

| Move | What it says |
|---|---|
| Left (the default) | next: the story goes on |
| Up | a conclusion or a reveal |
| Pushing in | deeper into the same idea |
| Pulling back | the big picture arrives |

Don't go back and forth in two cuts in a row. Turn only for a reason the viewer sees: a tap, a hit, a new chapter.

## Plan the cuts first

Before you write the timeline, write one line per cut: its time, how the first shot leaves, how the next arrives, and
what the eye follows across. If a row doesn't match, change the plan, not the easing. Keep it as a comment above the
composition so the next edit can check against it.

```tsx
// Cuts: 3.0 s, both shots grow, the cup carries it. 7.4 s, push left, the title carries it.
```

## Give the eye something to follow

The eye follows a thing, not an idea. The best cuts carry one object across at the same place and speed: a title that
slides through, a shape that shrinks into its place in the next layout, a logo that flies into its slot. Put it on its
own free track, anchored to the first clip, with `box.x` or scale keys that keep moving through the cut while the clips
change underneath. With nothing to carry, let each scene's subject do it: the first leaves part of the way, the next
arrives already moving.

## One thing causes the next

Chain moves so each one is started by the one before: a tap, a squash, a release, a flight, a landing, a reveal.

- An effect starts on the frame of its cause: anchor it there (`anchor="tap" offset={0}`), with its sound anchored to
  the same moment.
- Heavy things react slowly; light things snap.
- Change direction only when a force does it.

## Never idle

Between coming in and going out, a scene is always doing something that means something.

- No breathing, floating or pulsing to fill time. A loop that goes nowhere says "the video is waiting".
- A scene that finishes its entrance with seconds to spare needs more story, not more motion.
- Stop on any second: something should be under way.

What fills the time: content that arrives with the narration (titles anchored to words, a `wordByWord` title, the
`point-list` block), a camera move that goes somewhere (keys on scale and `anchor`), the product doing its job (a
`Counter`, a chart that grows, a highlight that steps), or a pointer that leads to a tap that starts the next beat.

## Timing

- Leave 0.3 to 0.75 s between a big action and its result. Straight from one to the other, the result is lost.
- An entrance takes 0.8 s at most. A longer build is several things in a stagger.
- An exit takes about three quarters of its entrance.
- A whole stagger takes 0.5 s at most; with many items, shorten the step.
- No bounce or elastic eases. A small overshoot (`easeOutBack`) on an entrance is fine.
- Things of one kind share one ease and one duration.
- Two or three kinds of transition per film, repeated. The default is a cut with matched keys, or a `push` in the
  film's direction.

## Check it

- `uberscene look video.tsx --around <cut>` draws five frames through a transition. Both sides should be moving the
  same way.
- `uberscene look video.tsx --motion 2.6..3.4` draws a strip across a cut. What the eye follows should travel one way
  without stopping at the cut.
- `uberscene inspect video.tsx` prints every cut's time, so the plan matches the file.

Any change to a scene's first or last second (a trim, a new word cut, a re-timed voice-over) means checking that cut
again. And cut on the words (`in="word:5"`, `out="word:30.end"`); never squeeze a sentence to fit a slot.
