# Nature, every sound laid by hand

Twenty-five seconds of nature, 1080x880, cut to 120 BPM, with every sound placed in code: the film the
[sound-breakdown post](../tiktok/breakdown.tsx) shows above its own timeline (`pnpm --filter @uberscene/example-tiktok
render nature`, with `POSTS=breakdown` for that post alone).

| Time | Picture | Sound |
|---|---|---|
| 0–3 s | the fire, full frame | its crackle |
| 3–6 s | six tall strips land one a beat over the fire | a whoosh on each (`align="onset"`), each strip's own sound 0.3 s early |
| 9–15 s | the strips rotate, every beat, then every half beat | a rain bed; the score's clock speeds up and a line climbs |
| 15 s | the storm, full frame | a quarter beat of silence, then the braam and thunder |
| 15–22 s | a cut every two beats: surf, waterfall, rain, snow, grass, stork | each place's sound, the stork's wings |
| 22–25 s | the fire pit | the last low note |

The music (`score.ts`, Strudel) is punctuation, not a bed: it comes in at the film's few points of sync and leaves
room for the places' own sounds. At most one foreground sound, one bed and the music play at a time.

## Make the media

```sh
pnpm --filter @uberscene/example-nature prepare-media
```

It fetches the stretches named in `sources.ts` with `uberscene fetch`: footage from Pixabay (needs `PIXABAY_API_KEY`;
Pixabay's own sound tracks are silent, so none is used) and recordings from Freesound, CC0 (needs
`FREESOUND_API_KEY`). It levels every recording to one loudness, renders the score with Strudel (fetched on first use,
AGPL-3.0-or-later; `UBERSCENE_ACCEPT_LICENCE=strudel` accepts it), adds everything with its waveform and onset, and
writes `CREDITS.md`. Nothing fetched is committed.

## Check and render

```sh
npx uberscene examples/nature/video.tsx --check-sync     # every cut on the beat, the braam and wings on their cuts
npx uberscene examples/nature/video.tsx --quality very-high --out examples/nature/out/nature.mp4
```
