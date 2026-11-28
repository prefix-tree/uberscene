# 0046. How the vocabulary grows: a kind is a typed folder in each package, a reference is a graph edge

> Status: accepted and built. An element kind is a closed type with typed props, a folder of the same name in each
> package and one line in each package's registry; what can be read from its schema is read from there; every
> reference between elements is an edge of one graph, read from the props the schema marks. Six overlay kinds are
> moved; the kinds still to move are listed at the end. Keeps [0041](./0041-motion-design-seams.md)'s "no expressions
> and no code in props" and says what stands in their place. Builds on [0035](./0035-everything-is-a-prop.md)
> (everything about an element is a prop).

## Context

The aim is every element and every relation a compositor has. Each recent one was a change across the whole
repository: the camera touched 54 files, `follow` 46, generated motion 38, keyable shape props 25. Three audits found
why.

**A kind was known in about 330 places.** Code asked "is this a title, a shape, a clip" by name: 186 comparisons and
36 lists of kinds in the SDK, 31 and 2 in the player, 25 and 3 in render, 12 and 1 in the editor. A table of what
each kind is (`KIND_CAPABILITIES`) existed, answered eight questions, and was barely read. About two in five of the
SDK's checks copied something the kit already knew; a third was knowledge the kit had nowhere (its place in a
sequence, the paths it can key, its own size). The copies had drifted: six lists of "the overlays" that disagreed
about the adjustment, two lists that named kinds `motion` and `three` which never occur (those elements are layers),
and the paths a key may sit at spelled three ways.

**A reference was hand-made each time.** Ten features let one element read another: an anchor, a length that
matches or lasts until, a transition on an edge, `follow`, a camera's `push`, `duck`, a cut-out's matte, captions'
source, a marker, a scene's `times`, a multicam angle. Between them, three grammars for the text of a reference, five
lookups, three ways to find a circle, and no shared order. The list of what depends on an element covered six of
them, so removing an element a camera's push named, a track a sound ducked under, or a marker a time was written as
left the file with an error.

**Values were in good shape.** A value is a constant, keys, or a generator, and one function reads all three. That is
why generated motion cost 38 files and not a hundred, and it is the model: one entry, a small closed set of ways to
be read, and readers that ask "how" and never "which". The effects registry works the same way.

**Nothing was type-checked.** A first version of this record answered the first two with a table of flags per kind,
read at 94 places. It took the lists away and left the cause: a kind was a `string`, so `capabilitiesOf("titel")`
compiled; an element's props were `Record<string, unknown>`, read through about 130 casts with 45 defaults written
a second time (`?? 48`); and a new way to refer still cost 15 files. Types would have caught three faults that were
live: `volume` and `pan` took keys in one table and not in the schema, a shape with no width stood 200 wide in the
player and 0 in the SDK, and a title's look keys were written out four times. That version never reached `main`.
What follows is what was built in its place.

## Decision

### 1. A kind is a closed type, and its props are typed

`packages/kit/src/elements/index.ts` has `KindProps`, an interface with one named props interface per kind
(`TitleProps`, `ShapeProps`), each the output of the kind's schema. `Kind` is its keys, so a kind that does not exist
does not compile, and `KindWith<"transform">` is the kinds whose props have that prop.

A placement says whether its props are what the schema parsed. `Parsed<K>` (`parsed: true`, `props: KindProps[K]`)
is read as its type, with no cast and no default written twice; `Unparsed` (`parsed: false`) holds the props as
written. A prop the schema refuses is reported and left out, the refused key inside an object first and the whole
prop if that is not enough; an element that still does not parse keeps its row and its errors and is **not drawn**.
`placed(p, "title")` and `hasProp(p, "transform")` narrow a placement, and a test holds every parsed placement of
the editing corpus to its schema.

### 2. A kind is one folder in each package, and one line in each registry

A moved kind has `packages/<package>/src/elements/<kind>/` in the kit, the SDK and the player (and in render where
the export asks something of it), and each package has a registry typed over the kinds:

