# Why we started

A 55 second film about why UberScene exists, at 1920x1080 with sound. There is no footage: every frame is drawn by
code in `video.tsx`, on the video's clock, so the film is one file of the kind it talks about.

| Second | Beat |
|---|---|
| 0 | Filming takes five minutes, editing takes the evening. |
| 6 | We wanted AI to do the editing, but a model can't drag a timeline. |
| 10.5 | And ffmpeg flags are guesswork. |
| 15 | What models are actually good at: writing code. |
| 20 | So we made the video a file: the listing types in and the timeline grows out of it. |
| 29 | Diff it, review it: one changed value, approved like any other code. |
| 33 | Cut on words, not seconds: `out="word:6.end"`. |
| 37 | Your agent and you, one file: a prompt and a drag both change the same text. |
| 41 | The foundation: UberScene at the bottom, Cutleap, your agent and your app on top. |
| 49 | The name and the line under it. |

## Render it

```sh
npx uberscene video.tsx --out out/founding.mp4
```

Look at a few moments without rendering the whole film:

```sh
npx uberscene look video.tsx --at 5.5,17,27,35.5,46.5,53.5 --out look.png
```

## How it is made

- Each beat is a `<Layer>` on the `scenes` track, with a literal start and duration, so the timeline shows the story
  as ten bars that can be moved and retimed.
- Inside a layer everything is a function of `useLayer().elapsed`: words rise in one after another, code types at a
  fixed rate, bars grow when the line that makes them is typed, blocks fall and bounce. The preview and the export
  draw the same frame for the same second.
- The look is the documentation site's: paper, ink, one orange, hard shadows, Barlow Condensed and Geist Mono.
- The sound cues are the shorts' (`examples/shorts/media/sounds.ts`), each hung off its scene with `anchor` and
  `offset`, so moving a scene moves its sounds.
- The music is `media/bed.ts`: a pad through one chord every five seconds, minor while the story is the problem and
  major once the video becomes a file, where a pulse, a bass and an arpeggio come in. `pnpm bed` writes `bed.wav`
  again, and the test checks the committed file is what the code writes.
