# Liftoff

Forty-two seconds of launches, from Apollo to Starship, cut to their music: 20 bars at 120 BPM, one edit in two
shapes, vertical 1080x1920 and wide 1920x1080 (`--props '{"aspect":"16:9"}'`). The music is the clock. Every shot and
title starts on a beat (`anchor="song" at="beat:N"`), and each era's engines light on a downbeat.

| Beats | Section | Picture | Music (`score.ts`) |
|---|---|---|---|
| 0–15 | countdown | the Saturn V on its pad; ten to one on the beats | a drone opening up, a tick, mission-control beeps |
| 16–31 | 1969 | Apollo 11's engines light on beat 16, the climb, the stages | the ignition hit, warm triangles with a tape wobble, a half-time beat |
| 32–47 | the Shuttle | Atlantis's engines light on beat 32, Endeavour at night | square-wave arpeggios, saw bass, a big-room snare, a riser |
| 48–71 | now | a Falcon Heavy lights on the drop, a cut a beat, Artemis I, boosters landing | supersaw chords, sub bass, the beep grown into a lead |
| 72–79 | the end | the Starship booster caught at the tower; "Every launch starts at zero" | a crash on the catch, the first chord ringing out |

## Engines on the beat

`scripts/ignition.ts` finds the frame each launch clip lights: the first jump in the count of warm, bright pixels
where the engines are. It writes the times to `ignitions.ts`, and the film starts those shots so that frame is the
beat (`from: { lights: 16 }`).

## The music is code

`score.ts` is a Strudel score: one chord progression and one melody, played on each era's instruments, a cycle a
bar. `scripts/music.ts` renders it with `renderStrudel` from `@uberscene/render`, masters it to -14 LUFS and adds it
with its grid, so beat N is at exactly N / 2 seconds. Strudel is AGPL-3.0-or-later and not part of UberScene: the first
render shows its licence and installs it into `~/.cache/uberscene/strudel` (`UBERSCENE_ACCEPT_LICENCE=strudel` accepts
it where no one can answer).

## Rebuild it

```sh
pnpm --filter @uberscene/example-liftoff prepare-media
npx uberscene examples/liftoff/video.tsx --quality very-high --out examples/liftoff/out/liftoff-9x16.mp4
npx uberscene examples/liftoff/video.tsx --props '{"aspect":"16:9"}' --quality very-high --out examples/liftoff/out/liftoff-16x9.mp4
npx uberscene examples/liftoff/video.tsx --check-sync      # 44 of 44 on the beat
```

`prepare-media` reads twelve stretches of NASA footage from Wikimedia Commons at their own resolution, up to 4K, so
the vertical crop drops pixels instead of stretching them (`scripts/fetch.ts`, credits in [CREDITS.md](CREDITS.md)),
renders the music and finds the ignitions. The two vertical Starship clips (`media/catch.webm`, `media/return.webm`)
are not from Commons and not in the repository: supply your own.

`examples/tiktok` renders it as a TikTok post too, with the code in a split: a hook ("How do you edit 60 years of
launches?" … "BUT this one has no editor. It's code. Even the music."), then `score.ts` and `video.tsx` lighting up as
they play (`pnpm --filter @uberscene/example-tiktok render
liftoff`).
