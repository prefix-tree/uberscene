# Nature, every sound laid by hand

Sixteen seconds of nature, 1080x880, cut to 120 BPM, with every sound placed in code: the film the
[sound-breakdown post](../tiktok/breakdown.tsx) shows above its own timeline (`pnpm --filter @uberscene/example-tiktok
render nature`, with `POSTS=breakdown` for that post alone).

| Beats (s) | Picture | Sound |
|---|---|---|
| 0–1 (0–0.5) | a skier, full frame | the skier passing by |
| 1–6 (0.5–3) | six tall strips slide in, one every half beat: skiers, a snow ridge, a waterfall, surf, grass | a whoosh on each (`align="onset"`), each strip's own sound a quarter second early, one more layer every half beat |
| 6–8 (3–4) | the collage closes into a thin band, then black | a riser; a step in the snow on the black |
| 8–12 (4–6) | "moving sounds from", then THE WILD in red, its letters settling one a tick | a low D, a tick per letter, a stab as it settles |
| 12–20 (6–10) | footage in a band behind the title, a cut every beat, the band widening | each shot's sound; the kick and bass come back |
| 20–32 (10–16) | the band opens to full frame on the drop, a cut every two beats, ending on the fire pit | the full score; the skier's spray, thunder, the stork's wings, the fire's crackle |

The music (`score.ts`, Strudel) is dark synth-pop techno in D minor: four on the floor, a sixteenth bass on the root
and its octave, a minor pad and stabs, following the film's shape. It is mastered to -16 LUFS so the recorded sounds
stay on top of it. The matte that closes and opens the band is two black `Shape`s whose heights are keyed.

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
npx uberscene examples/nature/video.tsx --check-sync     # every cut on the beat, the spray and wings on their cuts
npx uberscene examples/nature/video.tsx --quality very-high --out examples/nature/out/nature.mp4
```