| Layer | Its entry says | Registry |
|---|---|---|
| kit, `KitElement` | the schema, its row of traits and its drawing plane, its sentence for the reference, a `sample` of it as a file writes it | `KIT_ELEMENTS` |
| SDK, `SdkElement` | what the resolver or a tool asks of this kind alone: a title's words (`facts`), its size at rest, keys it renamed, why it cannot be followed | `SDK_ELEMENTS` |
| player, `PlayerElement` | its size, its DOM drawing or its canvas ops, whichever its plane requires | `elements/index.ts`, `dom.tsx`, `canvas.ts` |
| editor | its icon and panels | one typed map, `registry/editor/elements.tsx` |

The registries are object literals with static imports (the kit is `sideEffects: false`). A kind listed in the kit
and missing from another package's registry fails that package's build, and the error names the registry file. A
kind on the canvas must have canvas ops and a kind on the overlay plane a DOM drawing: the type says so.

The kit cannot import the player and render must not import React, so one module per kind holding everything was
never possible. The same folder name in each package, keyed by the same `Kind`, is the split that fits.

`pnpm new:element chart` writes the folders from templates and adds the registry lines: six files made and seven
changed, a list `scripts/new-element.test.ts` holds exact. The kind it writes type-checks and draws.

### 3. What the schema says is read from the schema

- **The kind table.** `capabilitiesOf(kind)` is computed: the traits a kind writes in its folder, with what its
  schema shows (it takes a `transform`, it sounds, it trims a source, it holds children). No flag repeats a prop.
- **Key paths.** A value that takes keys is written with `animatable()` or `keyed()`, which mark it (how it moves
  between keys, what a missing value is, how a key is checked). A kind's paths are one walk of its schema, kept; the
  hand-written lists are gone, and a test held the walk to them, order included, before they went. `volume` and
  `pan` became `animatable`.
- **Action targets.** An action that writes a prop is offered to the kinds whose schema has the prop
  (`onElement({ prop: "blend" })`), and its handler gets the placement narrowed to them.
- **References.** See 5.

**The conformance suite** runs the `sample` of every moved kind, in the SDK, the player and the export: it resolves
and lints clean, takes keys at each of its key paths, has a row for the tools, runs, undoes, redoes and writes back
every action it is offered, is drawn on its plane, gives a still that is not blank, and has a reference page.

### 4. What is not a kind's to say

Said plainly, because a table per kind does not cover it and should not be bent to.

- **A layer's engine.** `<Three>` and `<Motion>` are layers with an `engine`. Traits are per kind; an engine is
  looked up where it draws.
- **What an asset decides.** Whether one clip has a picture or sound, and how long it is, is its asset's. The kind
  says what it can have.
- **Relations between neighbours.** A transition needs the clips on each side. A kind says its `sequenceRole`; the
  pairing is the sequence's.
- **The shape of the file.** One camera, the main track, a marker's place: rules about the file, written once in
  the resolver.
- **The resolver's own items.** A key, a generator, an effect, a speed key and a hold are made from props. They are
  not elements: they become typed kinds without folders, since their parent draws them (see what is next).

### 5. One way for an element to refer to another

- **One grammar.** `parseRef` and `refPattern` in `packages/kit/src/jsx/ref.ts` read every reference: an element
  and one of its edges, a moment of its footage, a marker, a track or a role, an asset, a tracked name, and one
  value of an element (`logo.transform.rotation`, `shot.effects.0.radius`). The schemas' patterns are made from it.
- **Marked in the schema.** A prop that names something else is written with `ref(type, schema)` in the kit
  (`anchor`, `follow`, a transition's `on`, a length's `match` and `until`, a camera's `push`, a `duck`, the times
  read as markers). `refSitesIn` walks a schema once for every such place: a prop, a list of them, an object of
  them by name, one way of writing a value.
