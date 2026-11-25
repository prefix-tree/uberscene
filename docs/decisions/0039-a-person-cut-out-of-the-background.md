# 0039. A person cut out of their background: a matte beside the footage, made by a matting model

> Status: proposed. Written after building an interview edit in a kinetic-type style (tall caps beside the speaker,
> flash cards, the quote typing in beside a black-and-white cut-out of him). The edit worked, but its central effect,
> the cut-out, was made outside UberScene by a script. This record says what was hard, which tools were missing, and
> proposes how the cut-out becomes part of UberScene. It also lists the smaller gaps the same edit showed.

## Context

The edit is 38 seconds of a NASA interview (public domain): a cold open on the speaker's strongest line, then the
answer with graphics anchored to his words. Three versions were made; the notes below come from all three.

### What was hard, hardest first

1. **The cut-out.** UberScene cannot separate a person from a background. A script ran a segmentation model on every
   frame, wrote the speaker over green, and the film keyed the green out with `colorKey`. It took four passes to look
   acceptable, and each fix was specific to this footage: a blocky edge (the model works at 256 px), patches of the
   studio wall coming through, a colour rule that then ate his jacket, a dark rim on a blue card. A better model
   removed all four at once (see the measurements below), which says the problem was the model and the green
   carrier, not the tuning.
