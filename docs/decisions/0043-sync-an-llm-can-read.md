# 0043. Sync an LLM can read: beats, events and a sync report, as JSON

> Status: accepted, built in steps. This record's three parts are built: beats and roles in `inspect`, the events
> list, and `--check-sync` ([the guide](../guide/sync.md)). Builds on [0041](./0041-motion-design-seams.md), seam 1
> (analyses in the manifest are read through the timeline), and is what [0042](./0042-music-as-code.md)'s scores plug
> their exact moments into.

## Context

Putting the picture on the music is core editing work, and the editor here is often a model that cannot hear. Before
this, it could not read the sync either:

- `inspect --json` had element times, words and cuts, but no beats, no tempo, and no track role, although the
  resolver knew each track's role and the manifest held every beat.
- Nothing set cuts beside beats. The skill told agents to check beats by looking at a picture of the waveform.
- The only sound numbers came from `look --listen`, which needs a browser and totals the whole mix.

An agent that cannot see whether a cut is on the beat cannot write one on purpose, or notice one that slipped.

## Decision

**The sync is data on the resolved timeline, in the video's own seconds and frames, printed as text and as JSON. No
browser, no media, no new file format.**

1. **Beats are rows, like words.** `timelineBeats(state)` maps each beat of each asset through the clip that plays it
   (the same mapping `spokenWords` uses), so the trim, the start and the speed are applied. `timelineRows` gains
   `beats` (`asset`, `clip`, `i`, `time`, `frame`, `sourceTime`), `music` (one row for each clip whose asset has
   beats: tempo, the length of a beat as played, the beats it plays, where they come from) and each track's `role`.
2. **Every moment is one list.** `timelineEvents(state, { from, to, kinds })` returns beats, words, cuts, elements
   starting and ending, markers, shots and silences as rows of one shape (`time`, `frame`, `kind`, `of`, `i`,
   `label`), in time order. A cut, a start or an end carries `nearestBeat` with its offset in milliseconds and frames.
   A question about sync becomes a filter over one array. On the command line: `inspect --events --in --kinds`.
3. **The sync report works the differences out.** `syncReport(state)` lists each cut of a sequence and each element
   starting on screen while music plays, with its nearest beat and a status:
   - `on`: within a frame of the beat;
   - `near`: off it by less than a quarter of a beat, which nobody chooses, so it is an issue (`near-beat`) with the
     `beat:N` to tie it to;
   - `off`: further, which is a choice (a cut on a word, on the off-beat) and is listed but not an issue.

   `anchored` says whether the file ties the point to a beat. Music that stops between beats with no fade is
   `music-cut-off`. On the command line: `--check-sync`, which exits 3 on issues like the layout check.
4. **JSON is the only data format.** Rows of plain objects, which `jq`, a short script and a model's context all take
   as they are. Arrays for NumPy (`.npy`) were considered and set aside: nothing here is big enough to need them,
   and a second format is a second thing to document and keep right.
5. **The capability is documented where an agent reads.** A guide page ([Sync](../guide/sync.md)) explains every
   field; the skill has a reference of its own (`sync.md`) with the loop, the JSON, how to read each number and what to
   say in the report; `SKILL.md` names the commands in "Read it back" and in "Done". A check an agent does not know
   about is a check that does not run.

## Alternatives set aside

- **A picture of the sync** (beats drawn on the `look --listen` strip). Useful, and still to do, but a model reads
  numbers more surely than tick marks, and a picture needs a browser.
- **Flag every cut that is off a beat.** Most cuts in a film with a voice are on words. Flagging them all would teach
  agents to ignore the check; flagging only near misses keeps every issue true.
- **Put the check in `lint`.** Lint reads the file's text; where a clip lands depends on the resolved timeline. The
  one rule that needs only the text (`numeric-on-beat`, a numeric trim that is a beat's time) is in lint.

## Consequences

- An agent can cut to music and verify it in two commands, with no browser.
- Every beat counts the same: there is no downbeat, bar or section until beats carry them (detected with a strength,
  or exact from a 0042 score, whose `bar`, `section` and `hit` moments join the same rows with `grid: "score"`).
- The report trusts the manifest's beats. Detected beats that are wrong give a wrong report; the guide says how to
  check them against the sound.
- Levels by role over time (is the music under the voice?) are not in the report yet.

## Evidence

On `examples/showcase/beats.tsx`, a film written wholly on `beat:N`: 38 cuts and starts, 38 on the beat, 38 tied to
it, 0 issues. Moving one shot to `start={3.1}` gives `near-beat`, 101 ms after beat 6, with the fix
`anchor="song" at="beat:6"`; ending the song at `out={15.2}` with no fade gives `music-cut-off` with
`out="beat:28.end"`.
