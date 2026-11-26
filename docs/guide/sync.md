# Sync: the music against the picture

Lining the picture up with the music is half of editing: a cut on the beat feels right, and a cut 100 ms late feels
like a mistake. An editor hears that. An agent can't hear, so UberScene writes it down: every beat at the time the
video plays it, every moment of the video in one list, and how far each cut is from its nearest beat, as text or as
JSON. None of it starts a browser.

There are three things to read:

| Command | What it gives |
|---|---|
| `uberscene inspect video.tsx --json` | `music` and `beats`: the music the timeline plays and each of its beats, in seconds and frames of the finished video. |
| `uberscene inspect video.tsx --events` | Every moment in one list, in time order: beats, words, cuts, elements starting and ending, markers. |
| `uberscene video.tsx --check-sync` | Each cut and each start on screen against its nearest beat, and the ones that miss. |

## Where beats come from

`uberscene add song.mp3` listens to the music and writes its beats and tempo into `uberscene.json` (or
`--bpm 120 --first-beat 0.3` sets them as a grid). In the file, a beat is a moment like a word:
`<Clip anchor="song" at="beat:16" />` starts a shot on beat 16, and `in="beat:0"` trims the song to start on its first
beat ([Time](./time#cut-on-the-beat)).

A beat's time in `uberscene.json` is in the song's own seconds. Everything on this page is in seconds of the finished
video: the song's trim, its start and its speed are already applied.

## The music and its beats

```sh
npx uberscene inspect video.tsx
```

The timeline shows the role of each track, the tempo and the beats of each piece of music, and a `music:` line:

```
track music (free, music)
     0.00–16.00    audio       song  asset:groove 0.24–16.25  119.98 BPM  beat:0–31
…
music: song  119.98 BPM  a beat every 0.50 s  beat:0 at 0.00 s to beat:31  (beats detected)
```

With `--json` the same is data. `music` has one row for each clip or audio whose asset has beats:

```json
{ "clip": "song", "asset": "groove", "track": "music", "role": "music", "tempo": 119.98,
  "beatSeconds": 0.501, "beats": 32, "first": 0, "last": 31, "from": 0, "to": 16, "grid": "detected" }
```

| Field | Meaning |
|---|---|
| `clip` | The id of the `<Audio>` or `<Clip>` that plays it: the name to write in `anchor`. |
| `asset` | The asset in the manifest. |
| `track`, `role` | Its track, and the track's role when the file gives one (`music`, `dialogue`, `effects`…). |
| `tempo` | Beats per minute, from the manifest. |
| `beatSeconds` | Seconds from one beat to the next as the video plays them. |
| `beats`, `first`, `last` | How many of its beats play, and the first and last by their number (`beat:N`). |
| `from`, `to` | When the clip plays, in seconds of the video. |
| `grid` | Where the beats come from. `detected`: found in the sound, or set as a grid, by `uberscene add`. |

`beats` has one row for each beat that plays:

```json
{ "asset": "groove", "clip": "song", "i": 1, "time": 0.502, "frame": 15, "sourceTime": 0.747 }
```

`i` is the beat's number, `time` and `frame` are where the video plays it, and `sourceTime` is where it is in the
song's own seconds. A beat the trim leaves out is not listed. Each row of `tracks` has its `role` too.

## Every moment in one list

```sh
npx uberscene inspect video.tsx --events --in 2.9..3.6 --kinds beat,start
```

```
   3.00  f90     beat     song 6
   3.00  f90     start    l6  title  on song@beat:6
   3.10  f93     start    badge  clip  101 ms after song@beat:6
   3.50  f105    beat     song 7
```

Each line is a second, a frame, a kind, what it belongs to, and, for a cut, a start or an end while music plays, the
beat it is nearest and by how much. With `--json` it is `{ "events": [...] }`:

```json
{ "time": 3.1, "frame": 93, "kind": "start", "of": "badge", "label": "clip",
  "nearestBeat": { "clip": "song", "i": 6, "time": 2.999, "offsetMs": 101, "offsetFrames": 3 } }
```

| Kind | `of` | `i` | `label` |
|---|---|---|---|
| `beat` | The clip that plays the music. | The beat's number. | |
| `word` | The clip that says it. | The word's number. | The word. |
| `cut` | The track. | | `from→to`, the two clips. |
| `start`, `end` | The element. | | The element's kind. |
| `marker` | The marker's id. | | Its label. |
| `shot`, `silence` | The clip. | Its number. | |

`nearestBeat.offsetMs` is the moment minus the beat: positive when the moment comes after the beat, negative when it
comes before. `offsetFrames` is the same in frames. It is left out when no music plays within a beat of the moment.

| Option | |
|---|---|
| `--events` | List the events instead of the timeline. |
| `--in <stretch>` | Only a stretch: `all`, a range (`2..6`, `60f..180f`) or an element's id, for the time it is on. |
| `--kinds <kinds>` | Only these kinds, comma-separated. |
| `--json` | `{ "events": [...] }` instead of text. |

Because everything is in one list, a question about sync is a filter:

```sh
# The beats between 2 and 6 seconds
npx uberscene inspect video.tsx --events --in 2..6 --kinds beat --json | jq '.events[].time'

# What happens within 100 ms of beat 16
npx uberscene inspect video.tsx --events --json \
  | jq '.events as $e | ($e[] | select(.kind == "beat" and .i == 16).time) as $t
        | $e[] | select((.time - $t | fabs) <= 0.1)'

# Every start that is more than a frame off its beat
npx uberscene inspect video.tsx --events --kinds start --json \
  | jq '.events[] | select(.nearestBeat and (.nearestBeat.offsetFrames | fabs) > 1)'
```

## The sync check

```sh
npx uberscene video.tsx --check-sync
```

```
music: song  119.98 BPM  a beat every 0.50 s  beat:0 to beat:31  0.00–16.00 s  (beats detected)
     3.00  start  l6                        on    song@beat:6  (tied to the beat)
     3.10  start  badge                     near  song@beat:6  101 ms after it
     4.00  start  green                     on    song@beat:8  (tied to the beat)
…
video.tsx: near-beat: "badge" at 3.10 s is 101 ms after beat 6 of "song" (3.00 s): close enough to read as a miss
  fix: start it on the beat: anchor="song" at="beat:6"
37 of 38 cuts and starts on the beat, 1 just off it, 0 elsewhere; 37 tied to a beat. 1 sync issue.
```

It lists the music, then every point: each cut between two clips of a sequence, and each clip, title, shape or layer
starting on screen, while music plays. It writes no file and exits with code 3 when it finds an issue, like the
layout check.

Each point has a status:

| Status | Meaning |
|---|---|
| `on` | Within one frame of a beat. |
| `near` | Off the beat, but by less than a quarter of a beat. Nobody chooses that; it reads as a miss, and it is an issue. |
| `off` | Further from any beat. That is a choice: a cut on a word, or on the off-beat. It is listed, and it is no issue. |

`(tied to the beat)` means the file places it with `at="beat:N"`, so it follows the music when the song is trimmed or
swapped. A point that is `on` but not tied is on the beat today, by a number.

With `--json`:

```json
{
  "music": [{ "clip": "song", "tempo": 119.98, "beatSeconds": 0.501, "beats": 32, "first": 0, "last": 31, "from": 0, "to": 16, "grid": "detected" }],
  "points": [
    { "time": 3.1, "frame": 93, "kind": "start", "id": "badge",
      "beat": { "clip": "song", "i": 6, "time": 2.999, "offsetMs": 101, "offsetFrames": 3 },
      "status": "near", "anchored": false }
  ],
  "summary": { "points": 38, "on": 37, "near": 1, "off": 0, "anchored": 37, "outsideMusic": 0 },
  "issues": [
    { "rule": "near-beat", "id": "badge", "time": 3.1,
      "message": "\"badge\" at 3.10 s is 101 ms after beat 6 of \"song\" (3.00 s): close enough to read as a miss",
      "fix": "start it on the beat: anchor=\"song\" at=\"beat:6\"" }
  ]
}
```

| Field | Meaning |
|---|---|
| `points[].kind` | `cut`: a cut between two clips of a sequence, with `from`, the clip it cuts from. `start`: an element starting on screen. |
| `points[].id` | The element that starts; for a cut, the clip it cuts to. |
| `points[].beat` | The nearest beat, as `nearestBeat` above. |
| `points[].status` | `on`, `near` or `off`. |
| `points[].anchored` | The file ties it to a beat. |
| `summary.outsideMusic` | Cuts and starts while no music plays. They are not in `points`. |
| `issues[].rule` | `near-beat` or `music-cut-off`. |
| `issues[].fix` | What to write. |

### The rules

| Rule | Reported when | Fix |
|---|---|---|
| `near-beat` | A cut or a start is more than a frame from a beat, and less than a quarter of a beat. | A start: `anchor="song" at="beat:6"`. A cut in a sequence: end the clip before it on the beat, <code v-pre>duration={{ until: "song", at: "beat:6" }}</code>. |
| `music-cut-off` | Music stops more than a frame from a beat, before its own end, with no fade out of 0.2 s or more. | End it on a beat, `out="beat:28.end"`, or fade it, <code v-pre>fade={{ out: 0.5 }}</code>. |

The lint has one more, on the file's text: `numeric-on-beat` warns when a numeric `in` or `out` of the music is a
beat's own time, and names the `beat:N` to write, which stays right when the song is added again.

A video with no music that has beats gives an empty report and says so.

## What it does not tell you

- **Which beats are strong.** Every beat counts the same; the check does not know the downbeat or where the song's
  sections change. Look at the sound for that: `look --listen all`.
- **Whether detected beats are right.** Beats found in the sound can be off for music with a loose pulse. Check a
  few against the strip (`look --at song@beat:16 --listen all`), or set a grid with `--bpm` and `--first-beat`.
- **Levels.** Whether the music ducks under the voice is in `look --listen` ([Checking a cut](./checking#listen-to-it)).

## Next

- [Time](./time#cut-on-the-beat): `beat:N`, `anchor` and `at`.
- [Checking a cut](./checking): the other checks.
- [CLI reference](/reference/cli#sync-check): every option.