2. **Layers.** Video drew under all graphics, so a white or blue card as a `<Shape>` covered the cut-out and the
   b-roll that should sit on it. The cards became full-frame image clips. This is fixed since: tracks now draw in the
   order the file writes them, footage included (#192).
3. **Layout by trial.** Caps ran off the frame, a title sat on his face, lines overlapped, a large title wrapped onto
   two lines. `--check-layout` caught what left the safe zone and, given his face as the subject, text over the
   face. It does not report text over text, or a title that wraps or overflows its box. Each of those took a render to
   see.
4. **Sound, judged blind.** An agent cannot hear. Every effect was chosen by its measured length and pitch, and the
   mix by loudness numbers. The first two sets of effects were wrong for the film, and only a person could say so.
   The mix also stops at -17 LUFS: speech peaks leave no room to reach -14 without a limiter.
5. **Pacing, judged blind.** Flash cards of 0.3 and 0.4 s passed every check and were too fast to read. The skill's
   rule (0.5 s plus 0.3 s a word) existed, but nothing checks it.
6. **Getting the footage.** Not UberScene's job, but it took the longest: the source's preview file was a 2.5-minute
   excerpt, and the full file's index describes more bytes than the server holds.

### A bug it exposed

An image used by two clips failed with "The image source is detached": every clip of a still image was handed the
same frame, and the first clip to end closed the picture for the rest. A fix with a test exists
(`packages/player/src/media/frame-source.ts`) and is not merged at the time of writing.

### Tools that were missing

Eight, counted from the edit. The first is this record's decision; the rest are in "Also missing" below.

| | Missing | What it cost |
|---|---|---|
| 1 | A person cut out of the background | a script outside UberScene, four passes, a green-screen detour |
| 2 | Coloured words inside one title | one `<Title>` per line, each one colour, placed by hand |
| 3 | A loudness target with a limiter on export | the film is 3 dB quieter than the skill's own target |
| 4 | A duration that ends on a word or a beat | card lengths written as seconds, worked out from word times |
| 5 | A check for text over text, and for text that wraps or overflows its box | a render to find each one |
| 6 | A check for read time | flash cards too short to read passed every check |
| 7 | A sound report by role (voice against music, an effect at each cut) | the mix set by guessing ratios |
| 8 | Graphics between video layers | image clips standing in for cards; fixed in #192 |

## Measurements: seven models on the same frames

Four seconds of the interview (96 frames, 1920x1080, hair and moving hands, a saturated blue wall behind), on four
CPU cores with no GPU. "Wall in the cut-out" is the share of the cut-out's pixels that are the wall's blue, on three
frames: a direct measure of background leaking through.

| Model | Licence | Speed | Wall in the cut-out | What it looks like |
|---|---|---|---|---|
| MediaPipe selfie segmenter (first used) | Apache-2.0 | 0.016 s/frame | 2.51 % | blocky edge, patches of wall beside the arms |
| MediaPipe selfie multiclass | Apache-2.0 | 0.11 s/frame | 0.50 % | a grey veil of background over the whole frame |
| U²-Net human segmentation | Apache-2.0 | 0.34 s/frame | 0.38 % | clean, soft: hair is a smooth blob |
| IS-Net general use | not checked | 0.86 s/frame | 0.31 % | sharp, hard edges, a stray line above the hair |
| RobustVideoMatting, MobileNetV3 | GPL-3.0 | 0.14 s/frame | 0.29 % | fine hair, clean hands |
| RobustVideoMatting, ResNet50 | GPL-3.0 | 0.22 s/frame | 0.22 % | the same, a little cleaner |
| BiRefNet portrait | MIT | 47 s/frame | 0.22 % | as clean, a little softer on hair |

Notes on the table:

- BiRefNet ran out of memory on the video and was run on three stills. On a CPU it is not usable for video: this film
  would take about eleven hours.
- MODNet (Apache-2.0) was not tested: its weights could not be fetched from the test machine. It is the first
  candidate to test next, since it is permissive and made for portraits.
- The frame-to-frame change of the matte was 0.20 to 0.26 for every model but the first (0.78). It includes the
  speaker's real movement, so it does not rank the good models; steadiness was not judged beyond stills.
- RobustVideoMatting also returns its estimate of the person's colour at the edges. Using it removed the wall's tint
  from his outline, which the other models leave in.

The whole film's cut-out took about three minutes with RobustVideoMatting ResNet50 on that machine.

## Decision

### 1. A matte is a file beside the footage

A matte is a greyscale video with the frames of its footage: white where the person is, black where they are not,
grey at hair and motion blur. It sits beside the footage (`talk.mp4`, `talk.matte.webm`) and is named in the
footage's manifest entry:

```json
"talk": {
  "kind": "video",
  "duration": 36.62,
  "matte": { "file": "talk.matte.webm", "model": "rvm-resnet50", "made": "uberscene 0.7.0" }
}
```

A file, and not a step of the render, for the reasons the transcript and the beats are files: it is made once, it can
be looked at and replaced, the preview and the export read the same thing, and a render stays as fast and as
repeatable as before. A matte made by any other tool (a paid service, a roto artist) is used the same way.

### 2. `cutout` on a clip uses it

```tsx
<Clip id="speaker" src="asset:talk" in="word:42" out="word:54.end" cutout />
<Clip id="speaker" src="asset:talk" cutout={{ shrink: 1, feather: 1.5, despill: 0.8 }} />
```

- `cutout` makes the clip transparent where its matte is black. A clip whose asset has no matte is an error that
  names the command that makes one.
- `shrink` pulls the edge in by pixels, `feather` softens it, `despill` takes the old background's tint out of the
  edge (for models that do not return the person's colour).
- The matte is the clip's alpha, applied before its `effects`, so `grayscale` or `blur` act on the person alone, and
  everything under the clip shows through. With tracks drawing in file order (#192), a card under the speaker is a
  `<Shape>` on the track before.
- In the player and the export the matte is a second source for the clip, decoded at the same source time, and one
  pass in the compositor multiplies it into the picture. The green screen and `colorKey` are not involved: nothing
  is keyed, so nothing of the person is lost to the key and compression cannot smear a screen colour into the edge.

### 3. `uberscene matte` makes it

```sh
npx uberscene matte talk.mp4                 # writes talk.matte.webm and the manifest entry
npx uberscene matte talk.mp4 --model rvm-resnet50
npx uberscene look video.tsx --matte speaker  # the clip's matte beside its picture, to judge the edge
```

- The command decodes the footage, runs a matting model on each frame in order, and encodes the matte. It prints the
  model, the seconds per frame and the two numbers above (background in the cut-out where it can be told, change
  between frames), so an agent has something to read.
- Models run through ONNX Runtime in Node, an optional dependency fetched on first use, as Chrome and the native
  codecs are. RobustVideoMatting publishes ONNX exports; the others tested here ran through ONNX already.
- **UberScene ships the runner, not the models.** A small registry lists each model: its name, where its file comes
  from, its SHA-256, its licence, and whether it keeps state between frames. The first use of a model prints its
  licence and fetches it from its own source. So a GPL-3.0 model is the user's download and choice, and is never in
  UberScene's package. Whether this is enough for RobustVideoMatting needs a legal read before it is offered by name.
- The default is the best permissive model we have validated. Today that is U²-Net human segmentation, which is
  visibly softer than RobustVideoMatting; testing MODNet, and BiRefNet on a GPU, comes before choosing.
- The matte also gives the subject's box over time, which `--check-layout` and `frame={{ focus }}` read from the
  manifest today. `uberscene matte` writes `subjects` from it, so "text over the face" is checked without the
  `--subject` flag.

### 4. In this order

1. **The matte as an input.** The manifest field, `cutout` on a clip, the second source and the compositor pass, in
   the player and the export. With this alone, a matte made by hand (as in this edit) works, with no model in the
   repository.
2. **The command.** `uberscene matte`, the runner, the registry with one permissive model, `subjects` from the matte,
   `look --matte`.
3. **The interview edit as an example**, rebuilt on `cutout` with shapes for its cards, and a section in the agent
   skill: when a cut-out earns its place, how to check its edge.
4. **Quality.** `despill` for models without a colour estimate, smoothing over time for models that work one frame
   at a time, a GPU provider, more models in the registry.

## Also missing

The other gaps from the table, each with what would close it. None is decided here; each is small enough for its own
change.

- **Coloured words in a title.** A `<Title>` takes one colour. A mark inside the text,
  `<Title>into the <Mark color="$accent">stars</Mark></Title>`, or style ranges by word. Captions already colour the
  word being said; the same machinery fits.
- **A loudness target on export.** `--loudness -14` measures the mix (the meter exists, `look --listen`) and applies
  gain with a true-peak limiter at -2 dBTP. Without it, speech cannot reach the target.
- **A duration that ends on a moment.** `duration={{ until: "talk@word:39" }}`, with beats too: a card that lasts
  "until he says the next sentence" stays right when the cut changes. Today `until` takes only an element.
- **Layout: text over text, and text that does not fit.** Two rules for `--check-layout`: two titles whose ink
  overlaps, and a title whose text wraps or overflows its `box`. Both were measured by eye in this edit.
- **A read-time check.** A title on screen for less than 0.5 s plus 0.3 s a word is reported, by `lint` or
  `--check-layout`. The rule is in the skill; nothing enforces it.
- **A sound report by role.** `look --listen` gives the whole mix. Per role (dialogue, music, effects): each one's
  loudness, the music's level under speech, and the cuts that have no sound on them. It gives an agent, which cannot
  hear, the ratios a mixer listens for.

## Alternatives set aside

- **Keep the green-screen detour.** It needs no new code, and it is what this edit used. It loses hair to the key,
  lets compression tint the edge, doubles the footage on disk in colour, and breaks when the person wears the key
  colour.
- **Segment in the browser at render time.** No file to manage, but the render becomes slow and depends on a model
  being present, the preview and the export can disagree, and the result cannot be inspected or replaced.
- **Bundle one model in the package.** Simplest for the user, but it fixes the quality at whatever is permissively
  licensed today, adds tens to hundreds of megabytes to an install, and the field moves fast.
- **A video with an alpha channel as the asset.** VP9 and ProRes 4444 carry alpha, and decoders differ in whether
  they return it. A separate greyscale file works with every decoder the player has, and can be remade without
  touching the footage.

## Consequences

- A new optional dependency (ONNX Runtime) and a model download on first use, both outside the default install.
- The manifest grows a field, and a clip a prop; both are additive.
- The compositor gains a second source per clip. A clip with a matte decodes two videos, so it costs about twice a
  plain clip to draw.
- The quality of a cut-out is the model's. The registry makes that visible and replaceable, and the numbers the
  command prints make a bad matte something an agent can notice.
- Licences become something the tool shows the user, once per model.

## Not decided yet

- The default model, pending MODNet and a GPU run of BiRefNet, and the legal read on offering a GPL model by name.
- Whether `cutout` should also take a matte for things other than people (a product, a car): the models differ.
- The matte's codec and bit depth. Eight-bit VP9 was enough here; fine hair over a bright card may want ten.

## Source

The interview edit, its three versions and the model comparison were made in one working session; the film's file
and media are not in the repository. Footage: Dr. Joe Westlake, NASA's Scientific Visualization Studio
(svs.gsfc.nasa.gov/15111), public domain. Models: MediaPipe (Google), U²-Net (Qin et al.), IS-Net (Qin et al.),
RobustVideoMatting (Lin et al., 2021), BiRefNet (Zheng et al., 2024). Licences were read from each project's
repository, except IS-Net's, which was not found there.
