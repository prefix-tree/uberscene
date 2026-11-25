# A kinetic interview edit: what each tool can and cannot do

Read this before making an interview clip in the kinetic-type style: tall caps beside the speaker, flash cards, a
colour card with b-roll, and the quote typing in beside a black-and-white cut-out of the speaker. Everything here was
observed while building one (38 s, 1920x1080, three versions). The file is `examples/interview/video.tsx`. For
interviews in general, see [kinds.md](kinds.md).

## The edit, in order

1. **Pick the moment from the transcript.** A self-contained thought of 25 to 35 s. A line the speaker says several
   ways ("wouldn't it be amazing if…", three times) is made for a quote that builds.
2. **Open cold on the strongest line.** Play that line first, as giant caps (hero words 60 to 90 % of the width), then
   cut to the start of the answer; it returns later in its real place. A speaker talking with no graphics for two
   seconds is not a hook.
3. **Get word times.** Subtitle files give estimated word times; for titles that land on words, transcribe with word
   timestamps and put the JSON beside the clip before `uberscene add`.
4. **Anchor everything to words**: `anchor="talk" at="word:N"`. Nothing is timed in seconds except how long a card
   stays.
5. **Stills of every card before any render**, then the checks, then the render, then measure the file's sound.

## By capability

| You want | What works | What to know |
|---|---|---|
| A title that lands on a word | `anchor="talk" at="word:N"` on the `<Title>` | The hook's clip and the answer's clip are two clips of one take: put them on separate tracks, or `lint` reports the footage as repeated |
| Lines that type in | `animation={{ type: "typewriter", in: 0.3 }}` | One burst of key clicks per line, anchored to the same word |
| A coloured word | One `<Title>` per line, each one colour | A title takes one colour: colour a whole line, or give the word its own title. A highlighted line is a title with a `background` |
| A flash card | A full-frame `<Shape>` and a `<Title>`, anchored to the word | Hold it 0.5 s plus 0.3 s a word, even if the speaker has moved on: 0.3 s cards pass every check and cannot be read |
| A colour card under the speaker | A `<Shape ground>` on a track before the speaker's | Tracks draw in the order the file writes them, footage included. `ground` keeps the layout check from treating the card as a callout |
| B-roll tinted to the card | The clip in black and white with `blend="screen"` over the card: its black becomes the card's colour | A blended clip blends with footage, not with a shape: make that card an image clip of the colour, on the track below the b-roll. Pick shots on true black; a hazy shot shows its frame. Lift a dim subject with `exposure` (2 stops was needed) |
| The speaker cut out | Not built in. A second video of the same take with the speaker over pure green, then `colorKey` | See "The cut-out" below |
| The cut-out in black and white | `colorKey` first, then `grayscale` and `contrast`, in that order in `effects` | Effects run in list order: key before you take the colour away |
| A punch-in on the speaker | A second clip of the take on a track above, with `transform.scale` keys and an `anchor` on the face | Give it `volume={0}`: the main clip carries the sound |
| Music under the voice | `role="dialogue"` on the voice's tracks, `duck={{ under: "dialogue", to: 0.3 }}` on the music | With no voice (the end card) the music comes back up by itself |
| A loud enough voice | Normalise the interview's sound when preparing the clip (`loudnorm=I=-14:TP=-2` in ffmpeg) | The export has no limiter: raw speech measured -27 LUFS, and gain alone clips before -14. After normalising, the film reached -17 with a -3 dBFS peak |

## By tool

| Tool | What it told us | What it did not |
|---|---|---|
| `uberscene add` | Asset lengths, and words from the transcript beside the clip. Give the cut-out video the same transcript (`--transcript`), so its `in="word:N"` matches the take | Whether the words are right: read names and terms |
| `uberscene lint` | Ids, timing, the same footage twice on one track, a gap on the main track | Anything about how it looks |
| `uberscene inspect` | Every element's seconds, so card lengths can be worked out from word times | |
| `uberscene look --at …` | The real frame of each card. Most layout mistakes were found here | Motion and sound. Draw a still of every card; a card you did not look at is a card you did not check |
| `--check-layout` | What leaves the safe zone. With `--subject x,y,w,h` for the face, a title over the face | Two titles overlapping each other, and a title that wraps or overflows its box: both pass. A long title in a narrow `box` wraps without warning, so give big titles a generous width and look |
| `--check-motion` | A stretch with nothing moving (only the end card, a hold on purpose) | Whether something moves too fast to read |
| `look --listen all` | The mix's loudness and peak over time | What it sounds like |
| `ffmpeg -af ebur128=peak=true` on the render | The loudness of the file people get | |

## The cut-out

UberScene cannot separate a person from a background yet (decision 0039 proposes it). Until then:

1. **Make the cut-out outside**, with a matting model: for each frame, the speaker over pure green (`#00ff00`), as a
   second video with the same frames as the take. Write the person's colour times the matte plus green times the rest.
2. **Use a matting model, not a segmenter.** Measured on the same frames: a small selfie segmenter gave a blocky edge
   and let patches of the background through; RobustVideoMatting kept hair strands and was clean, at about 0.2 s a
   frame on a CPU. It is GPL-3.0: say so to the person before using it. U²-Net (Apache-2.0) is clean but soft on hair.
   A model that also returns the person's colour at the edges removes the old background's tint; use that colour.
3. **Key it in the file**: `{ type: "colorKey", color: "#00ff00", tolerance: 0.36, softness: 0.14, spill: 1 }`.
4. **Look at it on white and on the card's colour**, at the hair and at moving hands. What each fault means:

| You see | Cause |
|---|---|
| A blocky or rounded outline | The model works at a low resolution: use a matting model |
| Patches of the old background beside an arm | The model's mistake: a better model, not a colour rule (a rule for "the wall's blue" ate a grey-blue jacket) |
| A dark rim on a colour card | The old background's tint in the edge: use the model's colour estimate, or raise `spill` |
| Hair as a smooth blob | A segmenter, or a soft model |

## Sound, which you cannot hear

- You choose sounds by their length and pitch, and levels by numbers. Say so, and ask the person to judge the mix:
  two sets of effects were measured fine and sounded wrong.
- For this style, what was kept: a typing burst on each typed line, and a single key click where a big word or a
  flash card lands. Sweeps, whooshes and thumps on every card were taken out.
- Free effects: Kenney's interface sounds (CC0). Check a pack's licence per sound set; collections mix licences.
- A music bed at `volume={0.5}`, ducked to 0.3 of that under the voice, faded out over the end card.

## What it cost, so you can plan

- The cut-out: about three minutes for 37 s of 1080p on four CPU cores.
- A full render: about 80 s. A still: a few seconds. Fix on stills.
- Three rounds with the person: the first for layout and the cut-out's faults, the second for pacing, the hook and
  the sound, the third for the cut-out's quality.