- **One registry.** `REF_KINDS` in `packages/sdk/src/resolve/refs.ts` has an entry per way to refer: how the text at
  a marked prop reads as what it names, what it may name, the rule about where both stand (the same side of the
  camera), when it is read (while placing, once placed, or at each frame), what is read (a time, a place, a value),
  how its holder reads as a dependent, and what removing the target does. No entry reads props by hand but a
  link's, which is written inside the value it stands for. A record of what the hand-written readers found in every
  example holds the marks to the same references in the same order.
- **One graph.** The resolver reads every reference into `state.refs`: the edges, an index each way, and for each
  thing read an order in which every element comes after what it names. The errors are uniform: `UNKNOWN_REF`,
  `WRONG_KIND`, `WRONG_SCOPE`, and `CYCLE` with the path.
- **Circles are found per thing read.** Time never depends on place or value, so "B follows A, and A starts from B"
  is legal and stays legal. A circle is a circle of times, of places, or of values.
- **Readers.** What depends on an element is read from the graph, each edge as its entry says, so nothing
  dangles. What a removal repairs is a list in `packages/sdk/src/actions/ref-repairs.ts`, one repair for each way to
  refer: removing a push target edits the push, removing a marker writes the seconds it stood at, removing a ducked
  track drops the duck. A way to refer with no repair does not compile. The frame cache takes a frame's other
  elements from the graph. The player reads every reference a frame needs in one pass in graph order (`refsAt`).
