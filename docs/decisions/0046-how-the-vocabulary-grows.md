# 0046. How the vocabulary grows: a kind is a table entry, a reference is a graph edge

> Status: accepted and built for the five steps below (the element table, key paths per kind, the player's drawing
> tables, the reference graph, and prop links as its first new use). Proposed for a sixth, listed at the end. Keeps
> [0041](./0041-motion-design-seams.md)'s "no expressions and no code in props" and says what stands in their place.
> Builds on [0035](./0035-everything-is-a-prop.md) (everything about an element is a prop).

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

## Decision

### 1. One table says what each kind is

`KIND_CAPABILITIES` in `packages/kit/src/jsx/capabilities.ts` is the one description of a kind, as data, set on each
element by `defineElement`. A question a package asks about a kind is a field of it, and a list of kinds is a lookup
over it (`kindsWhere`). What the schema already shows is read from the schema, never written a second time
(`kindsWithProp("follow")`, `"blend"`, `"effects"`).

| Field | Says | In place of |
|---|---|---|
| `plane`, `footage` | drawn on the canvas, as DOM over it, both, or not at all; footage or not | the six lists of overlays, the backdrop's lists |
| `sequenceRole` | a clip, something between two clips, empty time, or none of these | the `transition` and `gap` pair, the most repeated check in the SDK |
| `mainTrack`, `spansVideo`, `freeCode`, `masked` | what the main track holds, what covers the whole video, what runs code of its own, what a mask cuts | lists in the resolver, the frame cache and the lint |
| `hasText`, `themeStyle`, `themeMotion` | carries text; how a theme styles and moves it | lists in the checks, the theme and the editor |
| `playsAsset`, `elementActions` | plays a manifest asset; takes the element actions | pairs of `clip` and `audio`, the editor's copy of the SDK's list |
| `keyPaths` | the values of it that can change over time | see 2 |

Two predicates name the two meanings "overlay" had: `isDomOverlay` (drawn as DOM) and `onOverlayPlane` (that, and the
adjustment, which is both).

### 2. A kind owns the paths its values change at

`packages/kit/src/jsx/key-paths.ts` has one entry for each value that can take keys: where it is written
(`transform.rotation`, `width`, `zoom`), what its items are named, how it moves between keys (a number, a colour, a
list of points), whether it is a number (so it takes a generator and a link), whose clock it runs on, and how a
key's value is checked. A kind lists its entries (`keyPathsOf(kind)`). The resolver makes a camera's and a shape's
keys in one loop over them, the key actions say which paths a kind takes from them, and the list of every keyframe
property is their union. A key on a path the element's kind does not have is refused.

### 3. Drawing is a table in the player, keyed by the same kind

The kit cannot import the player, so what a kind *is* stays data in the kit and how it is *drawn* stays code in the
player, in three tables: `CANVAS_OPS` (what a kind puts on the canvas), `INTRINSIC_SIZE` (its own size), and
`DOM_DRAWING` (its component, whether it sits on its track or above them all, whether it takes the effect
pipeline, how to tell two of it apart). The frame plan and the DOM layer name no kind. A test holds each table to
the kind table's `plane`. Layer engines were the precedent: a registry the player owns, looked up by name.

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
  not elements and want a small registry of their own (step 6).

### 5. One way for an element to refer to another

- **One grammar.** `parseRef` and `refPattern` in `packages/kit/src/jsx/ref.ts` read every reference: an element
  and one of its edges, a moment of its footage, a marker, a track or a role, an asset, a tracked name, and one
  value of an element (`logo.transform.rotation`, `shot.effects.0.radius`). The schemas' patterns are made from it.
- **One registry.** `REF_KINDS` in `packages/sdk/src/resolve/refs.ts` has an entry per way to refer: who may write
  it and what it may name, how a holder writes it, the rule about where both stand (the same side of the camera),
  when it is read (while placing, once placed, or at each frame), what is read (a time, a place, a value), and what
  removing the target does (name another, keep the value, drop the reference).
- **One graph.** The resolver reads every reference into `state.refs`: the edges, an index each way, and for each
  thing read an order in which every element comes after what it names. The errors are uniform: `UNKNOWN_REF`,
  `WRONG_KIND`, `WRONG_SCOPE`, and `CYCLE` with the path.
- **Circles are found per thing read.** Time never depends on place or value, so "B follows A, and A starts from B"
  is legal and stays legal. A circle is a circle of times, of places, or of values.
- **Readers.** What depends on an element is read from the graph, so nothing dangles: removing a push target edits
  the push, removing a marker writes the seconds it stood at, removing a ducked track drops the duck. The frame
  cache takes a frame's other elements from the graph. The player reads every reference a frame needs in one pass
  in graph order (`refsAt`), through a table keyed by the kind of reference.
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

