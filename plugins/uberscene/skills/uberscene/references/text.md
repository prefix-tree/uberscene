# Text and captions: read at a glance

Read this before you place titles, captions or labels. Text in a video is read once, at the speed the video sets, often
on a phone. Every rule here is about reading it in time.

## Size

Sizes for a 1080-high frame; scale with the height for other sizes (1920-high vertical: about 1.8 times):

| Text | Size (px at 1080) |
|---|---|
| A hero word or a short line | 120-200 |
| A title | 64-96 |
| A subtitle, a kicker | 36-48 |
| Captions | 44-56 at 1080 wide; 60-72 on a vertical 1080x1920 |
| Labels on a diagram, a lower third's role | 28-36 |
| Nothing | under 28: unreadable on a phone |

- **Short lines, big type.** Six words per title at most. Too long for the size? Cut words.
- **Numbers in tabular figures** when they count or line up, so they don't jitter.
- **Two weights**: one for headings, one for everything else.

## Time

- Hold a title for 0.5 s plus 0.3 s per word, at least. Two lines of eight words each: about 5 s.
- One title on screen at a time, unless one is a label on something.
- Enter fast (0.3-0.6 s) and leave faster (about three quarters of the entrance). The entrance is the motion style's
  (`theme.motion`); write `enter` only where one should differ.
- A title that names something said appears with the word, anchored to it (`anchor="talk" at="word:14"`), not before.

## Place

- **Inside the safe area.** `--check-layout` reports text that leaves title-safe, covers the captions or covers the
  subject (pass `--subject x,y,w,h` for a face). On a vertical video pass `--safe-zone tiktok`, `reels` or `shorts`: the
  platform's buttons and caption cover the right edge and the bottom.
- **Not on the face.** Lower thirds sit low and to one side; a callout points at its thing from empty space.
- **Same place, same job.** A title in the same spot each time is read faster than one that moves around.
- **Reading over footage**: a scrim (`<Layer ground>` with a dark gradient, or the title's `background`) or a shadow.
  Check it with `look` at phone size: if you squint, it fails.

## Captions

- **From the transcript**: `<Captions src="asset:talk">` follows the clips through every trim. Check the transcript's
  words first (names, product terms, numbers are what speech-to-text gets wrong) and fix them in its JSON.
- **Group by pace**: 2 to 4 words per cue for a fast, punchy short (`maxChars` about 16); a full line of 6 to 8 words
  for an interview or a talk (`maxChars` about 42). Break at a pause or a phrase, never mid-name.
- **One style for the film**: `wordHighlight` or `karaoke` for shorts, no `animation` (plain cues) for interviews and talks.
- **Placement**: the default lower safe area for landscape. On vertical, higher than you think, about two thirds down,
  clear of the platform's caption and buttons; check with `look --zones tiktok`.
- **Nothing under them.** Lower thirds and callouts move when captions are on; the layout check reports overlap.
- **Always** for anything posted to a feed: most of it plays muted. Also export them: `--srt captions.srt`.

## Words

- Sentence case, not Title Case. Capitals only for a deliberate display style, and then short.
- No full stop on a one-line title; a full stop on a sentence.
- Names, numbers and product terms exactly as the person writes them.
