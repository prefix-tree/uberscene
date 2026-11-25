# Kinds of video: what each one needs

Read the section for the kind you're making, after [story.md](story.md). Each lists what it needs, its numbers, the
blocks and elements that fit, and the signs it was made on autopilot.

## A launch or a feature film

The product is the hero; the video shows it working.

- **Real screens only.** Screen recordings or screenshots the person gave you, placed with `box` and `fit`, pushed in
  on what matters (keys on `transform.scale` with an `anchor` on the button). A screen you don't have is a labelled
  placeholder.
- **One feature per beat**, 3 to 6 s each: the problem in a line, the feature doing it, the result.
- **The product on screen in the first 3 s.**
- **End card**: the name, one line, one action (a link, "Available today"), held 2 to 3 s.
- Fits: the `phone-tap`, `chat-reveal` and `terminal-typing` blocks, `Callout`, `Badge`, `LowerThird` for a founder.
- Autopilot signs: a gradient with floating icons instead of the product; feature names without the feature shown;
  "Introducing" as the first word.

## An explainer

One idea, made concrete.

- **Start with a person and a situation**, not the idea: "You've got 40 clips and an hour", then the idea.
- **One device that explains**: a diagram that builds (`DrawnLine`, `Label`, `Cells` in a `<Layer>`), a before and
  after, a zoom from the whole to the part, a counter.
- **One idea per scene**, introduced, shown, then named. A label appears on the thing it names, with a line to it.
- **Voice-led**: the script first (about 2.5 words a second), timed with `narrate`; every picture lands on its word.
- Fits: the `point-list`, `quote-build` and `ranked-list` blocks, a `<Layer>` diagram, `Counter`.
- Autopilot signs: bullet points read aloud; icons standing for ideas; no example anywhere.

## An interview, a talk, a podcast cut

The person speaking is the story; your job is to make them sound sharp.

- **Cut on words**: drop ums, false starts and retakes; keep the last take of a line (see "Editing a cut" in the skill).
  Pauses of 0.3 to 0.5 s between sentences, inside the clips.
- **Cover cuts** in the middle of a sentence with b-roll or a reframe (`frame={{ focus }}`, or a punch-in on
  `transform.scale` from 1 to 1.15 on the second half), so a jump cut doesn't show.
- **Lower third** at the speaker's first line, 3 to 4 s, once.
- **Captions** in full lines ([text.md](text.md)).
- Fits: `<Multicam>` for several cameras, `LowerThird`, the `quote-build` block for the line to share.
- For the kinetic-type style (tall caps, flash cards, the speaker cut out beside the quote), read
  [interview-edit.md](interview-edit.md): what each tool can and cannot do for it.
- Autopilot signs: every cut a jump cut; music loud under speech; b-roll that illustrates the literal word ("money":
  a stack of coins).

## A vertical short (9:16)

Made for a thumb that's about to scroll.

- **1080x1920.** Reframe landscape footage with `frame={{ focus }}`, don't letterbox it.
- **The first second decides**: the result, a bold claim or movement in frame 1. No intro.
- **Fast**: a new shot or beat every 1 to 2 s; 15 to 45 s in all.
- **Safe zones**: pass `--safe-zone tiktok` (or `reels`, `shorts`) to `--check-layout` and `--zones tiktok` to `look`;
  the platform's buttons cover the right edge and its caption the bottom.
- **Captions on, big and high**: 2 to 4 words per cue, `wordHighlight` or `karaoke`.
- **Loop it**: the last frame leads back to the first where you can.
- Autopilot signs: a landscape video with bars; captions under the platform's caption; a slow first three seconds.

## Numbers and charts

- **One number at a time.** Each gets its moment: it counts up (`Counter`, `CountUp`), then holds long enough to read.
- **Say what it means**, on the mark: "3x faster" beside the bar, not in a legend.
- **Compare, don't list**: the bar beside the one it beats, the before beside the after.
- **Real numbers** with their source on screen, small; never invented ones.
- Fits: the `bar-race`, `ranked-list` and `hundred-cells` blocks, `Counter`, a `<Layer>` chart.
- Autopilot signs: five charts in a row; axes with no labels; numbers that change faster than they can be read.

## A music video or a cut to a track

- **The song's structure is the film's**: intro, verse, chorus, bridge. A new section, a new look or place.
- **Cuts on beats** (`anchor="song" at="beat:N"` after `uberscene add` finds them), punches on hits ([kinetic beats](motion-catalog.md)), the biggest change on the drop.
- **Words**: when a lyric is on screen, it's on its word, and the picture shows what the words say only sometimes.
- Autopilot signs: cuts at a fixed interval that ignores the music; the same effect on every beat.

## A title sequence, a logo sting

- **2 to 6 s.** One move, done well: the logo built from something (a line that draws, a shape that folds), not a logo
  that fades in and grows.
- **Sound**: one riser and one hit, on the frame the logo settles.
- **End still**: the last 0.5 to 1 s holds, so it can be cut away from.
- Autopilot signs: a lens flare; a spin; a long glow.
