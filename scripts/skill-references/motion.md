# Motion: one continuous move

For single techniques by name (an overshoot, a stagger, a match cut), see [motion-catalog.md](motion-catalog.md).

Read this before animating a video of more than one scene. It decides what happens at every cut, and what a scene
does between coming in and going out. The failure it prevents: scenes written one at a time, so the eye's momentum
dies at every cut and each scene sways in place between its entrance and its exit.

Based on the `motion-doctrine` skill of [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0). Adapted
to UberScene:
- their HTML and GSAP are our TSX: keys, `<Transition>`, `enter` and `exit`, anchors;
- their ledger file and seam-gate script are a seam plan here, checked with `uberscene look`;
- their house style (cursors, launch-video specifics) is left out.

## The seam law

A seam is where one scene hands over to the next: two clips side by side on a track, cut or joined by a
`<Transition>`.

> How scene A leaves decides how scene B arrives: same axis, same direction, matched speed, cut while both are moving.

1. **Axis.** Horizontal stays horizontal, vertical stays vertical, depth stays depth. Never trade axes at a cut.
2. **Direction.** Never mirror. In depth, the direction is whether the scale grows (the camera pushes in) or
   shrinks (it pulls back). A scene that recedes, answered by one that grows from small, is mirrored. This is the
   most common mistake, because growing from small is everyone's default entrance.
3. **Speed.** B starts as fast as A ended. Pair the eases:
   - A's last key takes `easing: "easeInQuart"` (speeding up to the cut);
   - B's first key takes `easing: "easeOutQuart"` (leaving the cut fast and settling);
   - both use the same distance and duration.
4. **Phase.** Cut while both sides are moving. A scene that settles before the cut, or one that starts from rest
   after it, is a dead beat.

A matched push in depth, written as keys on each side of a hard cut (`at` is seconds into each clip):

```tsx
<Clip id="a" src="asset:product" in={0} out={3} fit="cover"
  transform={{ scale: [{ at: 2.6, value: 1, easing: "easeInQuart" }, { at: 3, value: 1.25 }] }} />
<Clip id="b" src="asset:founder" in={4} out={9} fit="cover"
  transform={{ scale: [{ at: 0, value: 0.85, easing: "easeOutQuart" }, { at: 0.4, value: 1 }] }} />
```

A grows into the cut and B keeps growing out of it: the same sign on both sides. The built-in `zoom` transition is a
punch instead. The outgoing clip grows and the next one shrinks down from large, so the sign flips at the middle. Use
it as a hit, not as a push.

The sideways transitions carry the law by construction, because both clips move the same way:
- `push` moves both clips, so give it a `direction`;
- `slide` moves the next clip in, with `pushOut` to move the outgoing one too;
- `wipe` moves only an edge.

## The current

Every film picks one main direction, and every ordinary seam uses it. The house default is `left`: a `push` or
`slide` with `direction: "left"` brings the next scene in from the right. Every other direction is reserved, and using
one should mean something:

| Direction | Meaning |
|---|---|
| The current (`left`) | the next beat: plain forward progress |
| Up | a conclusion or a reveal rises above what came before |
| Depth, pushing in | going deeper into the same thought |
| Depth, pulling back | arrival: something bigger lands |
| A burst outward | leaving a world |

- Never run two seams in a row in opposite directions. Back and forth reads as a mistake.
- A change of direction needs a visible cause (a tap, a bounce, an impact) or a new chapter.

## The seam plan

Before writing the timeline, list the seams: where each cuts, how A leaves (axis and direction, and for depth whether
it grows or shrinks), how B arrives, and what carries the eye across. A and B must match. If a row doesn't, fix the
plan, not the easing.

| Cut | A leaves | B arrives | Carrier | How |
|---|---|---|---|---|
| `x1` (3.0 s) | depth, growing | depth, growing | the cup | keys on both clips, hard cut |
| `x2` (7.4 s) | left | left | the title | `push`, `direction: "left"` |

Keep it in the plan, or as a comment above the composition, so the next edit can check against it.

## Carriers

The eye follows things, not ideas. The strongest seams hand a concrete thing across the cut, at the same place and
moving at the same speed:
- a title that slides through the cut;
- a shape that shrinks into its place in the next layout;
- a logo that flies into its slot.

In UberScene that's easy: an element on a free track can span the cut. Put it on its own track, anchored to the first
clip, and give its `box.x` (or its scale) keys that keep moving through the cut while the clips change underneath.
Where there's no natural carrier, let the main subject of each scene carry it: A's subject leaves part of the way, and
B's arrives already moving.

