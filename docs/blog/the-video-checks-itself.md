---
title: "The video checks itself: layout, read time and sync"
description: What shipped in UberScene's checks this month. Titles that overlap, don't fit or vanish too fast, cuts that miss the beat, and stretches where nothing moves, each reported like a compiler error with the fix.
sidebar: false
outline: [2, 2]
---

# The video checks itself: layout, read time and sync

<p class="blog-meta">November 27, 2026 · DAN</p>

An agent can't watch a video. It can read one. This month the checks learned to catch the mistakes a person sees on
the first watch, and each one now answers like a compiler: the line in the file, the moment it happens, and the
smallest fix. None of them asks anyone to scrub.

Here's what shipped.

## Titles that collide or don't fit

`--check-layout` already caught anything that left the frame, left a platform's safe zone, or covered the captions or
the speaker's face. It now reads the text itself
([#206](https://github.com/prefix-tree/uberscene/pull/206)).

- **`text-over-text`**: one title's ink over another's. A descender in the line below, a highlight box over the line
  above.
- **`text-fit`**: a title's text spills out of its box, or wraps in a box the file gave a width.

```text
video.tsx:235:11: text-fit: title "hook-2" does not fit its box: its text is 1069 px wide, the box is 1040 px wide, from 0.50 s to 1.00 s.
  fix: make box.width 1069, or style.size 321 or less

video.tsx:417:11: text-over-text: title "craft-2" covers title "craft-1" from 16.02 s to 17.52 s.
  fix: move it down 6 px (box.y 250, a narrower box.width, or a smaller style.size), or start it after "craft-1" ends
```

A title that types in is checked from its first frame, on its whole text, not when the last letter lands.

## Titles gone before anyone reads them

**`read-time`** flags a title on screen for less than 0.5 s plus 0.3 s a word
([#203](https://github.com/prefix-tree/uberscene/pull/203)). It works from the timeline, not from frames, so it costs
nothing to run after every edit.

```text
video.tsx:7:54: read-time: "flash" is on screen 0.40 s; 3 words need 1.40 s to be read
  7 |         <Title id="flash" anchor="talk" at="word:11" duration={0.4}>SOMEONE SAT DOWN</Title>
    |                                                      ^
  fix: hold it 1.40 s or more (duration), or cut words
```

Our own interview edit was the first to fail it: fast kinetic type that looked great and couldn't be read.
[The fix](https://github.com/prefix-tree/uberscene/pull/208) was longer holds, not fewer titles.

## Cut on the beat, and check it

Music has beats the way speech has words. `uberscene add song.mp3` finds them, and `beat:N` names one, so the music
becomes the clock ([#191](https://github.com/prefix-tree/uberscene/pull/191)):

```tsx
<Track id="music" layout="free">
  <Audio id="song" src="asset:song" start={0} in="beat:0" out="beat:63.end" fade={{ out: 1 }} />
</Track>
<Track id="shots" layout="free">
  <Clip id="s1" src="asset:pour" anchor="song" at="beat:0" in={2} duration={2.1} fit="cover" />
  <Clip id="s2" src="asset:steam" anchor="song" at="beat:4" in={0.5} duration={2.1} fit="cover" />
  <Title id="drop" anchor="song" at="beat:32" duration={1.5}>Now.</Title>
</Track>
```

Trim or move the song and every shot stays on its beat. A length can end on one too:
<code v-pre>duration={{ until: "song", at: "beat:16" }}</code> ([#214](https://github.com/prefix-tree/uberscene/pull/214)), the same
way it ends on a word.

<video src="/showcase/beats.webm" poster="/showcase/beats.jpg" controls muted playsinline style="width:100%;border-radius:8px"></video>

An editor hears a cut 100 ms late. An agent can't hear, so we wrote it down
([#258](https://github.com/prefix-tree/uberscene/pull/258)). `--check-sync` prints every cut and every start against
its nearest beat, with no browser:

```text
music: song  119.98 BPM  a beat every 0.50 s  beat:0 to beat:31  0.00–16.00 s  (beats detected)
     3.00  start  l6                        on    song@beat:6  (tied to the beat)
     3.10  start  badge                     near  song@beat:6  101 ms after it
video.tsx: near-beat: "badge" at 3.10 s is 101 ms after beat 6 of "song" (3.00 s): close enough to read as a miss
  fix: start it on the beat: anchor="song" at="beat:6"
37 of 38 cuts and starts on the beat, 1 just off it, 0 elsewhere; 37 tied to a beat. 1 sync issue.
```

`inspect --events` puts every beat, word, cut, start and marker in one list, as text or JSON. A question about sync
becomes a filter: "every start more than a frame off its beat" is one `jq` line.
[Sync](/guide/sync) has the details.

## Nothing moves

A contact sheet can't show a frozen video, because a still of a frozen scene looks fine. **`--check-motion`** draws small
frames at an even step, compares each with the next, and reports every stretch where nothing on screen changes
([#191](https://github.com/prefix-tree/uberscene/pull/191)):

```sh
npx uberscene video.tsx --check-motion
# still 2.00-4.00 s (2.0 s): nothing on screen moves; on screen: sq, hold
```

A hold you meant is fine. Anything else gets a move or gets shorter.

## Why this matters

Every check here is one more thing a model never has to be told twice. The loop is the point: the model edits, the
checks name what's wrong and how to fix it, the model fixes it, and a person reviews a diff. All of it ships in the
same CLI, and every check exits non-zero on a problem, so a script or CI can stop on it.

Next post: [animation and camera on the same timeline](./animation-and-camera).

[Checking a cut](/guide/checking) · [Sync](/guide/sync) · [Code on GitHub](https://github.com/prefix-tree/uberscene)