`scripts/kind-branches.ts` counts, in each package, comparisons of a kind by name and lists of kinds, against a
budget in `scripts/kind-branches.json`. `pnpm kinds` runs in `pnpm check` and in CI and fails on any difference, and
the budget cannot be raised by the script. What looks like a kind and is not (a shader's kind, a time reference's)
is in a reviewed list in the same file. It does not see a kind read into a variable and compared later.

## What it measured

Comparisons and lists of kinds, by the same script on `main` before this and on the branch:

| Package | Before | After |
|---|---|---|
| kit | 4 and 6 | 4 and 1 |
| sdk | 186 and 36 | 131 and 27 |
| player | 31 and 2 | 11 and 0 |
| render | 25 and 3 | 23 and 1 |
| editor | 12 and 1 | 7 and 0 |

What is left in the SDK is mostly the shape of the file and the resolver's own items (see 4), which is where step 6
points.

**Prop links, the proof.** The aim was ten source files or fewer. It took **15**: six in the kit and nine in the
SDK, and **none in the player or render**, which is the result the design was after. For comparison, `follow`
touched 14 files in the player and 6 in render. Where the fifteen went:

- The core is eight: the value's schema and its type, the placeholder item's schema, a generator's `shift`, the
  expansion, the registry entry, the lowering (`resolve/link.ts`) and its call.
- Two are an export and one more step in the grammar, so a link can name `effects.0.radius`.
- Five are what a reference still costs by hand: a case in the list of dependents (an edge it does not know reads
  as a follow), the key actions' refusal, the repair that writes the keys when the target is removed, and moving two
  path helpers to where that repair can reach them.

Those five are the measure of what step 6 should take away: dependents and repairs read from the registry entry,
and "this value is held by a reference" asked of the graph.

## What each remaining feature becomes

| Feature | Under this design | Expected cost |
|---|---|---|
| A track matte (one element's alpha or luma cuts another) | a reference read at the frame as a texture, in `refsAt`; the target drawn first | a registry entry, a reader in the player, the painter's use of it |
| A corner pin to a tracked plane, a face to follow | a reference to a tracked name, read as four corners or a box | an entry, a reader; the analysis is 0041's seam 1 |
| Text animators with range selectors | items the resolver makes from a title's props, as keys are | the derived-item registry of step 6, then one entry each |
| Shape operators (trim paths, repeater, merge) | items on a shape, drawn by the shape's entry | an entry each in the shape's drawing |
| Several masks, keyed masks | key paths on a mask; a mask's drawing in the kind's canvas entry | key-path entries and the painter |
| 2.5D depth, lights | fields of the kind table and a camera's values | entries, and the camera's matrix |
| A new overlay (a chart, a waveform) | a schema, a row in the kind table, an entry in `DOM_DRAWING` and `INTRINSIC_SIZE` | about five files |
| A new effect, generator or easing | one registry entry, as before | one file |

## Consequences

- A new ordinary element is a schema, a table row and its drawing. Nothing in the resolver, the checks, the cache
  or the editor names it.
- A new way to refer is a registry entry and a reader. Its errors, its order, its dependents and its place in the
  frame cache come from the graph.
- Three things changed for users, each its own fix with a changeset: a key on a path the kind does not have is
  refused; a `follow` onto the wrong kind or across the camera, and a push naming something outside the camera,
  report `WRONG_KIND` and `WRONG_SCOPE` (they were `SCHEMA` and `UNKNOWN_REF`, with the same messages); and the three
  removals above repair what they used to break.
- A circle of three or more follows, which is already an error, draws its first member from the composition.
- The resolver makes one more pass over the tree to read references. On the 200-clip fixture a drag step measured
  the same as before within the noise of the machine.
- The ratchet will stop a pull request that adds a check of a kind by name. That is its job; the way through is a
  field of the table.

## Alternatives set aside

- **An expression language in props** (a string, or a small language with a sandbox): the power of code where the
  tools must read and write. Every tool would have to run it to know a value.
- **Functions as props:** what a component framework does. It cannot be written back to the file or shown in an
  inspector.
- **One module per kind holding everything,** drawing included: the kit cannot import the player, and render must
  not import React. Data in the kit and code where it runs, keyed by the same name, is the split that fits the
  packages.
- **Mixed circles across times, places and values as one check:** they cannot occur, and the check would refuse
  legal files.

## Step 6, proposed

- Anchors and matched lengths placed in the graph's order, in place of repeated passes, with one circle report.
- The resolver's own items (keys, generators, effects, speed keys, holds) as a registry, and generators finished
  as one, so the SDK stops asking which generator it has.
- Hooks for the kinds that place children of their own (captions, multicam), one per phase of the resolver.
- Dependents, repairs and "held by a reference" read from the registry entry, so the five hand-made files of a
  link become none.
- One list of references on the inspect rows, in place of a field per kind of reference, and one action that bakes
  any reference into what it reads (`camera/bakePush` for all of them).
