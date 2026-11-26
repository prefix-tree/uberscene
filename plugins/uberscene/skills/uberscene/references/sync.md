# Sync: reading the music against the picture

You cannot hear the video. You can still know, in numbers, whether the picture is on the music. Three commands read
the timeline with no browser, as text or as JSON (`--json`). Run them after every edit to a video with music.

| Command | What you get |
|---|---|
| `npx uberscene video.tsx --check-sync` | Each cut and each start on screen against its nearest beat; the ones that miss, with the fix. Exits 3 on issues. |
| `npx uberscene inspect video.tsx --events` | Every moment in one list, in time order: beats, words, cuts, starts, ends, markers. |
| `npx uberscene inspect video.tsx --json` | `music` and `beats` rows: the music the timeline plays, and each beat at the time it plays. |

All times are seconds of the finished video (the song's trim, start and speed applied), with the frame beside them.

## The loop

1. **Add the song**: `npx uberscene add song.mp3` finds its beats and tempo and prints them
   (`song: audio, 92.4 s, 184 beats at 119.98 BPM (beat:0 to beat:183)`). For music with a click-steady tempo you
   know, set the grid: `--bpm 120 --first-beat 0.3`.
2. **Write the edit on beats, not seconds**: trim the song with `in="beat:0" out="beat:63.end"`, start every shot,
   title and sound effect with `anchor="song" at="beat:N"`, and end a clip of a sequence on a beat with
   `duration={{ until: "song", at: "beat:N" }}`.
3. **Read where the beats are** before choosing N: `npx uberscene inspect video.tsx --events --kinds beat --in 0..10`.
4. **Check**: `npx uberscene video.tsx --check-sync --json`.
5. **Fix every issue** with the `fix` it gives, and check again until `issues` is empty.
6. **Then look**: `look --at song@beat:16,song@beat:32 --listen all` draws those moments over the sound. The check
   knows the beats are where the manifest says; the strip shows whether those are the hits you can see.

## `--check-sync`

```
music: song  119.98 BPM  a beat every 0.50 s  beat:0 to beat:31  0.00–16.00 s  (beats detected)
     3.00  start  l6                        on    song@beat:6  (tied to the beat)
     3.10  start  badge                     near  song@beat:6  101 ms after it
     4.00  start  green                     on    song@beat:8  (tied to the beat)
video.tsx: near-beat: "badge" at 3.10 s is 101 ms after beat 6 of "song" (3.00 s): close enough to read as a miss
  fix: start it on the beat: anchor="song" at="beat:6"
37 of 38 cuts and starts on the beat, 1 just off it, 0 elsewhere; 37 tied to a beat. 1 sync issue.
```

`--json`:

```json
{
  "music": [{ "clip": "song", "asset": "groove", "track": "music", "role": "music", "tempo": 119.98,
              "beatSeconds": 0.501, "beats": 32, "first": 0, "last": 31, "from": 0, "to": 16, "grid": "detected" }],
  "points": [
    { "time": 3.1, "frame": 93, "kind": "start", "id": "badge",
      "beat": { "clip": "song", "i": 6, "time": 2.999, "offsetMs": 101, "offsetFrames": 3 },
      "status": "near", "anchored": false }
  ],
  "summary": { "points": 38, "on": 37, "near": 1, "off": 0, "anchored": 37, "outsideMusic": 0 },
  "issues": [
    { "rule": "near-beat", "id": "badge", "time": 3.1, "message": "…",
      "fix": "start it on the beat: anchor=\"song\" at=\"beat:6\"" }
  ]
}
```

How to read it:

- **`music`**: each clip or audio whose asset has beats. `clip` is the id to write in `anchor`. `beatSeconds` is the
  length of a beat as played; `first` and `last` are the beat numbers that play. Empty means no music with beats:
  add the song first.
- **`points`**: every cut between two clips of a sequence (`kind: "cut"`, with `from`) and every clip, title, shape,
  SVG, sticker or layer starting on screen (`kind: "start"`), while music plays. `id` is the element that starts.
- **`beat.offsetMs`**: the point minus its nearest beat. Positive: the point is late. Negative: early.
  `offsetFrames` is the same in frames.
- **`status`**:
  - `on`: within one frame of the beat. Good.
  - `near`: off the beat by less than a quarter of a beat. It reads as a mistake. Always an issue; fix it.
  - `off`: further from any beat. A choice, not an issue: a cut on a word, on the off-beat, in a quiet passage.
    Keep it only if you can say why it is there.
- **`anchored`**: the file ties the point to a beat (`at="beat:N"`). An `on` point that is not anchored is on the
  beat by a number, and drifts when the song is trimmed or swapped: tie it.
- **`summary.outsideMusic`**: cuts and starts while no music plays; not in `points`.

The two rules:

| Rule | Means | Fix |
|---|---|---|
| `near-beat` | A cut or start more than a frame from a beat and under a quarter beat away. | A start: `anchor="song" at="beat:N"`. A cut in a sequence: on the clip before it, `duration={{ until: "song", at: "beat:N" }}`. |
| `music-cut-off` | Music stops between beats, before its own end, with no fade out of 0.2 s or more. | `out="beat:N.end"`, or `fade={{ out: 0.5 }}`. |

`lint` adds `numeric-on-beat`: a numeric `in` or `out` of the music that is a beat's own time; write the `beat:N` it
names.

## `inspect --events`

```sh
npx uberscene inspect video.tsx --events --in 2.9..3.6 --kinds beat,start
```

```
   3.00  f90     beat     song 6
   3.00  f90     start    l6  title  on song@beat:6
   3.10  f93     start    badge  clip  101 ms after song@beat:6
   3.50  f105    beat     song 7
```

`--json` gives `{ "events": [...] }`, each
`{ time, frame, kind, of, i?, label?, nearestBeat? }`:

| `kind` | `of` | `i` | `label` |
|---|---|---|---|
| `beat` | the clip playing the music | beat number | |
| `word` | the clip saying it | word number | the word |
| `cut` | the track | | `from→to` |
| `start`, `end` | the element | | its kind |
| `marker` | the marker's id | | its label |
| `shot`, `silence` | the clip | its number | |

`nearestBeat` (`{ clip, i, time, offsetMs, offsetFrames }`) is on cuts, starts and ends while music plays.
`--in` takes `all`, a range (`2..6`, `60f..180f`) or an element's id. `--kinds` takes a comma-separated list.

Use it to answer a question with a filter:

```sh
# Where are the beats in the chorus clip?
npx uberscene inspect video.tsx --events --in chorus --kinds beat --json | jq '.events[] | {i, time}'
# What lands within 100 ms of beat 16?
npx uberscene inspect video.tsx --events --json \
  | jq '.events as $e | ($e[] | select(.kind == "beat" and .i == 16).time) as $t | $e[] | select((.time - $t | fabs) <= 0.1)'
# Which words start on a beat, to put a title punch there? Read words and beats side by side:
npx uberscene inspect video.tsx --events --kinds beat,word --in 4..8
```

## `inspect --json`: `music` and `beats`

`music` rows are as above. `beats` has one row per beat that plays:
`{ "asset": "groove", "clip": "song", "i": 1, "time": 0.502, "frame": 15, "sourceTime": 0.747 }`. `time` and `frame`
are in the video; `sourceTime` is in the song. `tracks[].role` says which track is music, dialogue or effects.

`song@beat:16` is a moment anywhere moments are taken: `inspect --at song@beat:16`, `look --at song@beat:16`.

## What the numbers don't say

- Every beat counts the same. The check does not know the downbeat, the bar or where the song's sections change:
  put the biggest change on the drop by looking at `look --listen all`, where the level jumps.
- Detected beats can be wrong for music with a loose pulse, and a fast song can come out at half tempo. If
  `beatSeconds` is not `60 / tempo` you expect, or the strip's hits are off the beats, add the song again with
  `--bpm` and `--first-beat`.
- Levels (the music ducking under the voice, loudness) are in `look --listen` ([sound.md](sound.md)).

## In the report

Say the numbers, and that they were measured, not heard: "38 cuts and starts, all on the beat and tied to it
(`--check-sync`, 0 issues); 2 off-beat on purpose: the title on word 14, the logo in the gap after the last beat."