- **Kept between resolves.** The resolver reuses what an edit did not touch (#288). It builds the graph from the
  nodes that write a reference, known once for the file, and hands back the same graph while the references
  written, the tracks and the answers of each check are what they were. A test holds each of those rules, and every cached resolve to one
  made from nothing.
- **Not moved yet.** Anchors and matched lengths still place themselves by repeated passes; they are in the graph
  as edges, for dependents and the cache, and their circles are still reported by those passes.

### 6. No expressions: references are data

0041 said no expressions and no code in props. The compositor goal lists expressions. What they are used for, and
where each lives:

| An expression for | Here |
|---|---|
| a wobble, a loop, a steady change | the `wiggle`, `loop` and `drift` generators |
| parenting, a position picked from another layer | `follow="id"` |
| one value driven by another, scaled, offset or late | a link: `{ link: "logo.transform.rotation", scale, offset, delay }` |
| a stagger by index, values from data | the file itself: it is code when it is written |
| anything else worked out per frame | a `<Layer>` |

The line is this: the file is code when it is written, and a prop is data when it is read. Nothing in a prop runs.
That is what lets a model read a file, the inspector edit it, an edit be written back to the source, and the
preview, the export and the cache agree. So there is no expression language. A link is a reference, and references
are data.

**How a link is read.** It is copied when the file is resolved, as a camera's push is. The resolver writes a link as
the keys and the generator of the value it names: times `scale`, plus `offset`, moved by the difference of the two
elements' starts and the `delay`, worked out as `Time`s ([0045](./0045-time-as-a-class.md)). The copy is exact,
because scaling and offsetting a curve gives the same curve with other numbers. Every reader of a value over time
then reads a link with no code of its own. Reading it at each frame was set aside: the function that reads a value
has no view of other elements, and three packages read values on their own, so it meant a context threaded through
about 18 files. A read that cannot be copied (another element's pixels, for a matte) will be read at the frame, in
the pass `refsAt` now makes.

### 7. The count may only go down

`scripts/kind-branches.ts` reads the types, as the lint for `Time` does, and counts four things in each package
against a budget in `scripts/kind-branches.json`: comparisons of a kind with a name, lists of kinds, casts of an
element's props, and reads of a prop as an unknown value. `pnpm kinds` runs in `pnpm check` and in CI and fails on
any difference, and the script cannot raise a count. A moved kind is **sealed**: its name written outside its
folders, a registry or a reviewed list fails outright.

## What it measured

By the same script, on `main` before this and on the branch. Comparisons and lists of kinds:

| Package | Before | After |
|---|---|---|
| kit | 4 and 6 | 3 and 1 |
| sdk | 186 and 36 | 121 and 23 |
| player | 31 and 2 | 10 and 0 |
| render | 25 and 3 | 18 and 1 |
| editor | 12 and 1 | 4 and 0 |

Casts of props and untyped reads, from when they were first counted (title and shape not yet moved) to now:

| Package | Before | After |
|---|---|---|
| sdk | 74 and 77 | 70 and 74 |
| player | 55 and 44 | 30 and 24 |
| render | 12 and 1 | 11 and 1 |

What is left is in the kinds not yet moved, and in the shape of the file (see 4).

| | Before | After |
|---|---|---|
| The kit's declarations | 2.33 MB | 1.04 MB (a kind's props are a named interface, written once) |
| Files a new overlay element changes | 25 to 54 for the last four | 6 made, 7 changed, by the scaffold |
| Source files a new way to refer changes | 15 for prop links | 3 |

**A new way to refer, measured.** A throwaway `mirror="id"` was added and taken out again. It took a marked prop in
the kit's schema, an entry in `REF_KINDS`, and a repair in `ref-repairs.ts`, which the build asked for by name. With
those three it was in the graph, its unknown target was reported, `dependentsOf` listed it, and removing its target
repaired it, with every test of every package passing. Prop links had taken 15: six in the kit and nine in the SDK,
five of them what a reference then cost by hand (a case in the list of dependents, a refusal, a repair, two moved
helpers). None were in the player or render either time.

**The edit step.** On the 200-clip fixture, the fastest of several batches, with `main` after the cheaper edit step:
a prop edit about 0.07 ms against 0.06, a trim about 0.14 ms against 0.13. The typed placement and the graph cost
about a tenth more; before the graph was kept between resolves they cost three times that.

Type-checking takes longer than on `main`: about 2.2 s for the kit (1.8), 6.5 s for the SDK (5.9), 5.4 s for the
player (4.1) and 7.1 s for render (6.5), measured on one busy machine.

## What each remaining feature becomes

| Feature | Under this design | Expected cost |
|---|---|---|
| A track matte (one element's alpha or luma cuts another) | a marked prop and a reference read at the frame as a texture, in `refsAt`; the target drawn first | the three files of a reference, a reader in the player, the painter's use of it |
| A corner pin to a tracked plane, a face to follow | a reference to a tracked name, read as four corners or a box | the three files of a reference, a reader; the analysis is 0041's seam 1 |
| Text animators with range selectors | items the resolver makes from a title's props, as keys are | typed item kinds, then one entry each in the title's folders |
| Shape operators (trim paths, repeater, merge) | items on a shape, drawn by the shape's entry | an entry each in the shape's drawing |
| Several masks, keyed masks | key paths on a mask; a mask's drawing in the kind's canvas entry | key-path entries and the painter |
| 2.5D depth, lights | fields of the kind table and a camera's values | entries, and the camera's matrix |
| A new overlay (a chart, a waveform) | `pnpm new:element`, then its props and its drawing | six files made, seven changed |
| A new effect, generator or easing | one registry entry, as before | one file |

## Consequences

- A new ordinary element is a folder in each package, started by the scaffold. Nothing in the resolver, the checks,
  the cache or the editor names it, and the build says what is missing.
- A new way to refer is a marked prop, a registry entry and a repair. Its errors, its order, its dependents and its
  place in the frame cache come from the graph.
- What changed for users, each its own fix with a changeset: an element whose props do not parse is not drawn; a
  key on a path the kind does not have is refused; `volume` and `pan` take keys as the schema says; a shape with no
  width stands 200 wide for a camera's push; a `follow` onto the wrong kind or across the camera, and a push naming
  something outside the camera, report `WRONG_KIND` and `WRONG_SCOPE` (they were `SCHEMA` and `UNKNOWN_REF`, with the
  same messages); the three removals above repair what they used to break; and an anchor, a matched length and a
  time written as a marker are read only on the kinds whose schema has the prop.
- A placement of a title holds its words (`placement.text`, `placement.runs`), so tools read them there.
- A circle of three or more follows, which is already an error, draws its first member from the composition.
- The ratchet will stop a pull request that adds a check of a kind by name, a cast of props, or the name of a
  sealed kind outside its folders. That is its job; the way through is the kind's entry.

## Alternatives set aside

- **An expression language in props** (a string, or a small language with a sandbox): the power of code where the
  tools must read and write. Every tool would have to run it to know a value.
- **Functions as props:** what a component framework does. It cannot be written back to the file or shown in an
  inspector.
- **One module per kind holding everything,** drawing included: the kit cannot import the player, and render must
  not import React. A folder of the same name in each package, keyed by the same kind, is the split that fits.
- **A table of flags per kind, read by name** (this record's first version): it removed the lists and checked
  nothing. A flag could disagree with the schema, a kind was any string, and props stayed untyped.
- **A folder per kind in the editor:** it shows an icon and panels, so one typed map is enough.
- **Mixed circles across times, places and values as one check:** they cannot occur, and the check would refuse
  legal files.

## The second pull request: every kind in its folder

Every kind a file writes now has a folder in each package: the media (clip, audio, nested), the transition and the
gap, captions and their cues, multicam with its angles and cuts, and the structural kinds (composition, track, camera,
marker). The kinds an element holds (a mask, an effect, a key, a generator, a speed key, a hold) have no folder: each
says its row in `packages/kit/src/elements/derived.ts`. The fallback tables are deleted; the kind table is computed
from the folders and those rows.

What the entries learned to say, each in place of a test for a kind's name:

- `SdkElement.timing`, `shader` and `complete`: how long a transition or a gap lasts, which shaders a transition's type
  names, and the params a built-in transition fills in.
- `SdkElement.makes`: a kind that makes elements of its own. A multicam makes a clip of each cut as its track is
  placed; captions make their cues once every track is. `made` marks a cue, timed by its captions.
- `PlayerElement.decodes`, `sound` and `shownBy`: what is decoded to paint a clip, how a nested sequence is heard, and
  what stands for a multicam on its track. Footage paints through one shared op.
- `RenderElement.drawsNothing`: a sound has no part in a frame's key.
- `isBetween` and `isEmptyTime` ask a kind's sequence role; `onMainTrack` is the one question for the main track.

Where the shape of the file is read (the resolver's walk, the source index, the fold, a reference's `marker:` and
`track:` prefixes), the structural kinds are still named, as section 4 says. Each such file is listed in the
ratchet's `allow`, with the kinds it may name and why. The layout check's three uses of the captions' name are listed
there too, to move into the export's captions folder.

Measured on the second pull request:

| | compare | list | cast | read |
|---|---|---|---|---|
| sdk, before | 121 | 23 | 70 | 74 |
| sdk, after | 36 | 3 | 70 | 74 |
| player, before | 10 | 0 | 30 | 24 |
| player, after | 0 | 0 | 27 | 23 |
| render, before | 18 | 1 | 11 | 1 |
| render, after | 9 | 0 | 11 | 1 |

The kit counts went from 3, 1, 4, 3 to 2, 1, 4, 3, and the editor's stayed at 4 (the camera's panel). Kit
declarations are 1.01 MB, from 1.04. A new element still writes six files and changes seven. The edit step's bench
and the typecheck times are the same as main's, and nothing drawn moved a pixel.

Two bugs the conformance suite found on the way, each fixed with a test: an edit that sets props was offered where
its own test said no (an effect to remove on an element with none), and removing a track was refused when another
track's element read one of its elements.

## What is next

- `Placement` as the typed union in the public types.
- The 101 action handlers as a typed table.

Proposed, not planned:

- Anchors and matched lengths placed in the graph's order, in place of repeated passes, with one circle report.
- One list of references on the inspect rows, in place of a field per kind of reference, and one action that bakes
  any reference into what it reads (`camera/bakePush` for all of them).
