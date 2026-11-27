# 0045. Timeline time is a `Time` class

> Status: accepted, to be built in phases. Amends [0044](./0044-timeline-time-in-ticks.md): the unit (ticks), the
> range shape (half-open, start and duration), seconds in files and craft-time's rounding stand. What changes is the
> type that carries a time: a `Time` object instead of a branded number.

## Context

0044 made ticks the engine's time and gave them a branded type, `Ticks = number & { [TICKS]: true }`. The brand stops
seconds from being passed where ticks are meant, but a branded value is still a number: `a + b`, `a < b`, `a * 1.5` and
`a - 0.1` all compile, and each is a way back to the float bugs 0044 set out to remove. Code that reaches a time has to
remember to go through the helpers (`addTicks`, `rangeContains`, `secondsSinceStart`), and a review has to catch it
when it doesn't. That is the same "a rule each new piece of code has to remember" that 0044 named as the problem.

Languages that take exact values seriously give them a type with its own operations: `Decimal` in Python and C#,
`BigDecimal` in Java, `Duration` and `Instant` in Rust and Java. Arithmetic on the value goes through methods that are
exact by construction, and there is no operator that silently does something else.

## Decision

**A time is a `Time`, and a stretch of time is a `TimeRange`, both immutable classes (read-only fields, no setters) in `@uberscene/kit/schema`.**

- **`Time` holds whole ticks** (`time.ticks`, a safe integer) and nothing else. It is made from seconds or text, never
  by hand: `Time.seconds(0.2)`, `Time.parse("0.4")`, `Time.parse("1001/30000")`, `Time.frames(n, rate)`,
  `Time.samples(n, sampleRate)`, `Time.timestamp(pts, num, den)`, `Time.ofTicks(n)`.
- **Text and numbers are read exactly.** `Time.parse("0.4")` reads the digits, not a float, and rounds once, to the
  nearest tick. `Time.seconds(x)` reads `x` as the decimal it prints as, so `Time.seconds(0.1 + 0.2)` is the same tick
  as `Time.seconds(0.3)`. A fast path skips the digit reading when the float product can't be off by a tick.
- **All math is methods.** `plus`, `minus`, `negate`, `abs`, `times(num, den)` (exact, floored as craft-time's
  `mul_ratio`), `scaledBy(factor)` (to the nearest tick, for a speed), `ratioTo`, `compare`, `equals`, `isBefore`,
  `isAfter`, `clamp`, `Time.min`, `Time.max`. Frames and samples: `frame`, `framesUntil`, `nearestFrame`, `snap`,
  `snapNearest`, `isOnFrame`, `sample`.
- **It is not a number.** TypeScript refuses `+`, `-` and `*` on it. `Symbol.toPrimitive` throws for a number, which
  also catches `<` and `>` at run time (TypeScript allows those on any two objects); a lint rule will catch them before
  that. In a template string it prints as `0.4s`.
- **It leaves as seconds only at the edge.** `toSeconds()` for animation code, which is continuous. `toJSON()` and
  `toFileSeconds()` give the shortest decimal that reads back to the same tick, so a file says `2.2`, not
  `2.2000000000000003`. `toString()` always reads back with `Time.parse`: past about 4.5 hours, where no double lands on
  every tick, it writes the exact fraction `ticks/254016000000s`.
- **Past 2^53 ticks (about 9.85 hours) it throws** instead of losing ticks. The resolver checks a file's times before
  it makes them, and reports `INVALID_TIME_RANGE` for one past the limit, as it does now.
- **`TimeRange` is half-open**, `[start, end)`, with `start`, `duration` and `end` as `Time`. `TimeRange.of(start,
  duration)`, `TimeRange.between(start, end)`; `contains`, `covers`, `overlaps`, `intersect`, `shift`, `withDuration`,
  `clamp`, `elapsed`, `progress`, `frames(rate)`, `snapOut(rate)`, `equals`. A negative duration throws.
- **Equality is `equals`**, not `===`. `samePlacement`, the player's memo checks and tests compare with it.
- **The rounding is craft-time's**, and the craft-time vectors from 0044 run against `Time` and `TimeRange` too.

## How it gets there

1. **Add the classes** with their tests: the craft-time vectors, property tests (sums of millisecond lengths, the laws
   of addition, ordering, text and JSON round trips, every frame of every rate), and the guards on operators.
2. **Move the engine onto them.** `Placement.range` becomes a `TimeRange`; the sdk's `startTicks`/`startSeconds`
   helpers (0044 phase 4) become methods or thin wrappers, so the change lands in one place. The `Ticks` brand and the
   free functions on it (`addTicks`, `rangeEnd`, ...) are deprecated, then removed.
3. **Remove the seconds fields** (`start`, `end`, `duration` on a placement) and `elapsedSeconds`, as 0044 phase 5
   planned, and add the lint rule. Done: the fields are gone and `pnpm lint` runs the rule. `elapsedSeconds` stays, for
   code that holds plain seconds and no placement (a diagram's clock, an inspect row).
4. **Native** keeps its i64 ticks (craft-time); the protocol sends `time.ticks`.

## Consequences

- A float bug in time math needs a deliberate `toSeconds()` to write, which reads as what it is in a review.
- A `Time` is an object. Measured in Node: about 40 ns to make one from ticks, about 140 ns from seconds, 80 ns for a
  `plus`, 8 ns for a range's `contains`. The player resolves a few hundred elements a frame, which stays well under a
  millisecond. The fields are read-only by type, not frozen at run time: freezing each value doubled its cost.
- Values that cross a worker boundary or JSON lose the class and come back as seconds; they are read with
  `Time.parse` on the other side.
- `Moment` is not used as the name: the sdk already exports a `Moment` type (the moments `inspect` lists), and the name
  suggests moment.js's mutable dates.
