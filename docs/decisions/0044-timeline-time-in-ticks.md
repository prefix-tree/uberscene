# 0044. Timeline time is stored in ticks

> Status: accepted, to be built in phases. Supersedes the part of [0033](./0033-time-in-ticks.md) that keeps the
> resolver's times in seconds; 0033's tick unit, exact frame rates, drop-frame timecode and 9.85 hour limit stand.
> Amended by [0045](./0045-time-as-a-class.md): a time is a `Time` object rather than a branded number.

## Context

[0033](./0033-time-in-ticks.md) made every turn of a time into a frame or a sample count in ticks, 1/254,016,000,000
of a second. It left the resolver storing seconds: a placement's `start`, `end` and `duration`, a clip's `in` and
`out`, the composition's `duration`, and the `at` of each key are JavaScript numbers of seconds, and a sequence finds
each clip's start by adding up the lengths before it.

That sum is where time goes wrong. `0.1 + 0.2` is `0.30000000000000004`, and `0.4 - 0.30000000000000004` is
`0.09999999999999998`. A cut computed that way sits a hair off the frame it means, so a raw compare or subtraction
near a boundary lands a frame off. #264 fixed the frame at a cut that showed the old clip. #265 found about thirty more
places, added `elapsedSeconds` and `tidySeconds`, and a rule in `AGENTS.md` that every caller must use them. It works,
but it is a rule each new piece of code has to remember, and about 650 reads of placement times across about 100
files are where it can be forgotten.

Professional tools don't store time as float seconds. Premiere counts the same ticks we do. FilmCraft's timeline, in
craft-libs' craft-time, stores `Tick(i64)` at 254,016,000,000 per second and a range as `TimeRange { start, duration }`
of ticks. OpenTimelineIO and Final Cut use rational frame counts.

## Decision

**Inside the engine, timeline time is a whole number of ticks.** Seconds are turned into ticks once, where they come
in, and ticks are turned into frames, samples or seconds only where they go out. Nothing in between adds, subtracts or
compares seconds.

- **The file keeps seconds.** `start={2.5}` is what a person and a model write and read. The tick count divides 1000,
  so every time written to the millisecond is an exact number of ticks: 0.1 and 0.2 add up to exactly 0.3.
- **The unit stays 0033's**, 254,016,000,000 ticks a second, the same as Premiere and craft-time.
- **Ticks stay JavaScript numbers**, exact up to `Number.MAX_SAFE_INTEGER`: 0033's limit of about 9.85 hours stands.
- **A branded type and a range.** `Ticks` is a number that a plain number can't be assigned to without a
  constructor. `TimeRange { start: Ticks; duration: Ticks }` has craft-time's shape; its end is computed, never
  stored. Arithmetic goes through a small set of helpers (`add`, `sub`, `min`, `max`, `clamp`, `contains`,
  `mulRatio`, `scale`), and multiplication never passes 2^53 in an intermediate product.
- **Where seconds come in:** the resolver converts the file's time props (`start`, `duration`, `in`, `out`, `offset`,
  transition lengths, key `at`, freezes, speed keys) when it parses them; the manifest converts word times, beats,
  shots, silences and media lengths when it loads, container timestamps exactly from their timebase; the player's
  transport snaps its clock to the start tick of the frame it falls in; a seek or a `--at`, `--from` or `--to` is
  turned into a frame and that frame's start tick.
- **Where ticks go out:** a frame to draw and a sample to mix by integer division; seconds to animation code
  (easing progress, `layerClock.elapsed`, `useTime`, generators); a time an edit writes back to the file, as the
  shortest decimal that reads back to the same tick; seconds, frame numbers and timecode in `inspect` and messages.
- **Continuous values may be float.** A speed ramp's source time is an integral, and an eased value is a curve. They
  are worked out in seconds and rounded to a tick only where they become a boundary, a count or a comparison.
- **`Placement` carries `range`.** Its `start`, `end` and `duration` and its source's `in` and `out` are kept, derived
  from the ticks and deprecated, for at least one release, then removed. Removing them is what proves every reader
  moved: the code doesn't compile until it has.
- **Native code shares the implementation.** `native/` depends on craft-time at the craft-libs commit it already pins,
  its protocol carries ticks, and one file of test cases runs in both the kit's tests and `cargo test`.

The work is built in phases, each one or two pull requests that pass on their own: the kit's tick core; the resolver
solving in ticks and publishing `range` beside the old fields; the sdk's edits and inspection rows; the player, the
export and the editor; removing the seconds fields and the helpers that patched them; and, at any point after the
kit, the native side. Before the resolver changes, a golden test records the first and last frame of every element in
every example and fixture, and each phase must leave them as they were, except for bugs it names.

## Alternatives set aside

- **Rational time** (a value over a rate, as OpenTimelineIO). More general, but comparing two times needs a
  cross-multiplication, denominators grow when rates meet, and it would differ from craft-time. One fixed grid that
  every rate divides is simpler.
- **BigInt ticks.** Set aside again for 0033's reasons: BigInt and number don't mix, so every keyframe and canvas
  call would convert, and BigInt is slower in the frame loop. Nine hours is longer than any video this tool is for.
- **Keep seconds and the helpers from #265.** It works today, but the rule lives in a document, not in the types, and
  each forgotten call is a one-frame bug that shows only at the boundary it hits.
- **Ticks or frames in the file.** Ticks are unreadable, and frames tie a file to one rate. A frame spelling
  (`frames(121)`) may be worth adding later; it is not part of this decision.
- **Ticks in `inspect` and its JSON.** They are an engine detail. The rows keep seconds, frames and timecode, so what an
  LLM reads doesn't change.

## Consequences

- The class of bug #264 and #265 fixed goes away: a cut is an integer, and the frame it lands on is integer division.
- `AGENTS.md`'s time rule shrinks to: inside the engine time is `Ticks`; seconds exist in files, display and animation
  hand-offs. A lint flags `* fps`, `/ fps` and seconds-to-ticks conversions outside the modules where time comes in.
- `elapsedSeconds` and `tidySeconds` are removed once nothing calls them.
- `Placement`'s seconds fields are a public API change. The release that removes them is a minor version with a
  changeset telling plugin and block authors to read `range`.
- The native decode protocol gets a new version, `UBF2`, with times in ticks. A binary that speaks only `UBF1` is
  refused with a message saying which to install.
- Times an edit writes that are off the millisecond grid, such as the end of 121 frames at 24 fps, are written as
  `5.041666666666667`. They are written that way today too; the difference is that they now read back to the exact
  frame.
- Copying source packets into the export (`--copy`, joins), left in float seconds by 0033, is timed in ticks from the
  container's timebase.
