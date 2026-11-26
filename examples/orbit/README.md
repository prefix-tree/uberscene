# Earth at night

Thirty-two seconds of night timelapses from the International Space Station, cut to their music for a phone: 1080x1920,
16 bars at 120 BPM. The music is the clock. Every shot and every title starts on a beat (`anchor="song" at="beat:N"`),
and every lightning strike lands on a snare.

| Bars | Section | Music | Picture |
|---|---|---|---|
| 1–4 | intro | a pad and a soft pulse | the Milky Way, moonlit clouds, the aurora on the limb; "Earth at night" on bar 3 |
| 5–8 | build | hats, then snares, the kick, a riser | cities, then a cut on every beat, with lightning on every snare |
| 9–12 | drop | the full beat and bass | the aurora, a cut on every beat, then every two |
| 13–16 | outro | back to the pad, the last chord on bar 16 | cities, a bar each, ending on the sunrise; "Every light is someone." on bar 15 |

## Lightning on the snare

The storm footage flashes on its own time. `scripts/flashes.ts` finds each flash: the frame where the count of bright,
blue-white pixels at least doubles (city lights are orange, so they don't count). It writes the times and where each
flash is across the frame to `lightning.ts`. The film imports it:

```tsx
{ id: "strike-1", beat: 21, ...lightning(0) },   // starts on the frame flash 0 begins, cropped on it
```

So each storm shot starts on the snare, at the very frame its flash begins, cropped around the flash. A stop of
exposure on the cut fades out in a fifth of a second.

## Check the sync

Everything below reads the timeline only. It needs no browser and none of the media, so it runs on a fresh clone:

```sh
npx uberscene examples/orbit/video.tsx --check-sync
```

```
music: song  120 BPM  a beat every 0.50 s  beat:0 to beat:63  0.00–32.00 s  (beats on a grid)
     0.00  start  milky-way                 on    song@beat:0  (tied to the beat)
…
    10.50  start  strike-1                  on    song@beat:21  (tied to the beat)
…
38 of 38 cuts and starts on the beat, 0 just off it, 0 elsewhere; 38 tied to a beat. 0 sync issues.
```

```sh
npx uberscene inspect examples/orbit/video.tsx --events --in 10..12.6 --kinds beat,start
```

```
  10.00  f300    beat     song 20
  10.00  f300    start    coast  clip  on song@beat:20
  10.50  f315    beat     song 21
  10.50  f315    start    strike-1  clip  on song@beat:21
  11.00  f330    beat     song 22
  11.00  f330    start    stars  clip  on song@beat:22
…
```

The beats are a grid: the music is made by a script on a clock and added with `--bpm 120 --first-beat 0`, so beat N
is at exactly N / 2 seconds. [Sync](../../docs/guide/sync.md) explains every field.

## Rebuild it

The media is not in the repository (about 120 MB). One command makes it:

```sh
pnpm --filter @uberscene/example-orbit prepare-media
npx uberscene examples/orbit/video.tsx --out examples/orbit/out/orbit.mp4
```

It needs ffmpeg with libvpx-vp9 and dav1d. It runs three scripts:

| Script | What it does |
|---|---|
| `scripts/fetch.ts` | Reads five timelapses from Wikimedia Commons, trimmed to the seconds used, and writes them to `media/` as VP9 without sound. It adds them to `uberscene.json` and writes `CREDITS.md`. ffmpeg seeks each one to the seconds used. |
| `scripts/music.ts` | Synthesizes `media/song.wav` (pad, arpeggio, drums, bass, riser) and adds it with its grid. |
| `scripts/flashes.ts` | Finds the lightning in `media/storms.webm` and writes `lightning.ts`. |

`examples/tiktok` renders it as two posts too: the film alone, and the film over its own source
(`pnpm --filter @uberscene/example-tiktok render orbit`).

## Measured

- `--check-sync`: 38 of 38 on the beat, all tied to it.
- `--check-layout --safe-zone tiktok`: no issues.
- `--check-motion`: no still stretch.
- Export: -14.0 LUFS integrated, peak -3.6 dBFS. The drop is 4 LU louder than the intro and the outro.

The footage is public domain, from NASA's crew Earth observations and its Scientific Visualization Studio
([CREDITS.md](CREDITS.md)). The music is made here and shares the repository's licence.
