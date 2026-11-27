# Music machine

Forty seconds drawn in code for a phone, 1080x1920, with no footage: you see the music. Each voice of the score
has a lane, and each of its notes is a block that falls down the lane and lands on the strike line on the moment it
sounds. The block bursts, its pad lights, and the kick shakes the frame.

| Bars | Section | What plays | What you see |
|---|---|---|---|
| 1–2 | the drop | two bars of everything, first | the film opens with all six lanes full |
| 3–6 | power up | the kick, then euclidean hats, the acid bass, the snare | the lanes light one by one, each as its first note comes into view |
| 7–10 | build | held chords, then the lead and its echo; the kick rolls into the drop | long chord blocks that name themselves (`Fm`, `D♭`); the lead and its fainter answer, left and right by pitch |
| 11–14 | drop | everything: chord stabs, the bass on sixteenths, jumping octaves | all six lanes full; a flash on the first beat |
| 15–18 | power down | notes fall out of every voice at random, more each bar | the lanes thin out and go dark until the kick is alone |
| 19–20 | the end | one last hit, the chord ringing | "Every block is a note. All code." |

## The score is the clock

The music is a [Strudel](https://strudel.cc) score, `score.ts`. Each voice in it has a name:

```ts
note("f1*4").s("sine").penv(36).decay(.32).sustain(0).voice("kick")
```

The score uses what Strudel says in a few characters: `"x(5,8)"` is a euclidean rhythm, `.off(1/8, x => x.add(n(7)))`
answers the lead an eighth later and an octave up, `.lpf(sine.range(350, 2200).slow(4))` opens and closes the bass's
filter over four bars, `.ply("<1 1 1 [1 1 2 4]>")` rolls the kick into the drop, and `.degradeBy("<0 .3 .6 1>")` drops
notes at random as the machine powers down. Strudel's randomness is a function of time, so every render is the same.

`scripts/music.ts` renders the score with `renderStrudel` from `@uberscene/render`, masters it to -14 LUFS, and adds
the WAV with its grid: 120 BPM from 0 s, so beat N is at exactly N / 2 seconds. The render also returns every note it
played (its time, length, gain and voice), and the script writes them to `notes.ts`. `video.tsx` draws from that file:
a block's distance above the line is the time until its note, so picture and sound cannot drift.

A lane is a `<Layer>`. It lights two seconds before its voice plays, as the first note comes into view, and goes dark
when the voice stops. Inside a layer everything is computed from the time alone.

Strudel is AGPL-3.0-or-later and not part of UberScene: the first render shows its licence and installs it into
`~/.cache/uberscene/strudel` (`UBERSCENE_ACCEPT_LICENCE=strudel` accepts it where no one can answer).

## Rebuild it

```sh
pnpm --filter @uberscene/example-machine prepare-media   # media/song.wav and notes.ts
npx uberscene examples/machine/video.tsx --quality very-high --out examples/machine/out/machine.mp4
npx uberscene examples/machine/video.tsx --check-sync                        # 15 of 15 on the beat
npx uberscene examples/machine/video.tsx --check-layout --safe-zone tiktok   # no layout issues
```

`examples/tiktok` renders the post that shows the code beside it: `pnpm --filter @uberscene/example-tiktok render machine`.
