# Backlog

What to build next, in the order to build it. Each item is one pull request (the large ones, a few). Tick an item in
the pull request that finishes it, and add the pull request's number.

Where the items come from: an interview edit in a kinetic-type style, whose hard parts and missing tools are written up
in [decision 0039](docs/decisions/0039-a-person-cut-out-of-the-background.md). Sizes: S is a day or less, M a few
days, L a week or more.

## Now

- [x] **1. An image used by two clips fails the render** (S) (#197)
  - The render stops with "The image source is detached": every clip of a still image gets the same frame, and the
    first clip to end closes the picture for the rest.
  - The fix and its test are written (`packages/player/src/media/frame-source.ts`); they need a pull request.
  - Done when: a file with one image on two clips renders, and the test is in.

- [x] **2. Cut-out, step 1: a matte as an input** (L) (#199)
  - A `matte` field on a manifest asset (a greyscale video beside the footage), and `cutout` on a `<Clip>`, with
    `shrink` and `feather`. `despill` moved to item 6, where models without a colour estimate need it.
  - The matte is a second source for the clip, decoded at the same source time; one compositor pass makes it the
    clip's alpha, before its `effects`. The same in the player and the export.
  - No model yet: a matte made by any tool works.
  - Done when: a clip with `cutout` shows what is under it through the matte's black, in the preview and in an
    export, with a browser test; a clip with `cutout` and no matte is an error that says how to make one; the
    elements reference and the guide say how.

## Next

- [x] **3. A read-time check** (S) (#203)
  - Report a title on screen for less than 0.5 s plus 0.3 s a word. The rule is in the skill; nothing enforces it.
  - Done when: `lint` or `--check-layout` reports it with the title's id, its time and the time it needs.

- [x] **4. Layout: text over text, and text that does not fit** (M) (#206)
  - Two rules for `--check-layout`: two titles whose ink overlaps, and a title whose text wraps or overflows its
    `box`.
  - Done when: each is reported at its line with a fix, like the other layout rules, with tests.

- [x] **5. Which matting model** (S) (#244)
  - The default is named in decision 0039: RobustVideoMatting ResNet-50 (GPL-3.0), fetched from its own release on
    first use after its licence is shown, never shipped; U²-Net (Apache-2.0) by name for teams that cannot use GPL.
  - Left for later (below): MODNet, and BiRefNet on a GPU.

- [x] **6. Cut-out, step 2: `uberscene matte`** (L) (#244)
  - The command runs a matting model frame by frame in the export's Chrome (ONNX Runtime for the web), writes the
    matte, its manifest entry, `matte`, `matteModel` and `subjects`, and prints seconds a frame, soft edge, change
    between frames and coverage.
  - A registry of models (`models.json`): source, SHA-256, licence, how to feed it, state between frames. UberScene
    ships the runner, not the models.
  - `despill` and `look --matte` moved to "Later".

## Then, in any order

- [x] **7. Coloured words inside a title** (M) (#242)
  - A mark inside the text, `<Title>into the <Mark color="$accent">stars</Mark></Title>`, or style ranges by word.
  - Done when: one title draws words in different colours, an editor can still change its text, and it is in the
    reference.

- [x] **8. A duration that ends on a word or a beat** (S to M) (#214)
  - `duration={{ until: "talk@word:39" }}`, and beats too. Today `until` takes only an element.
  - Done when: an overlay ends on the moment named and follows it when the cut changes, with tests.

- [ ] **9. A loudness target on export** (M)
  - `--loudness -14` measures the mix and applies gain with a true-peak limiter at -2 dBTP.
  - Done when: an export with the flag measures within 0.5 LU of the target and at or under the peak, on the rendered
    file.

- [ ] **10. A sound report by role** (M)
  - Per role (dialogue, music, effects): its loudness, the music's level under speech, and the cuts with no sound
    on them. For an agent, which cannot hear.
  - Done when: `look --listen` (or `inspect`) prints it, and the skill's sound page says how to read it.

## Last

- [ ] **11. The interview edit as an example** (M; needs 2, 6 and 7)
  - The film rebuilt on `cutout`, with shapes for its cards and marks for its coloured words, its media prepared by a
    script, a page in the examples, and a section in the skill: when a cut-out earns its place, and how to check its
    edge.
  - Done when: it renders from the repository, and its page is on the site.

## Later

Not scheduled; each needs the cut-out to exist first.

- Cut-out quality: `despill` for models that do not return the person's colour, `look --matte <clip>` to see the
  matte beside the picture, smoothing over time for models that work one frame at a time, a GPU provider (WebGPU),
  more models in the registry (MODNet; BiRefNet on a GPU).
- `cutout` for things other than people (a product, a car).
- A matte in ten bits, if fine hair over a bright card needs it.

## Done

- [x] Graphics between video layers: tracks draw in the order the file writes them, footage included (#192).
