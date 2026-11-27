# Music machine

Thirty-six seconds drawn in code for a phone, 1080x1920, with no footage: you see the music. Each voice of the score
has a lane, and each of its notes is a block that falls down the lane and lands on the strike line on the moment it
sounds. The block bursts, its pad lights, and the kick shakes the frame.

| Bars | Section | What plays | What you see |
|---|---|---|---|
| 1–4 | power up | the kick, then hats, bass, snare | the lanes come on one by one |
| 5–8 | build | chords, then the lead; a riser | long chord blocks that name themselves (`Fm`, `D♭`), the lead moving left and right by pitch |
| 9–12 | drop | everything, the chords pumping | all six lanes full; a flash on the first beat |
| 13–16 | power down | the voices stop one by one | the lanes go dark until the kick is alone |
| 17–18 | the end | one last hit, the chord ringing | "Every block is a note. All code." |

## The score is the clock

The music is a [Strudel](https://strudel.cc) score, `score.ts`. Each voice in it has a name:

```ts
note("f1*4").s("sine").penv(36).decay(.32).sustain(0).voice("kick")
```

`scripts/music.ts` renders the score with `renderStrudel` from `@uberscene/render`, masters it to -14 LUFS, and adds
the WAV with its grid: 120 BPM from 0 s, so beat N is at exactly N / 2 seconds. The render also returns every note it
played (its time, length, gain and voice), and the script writes them to `notes.ts`. `video.tsx` draws from that file:
a block's distance above the line is the time until its note, so picture and sound cannot drift.

A lane is a `<Layer>` that starts on a beat, a bar before its voice comes in, so the first notes are seen falling.
Inside a layer everything is computed from the time alone.

Strudel is AGPL-3.0-or-later and not part of UberScene: the first render shows its licence and installs it into
`~/.cache/uberscene/strudel` (`UBERSCENE_ACCEPT_LICENCE=strudel` accepts it where no one can answer).

## Rebuild it

```sh
pnpm --filter @uberscene/example-machine prepare-media   # media/song.wav and notes.ts
npx uberscene examples/machine/video.tsx --quality very-high --out examples/machine/out/machine.mp4
npx uberscene examples/machine/video.tsx --check-sync                        # 14 of 14 on the beat
npx uberscene examples/machine/video.tsx --check-layout --safe-zone tiktok   # no layout issues
```

`examples/tiktok` renders the post that shows the code beside it: `pnpm --filter @uberscene/example-tiktok render machine`.
