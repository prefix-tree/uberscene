# TikTok posts of the example films

Each film becomes two vertical posts, 1080x1920:

- **`<name>-code.mp4`**: "This video is code." The film plays on top, and its own source scrolls below in an editor
  window, with the line of whatever is on screen lit as it appears. It ends on a card with the project's name and
  address. (`frame.tsx`, with the window in `code-view.tsx`.)
- **`<name>-reveal.mp4`**: the film full screen, then for a stretch it slides up into the top of the frame and its own
  source rises into the bottom, lighting each line as what it writes comes on screen; then the code drops away and the
  film fills the frame again. For a film cut to music the stretch runs from one section to the next (orbit: the code
  comes up for the build and goes on the drop), so both moves land on beats. (`reveal.tsx`.)
  A film can open on hook lines (`hook`: a question, its answer, then the turn), and show its music's Strudel score
  before its pictures' file (`music`). Liftoff's asks "How do you edit 60 years of launches?", answers "Footage. Music.
  An editor.", then turns: "BUT no After Effects. No Premiere. Just code." and "Building it to 10/10. Follow along." At 12 s `score.ts` comes up with
  the playing section lit, its light moving from 1969 to the 80s as the sound does, and at 20 s it switches to
  `video.tsx`. The machine's asks "Can you see music?", and its score comes up as the lead joins, the lit chord in the
  code the block landing above it.
- **`<name>-post.mp4`**: just the film. A tall film fills the frame; a wide one sits across it over a blurred copy of
  itself, so there are no bars. (`post.tsx`.)

```sh
pnpm --filter @uberscene/example-tiktok render              # every film
pnpm --filter @uberscene/example-tiktok render reel hero    # some of them
```

The posts land in `out/`, which is not committed.

| Name | Film | Its media |
|---|---|---|
| `reel` | `interview/reel.tsx`, the interview as a vertical reel | `bash examples/interview/scripts/prepare.sh` |
| `cards` | `interview/cards.tsx`, the speaker cut out on blue cards | the same |
| `pipeline` | `showcase/pipeline.tsx`, a prompt fanning out into five edit passes | `pnpm --filter @uberscene/example-showcase gen` |
| `beats` | `showcase/beats.tsx`, cuts on the beat | the same |
| `hero` | `showcase/hero.tsx`, the woodblock logo | in the repository |
| `snake-heart` | `shorts/snake-heart.tsx`, a snake that ends in a heart | in the repository |
| `game-lighting` | `shorts/game-lighting.tsx`, how game lighting fakes it | in the repository |
| `orbit` | `orbit/video.tsx`, Earth at night from the space station, cut to its music | `pnpm --filter @uberscene/example-orbit prepare-media` |
| `liftoff` | `liftoff/video.tsx`, sixty years of launches, Apollo to Starship | `pnpm --filter @uberscene/example-liftoff prepare-media` |
| `machine` | `machine/video.tsx`, a music machine: every falling block is a note of its score | `pnpm --filter @uberscene/example-machine prepare-media` |

A film whose media is not made yet is skipped, and the script says which command makes it.

## How it is made

1. **The film**, rendered from its own folder as it is, into `out/<name>.<hash>.webm`. It is made again only when its
   file or its manifest changes.
2. **The lit lines.** The script resolves the film and, for each element on screen (a title, a clip, a shape, a
   layer…), finds the line of its `id="…"` in the source and lights it from when the element starts to when it ends.
   The window glides to the newest lit line and holds it about a third of the way down.
3. **The two posts**, with the rendered film as an asset (`film-<name>` in `uberscene.json`) and the source, the lit
   lines, its size and length as props.
4. **A layout check** of the code version against TikTok's safe zone (`--safe-zone tiktok`: x 120 to 960, y 240 to
   1260). The code window runs on below the zone under the phone's caption and buttons, faded, and is marked `ground`;
   its lit line is kept inside the zone.

To post: the code version as the hook ("this is code"), the film version as a follow-up, or the other way round.
