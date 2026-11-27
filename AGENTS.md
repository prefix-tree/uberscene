# Notes for coding agents

Setup, checks and where things live are in [CONTRIBUTING.md](CONTRIBUTING.md). Before a pull request, run `pnpm check`,
`pnpm docs:check` (and `pnpm docs:gen` if it fails), and add a changeset (`pnpm changeset`) when a published package
changes for its users.

## Time math: never do arithmetic on raw seconds at a boundary

Times are stored as float seconds, and a sequence adds lengths up: `0.1 + 0.2` is `0.30000000000000004`, while frame 9
at 30 fps starts at exactly `0.3`. `0.4 - 0.30000000000000004` is `0.09999999999999998`, under `0.1`. A raw compare or
subtraction near a frame boundary lands a frame off: a flash of the old clip at a cut, or a key, freeze or word that
fires a frame late. Every turn of a time into a frame, a sample, or a difference goes through the tick helpers in
`packages/kit/src/time.ts` (exported from `@uberscene/kit/schema`). Ticks are whole numbers of 1/254,016,000,000 s, a
grid every frame rate and sample rate divides exactly.

A placement's time is a `Time` (decision 0045): `p.range` is a `TimeRange` of exact `Time`s, and the sdk's
`T(seconds)` makes one. Do the math with its methods (`plus`, `minus`, `isBefore`, `equals`, `Time.max`,
`range.contains`), and turn a result into seconds (`toSeconds`, `toFileSeconds`) only to write it out. TypeScript lets
`<`, `>` and `===` through on two objects, so `pnpm lint` runs `lint:time`, which refuses any operator on a `Time`. The
table below is for code that still holds seconds.

| To | Use | Never |
|---|---|---|
| The frame a time falls in | `frameAtSeconds(t, rate)` | `Math.floor(t * fps)` |
| When a frame starts | `frameStartSeconds(n, rate)` | `n / fps` |
| Frame count of a stretch that ends at `t`, first frame at or after `t` | `framesUntil(t, rate)` | `Math.ceil(t * fps)` |
| The frame nearest a time a person typed (`--at 2.5`) | `nearestFrame(t, rate)` | `Math.round(t * fps)` |
| Audio samples | `sampleAtSeconds`, `samplesUntil` | `Math.floor(t * sampleRate)` |
| Time since an element started (keys, freezes, steps, `rel`) | `elapsedSeconds(t, p.start)` | `t - p.start` |
| Is `t` inside `[start, end)`, or did a step at `at` happen | compare `secondsToTicks(...)` of both sides | `t >= p.start && t < p.end` on doubles |
| A computed time written to a file or kept as a length | `tidySeconds(x)`: drops float noise, stays on its frame | `round3(x)`, `toPrecision(12)`, `Math.round(x * 1e6) / 1e6` |

Notes:

- Use `rate` (`state.composition.rate`, an exact `{ num, den }`), not `fps`, which is approximate for 29.97 and 23.976.
- `round3` is for display and messages only. Rounding a time to the ms moves a frame-exact time (5.041666… s, the end
  of 121 frames at 24 fps) past its frame's start, so the element shows on one frame more.
- Comparing two lengths (does a 0.2 s transition fit a clip from 1.1 to 1.3, which is 0.19999999999999996 s) needs a
  slack of `1e-9`, as the resolver's checks use.
- Edits that go through `setProps` or `insertNode` in `packages/sdk/src/actions/handler-kit.ts` already tidy the time
  props they write (`start`, `duration`, `in`, `out`, `offset`).
- Continuous values (an eased fade, a ramp) don't need this: a tiny error there changes nothing visible. Steps,
  boundaries and counts do.