`crossfade` carries nothing. Keep it for time passing or a change of mood, not for the next beat.

## Cause and effect

Chain motion so each move is visibly started by the one before: tap, squash, release, flight, impact, recoil, reveal.

- **An effect starts on the frame of its cause.** Anchor it there: `anchor="tap" offset={0}`, never "a little after".
  A sound cue for it is anchored to the same moment.
- **Reactions scale with mass.** Big things rebound slower; small ones snap.
- **A force allows a change of direction.** A flip with no cause is back and forth.

## Keep performing

A scene is never idle between its entrance and its exit.

- **No idle wobble.** A slow loop of scale, opacity, floating or a pulsing glow reads as "the video is waiting".
  That includes keys that go back and forth and a `<Layer>` that only sways with `useLayer().elapsed`.
- **Plan the time.** A scene that finishes coming in with seconds left is a planning mistake: add story, not motion.
- **Pause test:** stop on any second, and something meaningful should be under way.

Give each stretch one of these, and name it in the plan:

| Way | In UberScene |
|---|---|
| Staged reveals | Hold content back and pay it off on the narration. Titles anchored to words (`anchor="talk" at="word:12"`), a `wordByWord` title, the `point-list` or `quote-build` block. The default for two or more groups of content. |
| A camera with intent | Keys on the clip's `transform.scale` and `anchor` (or `box.x`, `box.y`): establish wide, travel, arrive on the subject. |
| The product doing things | Progress moves, highlights step, counts tick: `Counter`, the `ranked-list` and `bar-race` blocks, keys on a shape. |
| Animated sequences | Things act out a beat: a `<Motion>` `sequence`, a card that files into a stack, a result that assembles. |
| A guided action | A pointer or a tap leads the eye to a trigger, and the tap starts the next beat: the `phone-tap` block, or a `<Motion>` cursor with the reaction anchored to its tap. |

## Timing

- **The pause before the payoff.** Leave 0.3 to 0.75 s between the big action and its result (an `offset` on the
  result's anchor). Going straight from action to result loses it.
- **One entrance lasts 0.8 s at most** (`enter={{ type, duration }}`). A longer build is several things staggered,
  not one slow thing.
- **An exit takes about three quarters of its entrance.**
- **A stagger takes 0.5 s in all at most.** With eight or more things, shorten each step, or stagger only the first
  few (`<Motion>` `at`, a `wordByWord` title's pace).
- **Eases:**
  - Never `easeOutBounce`, `easeOutElastic` or their kin, in or out.
  - A small overshoot on an entrance is fine: `easeOutBack`.
  - Things of one kind share one ease and one duration, never a pair of their own each.

## Transitions

Use only two or three kinds of transition in a film, and repeat them. The default seam is a cut with matched keys,
or a `push` in the current's direction. A shared element that moves from one layout to the next doesn't count
against the two or three.

## Checking it

There is no seam check in the CLI yet, so look:

- **`uberscene look video.tsx --around x1`** draws five frames of a transition (before, first, middle, last, after).
  Each side should be mid-move, in the same direction.
- **`uberscene look video.tsx --motion 2.6-3.4`** draws a strip across a cut. The thing that carries the eye should
  travel one way the whole length, with no stop at the cut.
- **`uberscene inspect video.tsx`** prints every cut's time, so the plan's times match the file's.

Two rules no command checks:

1. **An edit reopens the seam.** Any change to a scene's first or last second (a trim, a new word cut, a re-timed
   voice-over) means looking at that seam again.
2. **The sound is the clock.** Cut on the words (`in="word:5"`, `out="word:30.end"`); never squeeze a sentence to
   fit a slot.

## Don't, and instead

| Don't | Instead |
|---|---|
| Write each scene's entrance on its own | Write the seam plan first |
| Crossfade between beats | A matched cut, or `push` in the current's direction |
| Let the exit finish, then change scene | Cut while both sides are moving |
| Start B from rest after a cut | B's first key eases out (`easeOutQuart`), already moving |
| A receding exit, then a grow-from-small entrance | Match the sign of the scale on both sides |
| Use the `zoom` transition as a push | Keys on both clips; `zoom` is a punch |
| Sway or breathe to fill time | Give the stretch one of the ways to keep performing, or add story |
| Flip direction with no cause | Spend a force, or keep the current |
| Use reserved directions for variety | Keep the current; spend the others on meaning |
| A reaction a few frames after its cause | Anchor it to the cause, `offset={0}` |
| Jump from action straight to result | A 0.3 to 0.75 s pause before the result |
