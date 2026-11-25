# Review: watch it as a stranger would

Read this before you hand over a video, and before any render that takes minutes. The checks in the loop (`lint`,
`--check-layout`) catch what breaks. This pass catches what's weak: a video can be clean and still dull.

## Measure first

Numbers before opinions. Run these and fix what they say before you look at anything:

```sh
npx uberscene lint video.tsx                      # exits 0
npx uberscene video.tsx --check-layout            # exits 0, or 3 for issues you keep and name
npx uberscene video.tsx --check-motion            # every stretch where nothing moves for a second or more
npx uberscene inspect video.tsx                   # the timeline: lengths, cuts, words
npx uberscene look video.tsx --at <beats> --listen all --out review.png
```

From `inspect` and the sheet, check:

- every title is on screen at least 0.5 s plus 0.3 s per word (`--check-layout` reports `read-time`);
- no stretch longer than 4 s with nothing new (a dead beat);
- no text smaller than 28 px at 1080 ([text.md](text.md));
- the sound: `lufs` about -14, `truePeakDb` at most -2, no silence you didn't mean ([sound.md](sound.md));
- every still stretch `--check-motion` reports is a hold you meant, and every planned move shows on a `--motion` strip;
- the length matches the brief.

## Then look

Draw one sheet with a cell per beat (`look --at <one moment per beat> --columns 4`), and one strip per move that matters
(`look --motion <id>`). For each cell, write one line describing it as someone who has never seen the brief would:
what they see first, what they read. Then ask:

| Question | A fail looks like |
|---|---|
| Does the first frame make you want the second? | a logo, a black frame, a title card |
| Can you say the one thing after watching? | three ideas, none landed |
| Is there one thing to look at in each frame? | two titles fighting, the accent on everything |
| Does each cut carry motion? | a scene that stops, then the next starts from rest ([motion.md](motion.md)) |
| Can every word be read in time, at phone size? | a line gone before it's read; text on a busy sky |
| Does the sound do something? | music under it, nothing landing on a hit |
| Does it end on the payoff? | a long logo spin after the point |
| Does anything look like a default? | the theme's palette as it is, every title the same fade ([look.md](look.md)) |

Don't score it out of 10. Name what's wrong.

## Rank, fix, look again

Sort what you found:

- **P0**: wrong or broken. A misspelled name, an invented screen, text off the frame, a cut mid-word, silence. Fix
  every one.
- **P1**: weak. A dead beat, a default look, a cut that stops the motion, a title held too short. Fix what you can.
- **P2**: polish. A slightly better ease, a cleaner grade. Fix if cheap; otherwise list it.

After fixing, look again at only what changed (`look --around <id>`, or `--at` those beats), not the whole sheet.
Add every default you removed to the plan's banned line ([story.md](story.md)), so the next edit doesn't bring it back.

## Hand it over

Send the sheet with your report, and keep the report short:

- what you made, its length, and the storyline you picked (and the ones you didn't);
- the calls you made that the person might not expect (a cut line, a colour, the music);
- what was measured (levels, sizes, timing) and what you only looked at;
- the weakest moment, honestly, and what would fix it;
- any warning you kept, and why.

Render only after the person has seen the sheet, unless they asked for the file straight away.

## When it goes wrong

| What you see | What to do |
|---|---|
| A stretch where nothing moves (`--check-motion` lists them) | Look at it on a `--motion` strip; give it a move from [motion.md](motion.md), or cut it shorter |
| The hero is small | Frame tighter: scale or crop the clip (`transform.scale` with an `anchor` on the subject) until it fills 15 % of the width or more (`where` measures a graphic; look at a `--still` for footage) |
| A title gone before it's read | Hold it 0.5 s plus 0.3 s per word; cut words before shortening the hold |
| A sound early or late | Anchor it to its picture element, one frame after (`offset={0.033}` at 30 fps) |
| The music ends mid-phrase | End the bed on its own end, or fade it over 1-2 s to the last frame |
| A cut feels like a stop | Key both sides moving the same way through the cut ([motion.md](motion.md)) |
| A landing differs between the preview and the render | Something carries state between frames; draw it as a function of the time (`useLayer()`, `spring()`) |
| Text cut at the edge | Every word fully in the frame or fully out; `--check-layout` lists what leaves the safe area |
| A zoom used for energy | Cut on the beat instead; hold a good shot for a whole beat |
| Labels and words nobody asked for | Only the words in the plan go on screen |
| Glow, gradients, lens flares | Name them in the plan's banned line, then remove them |
| The theme's look, unchanged | Bring in the brand, or turn the brief's adjectives into values ([look.md](look.md)) |
