# Sound: half of what the viewer feels

Read this before you add music, a voice or sound effects, and before you hand over any video longer than about 15
seconds. A silent film feels unfinished. Give one sound unless the person said it plays muted (a feed that autoplays
without sound still gets captions and a sound).

## What sets the clock

One thing decides where every cut lands. Pick it first:

- **A voice** (an interview, a voice-over): cut on its words (`in="word:12"`), anchor titles to them
  (`anchor="talk" at="word:14"`), time a script with `narrate`. The music sits under it.
- **Music** with no voice: the music is the clock. `uberscene add song.mp3` finds its beats and tempo (or
  `--bpm 120 --first-beat 0.3` sets them), and every cut, punch, title and sound effect anchors to one:
  `anchor="song" at="beat:16"`. Nothing is timed by hand, so picture and music can't drift, and they stay together
  when the song is trimmed. Give each shot its beats (`60 / tempo` seconds each) plus 0.1 s, in order on one track, so
  the next covers it and no frame is empty at a cut. Then measure it: `npx uberscene video.tsx --check-sync` lists
  every cut and start against its nearest beat and names each one that misses, with no browser
  ([sync.md](sync.md)); and check the beats against the sound with
  `look --at song@beat:16,song@beat:32 --listen all`. Sections of the song are sections of the film: a new part
  of the song, a new part of the story.
- **Neither**: the picture sets the pace, and the music only keeps it moving. Let a cut land on a strong beat where you
  can.

Never stretch or squeeze a voice to fit a slot: change the picture.

## Layers

| Layer | Track | Volume | Notes |
|---|---|---|---|
| Voice | the first track, `role="dialogue"` | 1 | the loudest thing; nothing covers a word |
| Music | a free track, `role="music"` | 0.6-0.8 alone, `duck={{ under: "dialogue", to: 0.15 }}` under a voice | `duration="fill"`, `fade={{ in: 0.5, out: 1.5 }}` |
| Effects | a free track, `role="effects"` | 0.4-0.8 | on visible actions only |
| Ambience | a free track, `role="ambience"` | 0.1-0.3 | room tone, a city, under a quiet stretch |

The props of `<Audio>` that set a layer's level:

<!-- sync: props Audio volume fade duck -->
| prop | type | default | what it is |
|---|---|---|---|
| `volume` | number (0..4) \| { at, value, easing }[] \| { link, scale, offset, delay } |  | A gain: 1 plays the source as it is, 0 mutes it, 2 is twice as loud; keys change it over time, or a link sets it. |
| `fade` | { in, out } |  | Seconds the sound fades in at the start and out at the end. |
| `duck` | { under, to, attack, release } |  | Turns this sound down while another plays: `under` is a track id or a track role (`dialogue`), `to` the volume it falls to, `attack` and `release` the seconds it takes to fall and recover. |
<!-- /sync -->

- **Duck by role, not by hand**: `duck={{ under: "dialogue", to: 0.15, attack: 0.2, release: 0.6 }}` follows every
  edit of the voice. Keys on `volume` are for a moment the music must swell or drop.
- **End the music on its end**, or fade it over 1 to 2 s on the last frame. Music cut off mid-phrase is the most heard
  mistake.
- **Start with the picture.** Music that starts a second before the first frame (or after it) feels wrong. A riser or
  a hit can lead a cut by 2 to 4 frames.

## Effects on actions

Sound tells the eye something happened. Put a short effect on things that move and land, not on everything:

| On screen | Sound |
|---|---|
| A tap, a click, a toggle | a click, 30-60 ms |
| A card pops in, a check appears | a soft pop |
| A whip, a push, a fast slide | a whoosh or a swish, starting 2-3 frames before the move |
| A reveal, the payoff | a hit or a chime, on the frame it lands |
| Build-up before a reveal | a riser that ends on the reveal |

Anchor each to what it belongs to, one frame after the picture: `anchor="pop-card" offset={0.033}` at 30 fps. The eye
sees the impact, the ear confirms it; a sound before its picture feels early. At most one effect at a
time, and not on every element of a stagger: on the first and the last, or on none.

## Levels

Measure, don't guess. `look --listen all` prints the mix's `lufs` (integrated loudness) and `truePeakDb`:

| | Target |
|---|---|
| Loudness, for the web and social | -14 LUFS (-16 is fine for a site) |
| True peak | at most -2 dBTP: AAC encoding raises peaks, so leave room |
| Voice over music | the voice clearly on top: the music ducked to about 0.15 of its level under it |
| A mono file | measures about 3 LU louder once it plays on two channels: measure the mix, not the file |
| An effect over the bed | a few dB above it, never louder than the voice |

If the mix is too quiet, raise the voice and music `volume` together; if the peak is over, lower the loudest element.
Then measure again, and once more on the rendered file, since that is what gets uploaded:
`ffmpeg -i video.mp4 -af ebur128=peak=true -f null -` prints its integrated loudness and true peak. Say in your report that the levels were measured, not heard: you can't hear the result.

## Check it

- `npx uberscene look video.tsx --at 1,4,8,12 --listen all --out sound.png`: the level over time, the words where
  they're said, silences shaded. A silence you didn't mean is a gap in the music or a dropped clip.
- `--listen <id>` for one element's stretch: does the effect land on the move?
- `inspect --at <moment>` says what is heard at that moment and at what volume.

Where the music comes from: only files the person gave you, or ones they have the rights to. Name the source and its
licence in your report.
