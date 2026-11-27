# 0042. Music as code: a Strudel score is an audio source

> Status: proposed. Decides [#249](https://github.com/prefix-tree/uberscene/issues/249); the element, the moments and
> the hook are built in [#252](https://github.com/prefix-tree/uberscene/issues/252). Follows
> [0040](./0040-a-3d-scene-is-a-clip-source.md): a score plays through `<Audio>` the way a scene plays through
> `<Clip>`. Fetches its engine at run time the way [0039](./0039-a-person-cut-out-of-the-background.md) fetches its
> models. Its moments are the first analysis in the manifest that seam 1 of
> [0041](./0041-motion-design-seams.md) describes and that comes from code, not from detection.

## Context

A film written as code gets its music from outside the code. The example films bake a bed with a script
(`examples/showcase/music.ts`, `examples/founding/media/bed.ts`), add the WAV, and `uberscene add` *detects* its beats
again. The generator knows its own grid exactly, but what it knows is thrown away. Founding's bed pulses at 96 BPM
from 20 s, yet its detected `beat:0` lands at 1.13 s. Changing a bar means running a script and adding the file again.

[Strudel](https://codeberg.org/uzu/strudel) writes music as patterns in a few lines of JavaScript:
`stack(s("bd*4"), note("<c2 g1>").s("sawtooth"))`. A pattern is a pure function from a span of cycles to the events
in it (`pattern.queryArc(from, to)`). With a tempo in cycles per second, every event has a time in seconds, the same
on every call. That is the shape the timeline already wants: a frame is a function of its time (0040, point 4), and
music can be one too.

Two questions had to be answered first: what Strudel's licence allows, and whether its sound can be rendered offline,
exactly on its own times, in the export's Chrome.

## Decision

### The licence

Strudel's packages (`@strudel/core`, `@strudel/mini`, `@strudel/transpiler`, `@strudel/webaudio`, `superdough`) are
AGPL-3.0-or-later. UberScene is MIT.

1. **Running Strudel carries no obligation.** The AGPL's conditions apply when the program is *conveyed* (a copy
   handed to someone), or, under its §13, when a *modified* copy is run for people over a network. Rendering a film on
   one's own machine is neither.
2. **The music it makes is the author's.** A program's licence does not reach its output unless the output contains
   the program. A rendered WAV is not Strudel. Samples are another matter: each keeps its own licence (see Evidence).
   Synth voices (oscillators, noise) are clean.
3. **No UberScene package depends on Strudel or ships it.** Shipping it inside `@uberscene/kit`, the player or the
   render package would convey a combined work, which arguably must then be AGPL as a whole. Instead the render
   package fetches pinned versions on first use, checked by SHA-256, into `~/.cache/uberscene/strudel/<version>`, after
   saying what they are and under which licence (`--accept-licence` for runs with no one to ask). It then bundles them
   there into one page script. This is the shape `uberscene matte` uses for its models. The combination only exists on
   the user's machine, and no one conveys it.
4. **The adapter is one thin file.** The code that calls Strudel (evaluate a pattern, query it, render it) is a page
   script of about fifty lines, kept apart from the rest of the render package. The FSF holds that code written to
   call a GPL program can itself be covered. That view is disputed for a narrow call into a public API, and keeping
   the adapter thin and separate keeps the risk where it is small.
5. **A hosted editor conveys Strudel, so it follows three rules.** Serving Strudel's JavaScript to people's browsers
   (a web editor, Cutleap) hands them a copy. Such a host:
   - links Strudel's source at the exact version it serves;
   - loads Strudel as its own script, never compiled into the host's bundle;
   - serves it unmodified. A fix goes upstream, since §13 binds only modified versions.
6. **Sounds are synth voices by default.** Sample banks are fetched only when a score names them. A bank with a
   licence that asks for credit (CC BY, CC BY-SA) adds its credit to the export's report. A bank with no licence
   (Dirt-Samples, tidal-drum-machines) is refused unless asked for by name, with a warning that the film may not be
   published with it.

### The score

1. **A score is a value.** `strudel({ cps, beats, sections })` lives in kit and holds data only: the code of each
   section, the tempo in cycles per second, and the beats in a cycle. It imports nothing from Strudel. Its identity is a
   hash of that data and the engine's version.
   ```tsx
   const score = strudel({
     cps: 0.5, // a cycle is a bar: 4 beats at 120 BPM
     beats: 4,
     sections: {
       intro: `s("white*8").decay(.04).sustain(0).gain(.25)`,
       drop: `stack(note("c1*4").s("sine").decay(.18).sustain(0), note("<c2 g1>").s("sawtooth").lpf(600))`,
     },
   });
   ```
2. **`<Audio>` plays it.** `src={score}` takes a score as `<Clip>` takes a scene. The track's role, `volume`, `fade`,
   `duck`, `duration="fill"`, trims and the mixer apply unchanged:
   ```tsx
   <Track id="music" role="music">
     <Audio id="bed" src={score} duration="fill" times={{ drop: "marker:reveal" }}
            duck={{ under: "dialogue", to: 0.3 }} fade={{ out: 1 }} />
   </Track>
   ```
3. **Music to timeline: the score's moments are time references.** They are computed from the pattern, never
   detected:
   - `beat:N` and `bar:N` come from `cps` and `beats`;
   - `section:NAME` is where a section starts;
   - `hit:VOICE.N` is the Nth onset of a named voice.

   Elements place themselves on them as they do on a song today: `<Clip anchor="bed" at="bar:8">`, or
   `duration={{ until: "bed", at: "hit:kick.12" }}`. The resolver stays synchronous. `loadVideo`, which is already
   async, prepares each score once: it evaluates the pattern, queries it over the film's length, and writes the moments
   into a made-up asset entry `score:<id>#<hash>`, with `beats`, `bars`, `sections` and `hits`. That is the entry shape
   `resolveTimeRef` already reads, so `beat:N` on a score needs no new code. Evaluating a pattern needs only Strudel's
   pattern packages, which run in Node, and not its sound engine.
4. **Timeline to music: sections land on the edit's moments.** `times` maps a section to a moment of the video, as on
   a scene clip. `times={{ drop: "marker:reveal" }}` starts the drop on the bar line nearest the marker, and the
   section before it loops until then. Moving the marker re-arranges the music. This is the same mapping `placeScene`
   does, and like a scene, a moved marker gives the asset a new name.
5. **Pictures from music: a hook.** In a `<Layer>`, `useScore("bed")` gives the frame's place in the score:
   - `beat`, `bar` and `phase` (0 to 1 within the beat);
   - `section`;
   - `hit("kick")`, the seconds since that voice last sounded, to drive a pulse.

   It reads the prepared moments through the player's layer context, so a frame's answer depends on its time alone,
   in the preview and the export alike. It is a hook because it needs the layer's clock. The score's moments come
   from context, not from props passed by hand.
6. **One renderer for preview and export.** An `audioSource` slot in kit, a sibling of the `sceneSource` slot, gives
   the audio plan sound for a `score:` asset, which the plan stops dropping. The renderer evaluates the pattern and
   plays each event through superdough into an `OfflineAudioContext`. It uses one page per render, and seeds
   `Math.random` from the score's hash.
   - The export renders the whole score once, into `.uberscene/cache/score-<hash>.wav`, and mixes it like any file,
     native mixer included.
   - The preview renders the same way, in the audio plan's 30-second chunks, ahead of the playhead. It does not
     schedule live, so the preview is the export.

## Alternatives set aside

- **Our own pattern language and synth.** It would be clean under MIT, but it would mean building a language and a
  sound engine that already exist, and patterns written in Strudel could not be pasted in. The score interface (a
  value with moments and a renderer behind a slot) leaves room for a second engine later.
- **Strudel as a dependency of the render package.** That is the shortest path, but it would convey a combined work
  with every install.
- **Live scheduling in the preview, as Strudel's own REPL does.** The preview would drift from the export by the
  scheduler's lookahead and by dropped events under load, and a scrub would replay a different sound. Offline chunks
  render fast enough (see Evidence).
- **Render, then detect beats from the WAV.** That is what the examples do today. It throws the pattern's exact times
  away and gets them back with detection error.
- **Bake the score in a script, as the examples do.** It is a second step to forget, and the moments live outside the
  film.

## Consequences

- A film's score is a few lines in its file, and its moments are as exact as its frames.
- The first render of a score fetches Strudel, 4.5 MB installed from npm and 0.8 MB once bundled, and any sample bank it names. Later renders read
  the cache.
- Every export runs Chrome already, so music adds no new browser.
- A score is not bit-identical across runs: synth voices differ by about 6e-8 (-144 dBFS), from the AudioWorklet's
  floating point. The frame cache ignores audio, and the WAV cache is keyed by the score's hash, so this never shows.
- Strudel's API is not ours. A new Strudel version is pinned on purpose and checked by the spike's measures.

## Evidence

**The spike, `packages/render/scripts/strudel-spike.ts`.** It installs pinned `@strudel/core` 1.2.6, `@strudel/mini`
1.2.6, `@strudel/transpiler` 1.2.6 and `superdough` 1.3.0 into the cache, bundles them with the repository's Vite, and
renders in Chrome for Testing 157 from `127.0.0.1`. It renders an 8 s score of two sections (hats alone, then kick,
bass and hats), written with `arrange`:

- **Speed:** 8 s rendered in 2.6 s on a 4-core machine, 42 events.
- **Timing:** with the kick alone, the first sample of each of 8 kicks is 0.146 ms after the pattern's time, every
  time. That is seven samples of superdough's attack ramp to -60 dBFS.
- **Repeatability:** the same score rendered twice differs by at most 5.96e-8 (-144 dBFS). Without a seeded
  `Math.random`, noise voices differ completely from run to run.

**What the spike found that the design depends on:**

- AudioWorklets need a secure origin. The page must be served from `127.0.0.1` or `localhost`, not from a made-up
  host.
- superdough keeps module-wide state (its controller and node caches) tied to the first `AudioContext` it plays on.
  `setSuperdoughAudioController(null)` is not enough, so the renderer uses one page per render.
- A pattern written as code needs `@strudel/transpiler`, which turns `"…"` into mini-notation. Calling functions
  directly needs no transpiler.
- `queryArc` runs in Node from the bundled packages, so the moments can be prepared without Chrome.
- A CC0 sample bank, VCSL's `bassdrum1`, loads over the network and renders offline (275 KiB in 149 ms).

**The sample banks Strudel's REPL loads by default** (`@strudel/repl`, and `felixroos/dough-samples`'s README):

| Bank | Licence |
|---|---|
| synth voices (sine, square, triangle, sawtooth, noise, supersaw…) | none needed: no samples |
| VCSL | CC0 |
| uzu-drumkit | Unlicense (public domain) |
| piano (Salamander Grand Piano) | CC BY 3.0, Alexander Holm: credit needed |
| mridangam | CC BY-SA 4.0, Arthur Carabott: credit, share-alike |
| Dirt-Samples | no licence stated: all rights reserved |
| tidal-drum-machines | no licence stated |
| EmuSP12 | not found |

strudel.cc and Codeberg could not be reached from the machine the spike ran on, so this list is read from the
published packages and the sample repositories, not from Strudel's documentation.
