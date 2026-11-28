# Notes for coding agents

Setup, checks and where things live are in [CONTRIBUTING.md](CONTRIBUTING.md). Before a pull request, run `pnpm check`,
`pnpm docs:check` (and `pnpm docs:gen` if it fails), and add a changeset (`pnpm changeset`) when a published package
changes for its users.

## Adding an element

An element kind is one folder of the same name in each package, `packages/<package>/src/elements/<kind>/`, and one
line in each package's registry. Start one with the script, never by hand:

```sh
pnpm new:element chart
```

It writes a kind that already type-checks and draws (a labelled box on the overlay plane), then says what to fill in.

| It writes | What goes there |
|---|---|
| `packages/kit/src/elements/<kind>/schema.ts` | The props, as a Zod schema. Each prop has a line that says what it is. Add only what is drawn. |
| `packages/kit/src/elements/<kind>/index.ts` | Its sentence for the reference, the heading it is filed under, its row of traits, and a `sample`: one of it as a file writes it. |
| `packages/sdk/src/elements/<kind>/index.ts` | What the resolver or a tool asks of this kind alone. Empty to start. |
| `packages/player/src/elements/<kind>/index.ts` | Its size. No React: the engine loads this file. |
| `packages/player/src/elements/<kind>/<Tag>.tsx`, `dom.tsx` | Its drawing, from `placement.props`, which are typed. |

It also adds the kind to seven files: the registry of each package (`elements/index.ts` in the kit, the SDK and the
player, the player's `elements/dom.tsx`, the editor's `registry/editor/elements.tsx`), and the tag a file writes
(`jsx/elements.ts` and `index.ts` in the kit). `scripts/new-element.test.ts` holds that list of files exact.

Nothing else lists the kind. These are read from the kit's registry and the kind's schema:

- the kind table (`capabilitiesOf`), with what the schema says: whether it takes a `transform`, sounds, trims a source;
- the paths keys may sit at: write the value in the schema with `animatable` or `keyed`;
- which actions it is offered: an action that writes a prop applies to the kinds whose schema has the prop;
- its typed placement, its place among what a track holds, the sealed kinds, and its reference page.

Then, in order:

1. Write the props and the drawing. Read a prop as its type (`placement.props.label`): no cast, and no default
   written a second time, since the schema's default is already there.
2. Write its sentence (`summary`) in its kit folder, and run `pnpm docs:gen` and `pnpm registry:build`.
3. Run `pnpm check`.
4. Add a changeset.

What the checks hold a kind to:

- **The types.** A kind listed in the kit and missing from a package's registry does not compile, and the error names
  the registry file. A kind on the canvas must have canvas ops (`packages/player/src/elements/canvas.ts`); a kind on
  the overlay plane must have a DOM drawing.
- **The conformance suite** (`packages/sdk/test/conformance`, and its parts in the player and the export) runs the
  `sample` of every kind: it resolves and lints clean, takes keys at each of its key paths, has a row for the tools,
  runs, undoes, redoes and writes back every action it is offered, is drawn on its plane, gives a still that is not
  blank, and has a reference page. An action the kind is offered with no params yet fails and names the file to add
  them to (`packages/sdk/test/conformance/params.ts`).
- **The ratchet** (`pnpm kinds`). The kind is sealed: its name is written only in its folders. Code elsewhere that
  must treat it its own way asks its entry (add a member to `KitElement`, `SdkElement` or `PlayerElement` and read it
  through the registry) or asks a trait (`capabilitiesOf(kind)`), never `kind === "chart"`.

A kind that needs something beneath it to show (an adjustment filters footage) says so in `sampleBeneath`. A sample
that plays a file names `asset:picture`, an image the suite provides.

## Adding a way for one element to name another

A reference (an anchor, a follow, a camera's push) is three things, and the build asks for each:

1. **The prop, marked.** Write it in the kit's schema with `ref("<name>", schema)` (from
   `packages/kit/src/jsx/ref-sites.ts`). One prop, a list of them or an object of them by name are all found.
2. **Its entry** in `REF_KINDS` (`packages/sdk/src/resolve/refs.ts`), under the same name: how the text reads as what
   it names, what it may name, when it is read, how its holder reads as a dependent, and the errors it reports.
3. **Its repair** in `packages/sdk/src/actions/ref-repairs.ts`: what removing the target does to the holder. An
   entry with no repair does not compile.

Its edges, its errors, what depends on its target and the frame cache then come from the graph (`state.refs`).
Never read a reference from an element's props by hand, and never add a case for one to `dependentsOf`.

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
| Time since an element started (keys, freezes, steps, `rel`) | `secondsSinceStart(p, t)` (sdk), `elapsedSeconds(t, start)` for plain seconds | `t - start` |
| Is `t` inside an element, or did a step at `at` happen | `p.range.contains(T(t))`; for plain seconds, compare `secondsToTicks(...)` of both sides | `t >= start && t < end` on doubles |
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
