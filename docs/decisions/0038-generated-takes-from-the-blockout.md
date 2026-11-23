# 0038. Generated takes from the blockout, and a first experiment on timing

> Status: proposed. Builds on [0037](./0037-a-3d-shot-on-the-timeline.md), which made a three.js shot a staged,
> editable element of the timeline. This record decides how a generated take relates to that shot, and names the
> experiment that tells us whether the 3D blockout gives the control we want from it.

## Context

0037 gives a shot that can be scrubbed, retimed and tied to a beat. The next consumer of that shot is a video model:
the rough render goes in with a prompt and appearance references, and a take comes out. The closest published work is
Coda-DaVinci (Ji, Wang, Shi et al., arXiv 2611.26595, November 2026). What it does, as the paper states it:

- **Pipeline.** A coding agent builds a 3D proxy and renders it; the video model gets the proxy video, a prompt and
  reference media, "through the video model's reference-media interface" (Table 7). Proxies render at 24 fps and 720p,
  with Blender 5.2.1 and Cycles. All methods in the main comparison synthesize with Seedance 2.5.
- **Harness.** A persistent workspace "retains scene code, reusable assets, subject references, and scene state across
  revisions and continuation requests". The harness "displays generated frames alongside the corresponding proxy views
  to help identify the source of discrepancies. Proxy errors lead to scene revisions, while discrepancies introduced
  during synthesis guide changes to the prompt or reference inputs" (section 4.3). An independent acceptance agent
  checks each candidate against registered criteria, with at most three repair rounds.
- **Granularity.** Coarse proxies (G0) keep motion more natural; medium ones (G1) give the most consistency. The method
  uses G1 for environments and structured objects, G0 for people ("position and heading control"), and direct
  generation when "simplified proxy animation could introduce stiffness" (section 4.1). Coarse proxies won on
  naturalness on the motion-heavy benchmark because they leave "limb motion and fine details to the video generator".
- **Identity colours.** In the best prompting setup (PE2), each subject gets a stable id and a distinct colour in the
  proxy, and the prompt states which colour is which subject. With G1 fixed, PE2 beat independent prompt enhancement
  on all four metrics under both physics settings (Table 3).
- **Three.js against Blender** (section 5.3, Figure 7c). On a 33-task diagnostic subset, scored 1 to 5 by Gemini 3.8
  Flash, with GPT-6-Astra and Seedance 2.5 fixed, both engines raise the overall mean over direct generation.
  Blender scores higher on all four dimensions (physics 3.45, instruction 3.76, consistency 3.88, aesthetics and
  fluency 3.76, mean 3.71, against direct generation's 3.508) and uses about 9.1 M agent tokens per case, "roughly
  twice" Three.js. Three.js's bars carry no labels. Measured from the project page's figure, calibrated on the labelled
  Blender bars and on direct generation's values from Table 5 (fit within 0.01): physics 3.37, instruction 3.66,
  consistency 3.79, aesthetics and fluency 3.61, mean 3.61, at about 4.6 M tokens. Against direct generation (3.242,
  3.364, 3.758, 3.667, 3.508), Three.js gains most in instruction following (+0.30) and is slightly worse in
  aesthetics and fluency (-0.06); Blender gains in all four.
- **A correct proxy is not enough.** "Even with correct proxy actions or camera movements, the video may deviate if
  the model does not follow the reference" (section 5.3).

What the paper does not measure is the thing an editor needs most: whether a **moment** in the proxy lands at the
same moment in the take. It aligns proxy and generated frames "at identical timestamps" for inspection, and its
instruction-following scores cover event order, but no result reports how far an event's timing moves between proxy
and take, or how much of an edit to the proxy survives regeneration. Its comparisons are between pipelines, not
between revisions of one shot.

## Decision

### 1. The blockout is a preview on the timeline first; generation consumes it

The shot from 0037 is useful before any model runs: stage the table and the camera, scrub to the beat, and see when
the walker comes out. That is where the cheap revisions happen, and they stay in the edit file as literals.

### 2. A take is media on the timeline, beside the shot it came from

A generated take is an asset like footage, placed on a track above its shot at the same `start`, so the two can be
scrubbed together and compared at the same moment of the edit. Its manifest entry records where it came from:

- the shot's id, and a hash of the edit file and the shot module at render time;
- the proxy render's hash, fps, size and length;
- the prompt, the reference media, the model, its settings and seed, and the job id.

A take is never edited; a new attempt is a new take. The edit keeps every take it has tried, so a later look can see
which guidance produced which result.

### 3. Compare at the same moment, then decide where the fault is

The rule from the paper's harness, in the editor's terms:

| The blockout at the beat | The take at the beat | Work on |
|---|---|---|
| wrong (the walker comes out late) | anything | the scene: drag, retime, re-render |
| right | right | nothing |
| right | wrong | the guidance (prompt, references, identity colours) or another take |

This only works if the take and the blockout share a clock. The take is requested at the shot's exact length and
frame rate; a take whose length differs by more than a frame is reported, not stretched to fit, because stretching
would hide exactly the timing error we want to see.

### 4. Three.js first; Blender only on evidence

The one comparison published favours Blender on quality at twice the agent tokens, and both beat direct generation.
That is enough to start with three.js, which already runs in our preview and export (0037). Blender, physics
simulation and a second renderer wait until the experiment below shows that the renderer, not the guidance, limits
the result.

### 5. Proxies show what we want controlled, and no more

Following the paper's granularity results as a starting policy, not as a law:

- **The set and structured objects** (the table, the flat) at medium detail: correct sizes, positions and occluding
  edges, since framing and occlusion are what the blockout is for.
- **People** coarse: a proxy body with a path and a heading. The walker's path is staged; its limbs are left to the
  model, described in the prompt.
- **Identity colours**: each subject the prompt names gets one flat, distinct colour in the proxy (the walker is
  already orange), and the prompt binds colour to subject.
- **No proxy** for a shot whose value is natural body motion and whose staging does not matter.

### 6. The first experiment: does a half-second move of the reveal survive generation?

Comparing renderers would tell us little we can act on. The question 3D has to answer is control: when the editor
moves the reveal, does the take move with it?

**Setup.** The crossing shot from `examples/3d`, unchanged: 5 s, the walker comes out from behind the flat on the
`reveal` marker. Two versions of the beat: as it is, and 0.5 s earlier (12 frames at 24 fps).

**Two arms**, each run before and after the move:

- **Text arm.** Direct generation. The prompt describes the shot and says when the walker steps out ("at 2.0
  seconds", then "at 1.5 seconds"). Nothing else changes between before and after.
- **Blockout arm.** The proxy render, the same appearance references, and a prompt that binds the orange proxy to the
  walker and describes the action without stating the time. Between before and after, only the marker moves; the
  proxy is re-rendered and the prompt text is identical.

An optional third arm updates both the proxy and the timing in the prompt, which is what a person would actually do.

**Takes.** At least five takes per arm and condition (different seeds), 20 generations for the two arms. Same model,
settings, length (5 s), frame rate (24) and size (720p) throughout.

**Measure.** The reveal moment of a take is the first frame in which the walker is visible clear of the flat's edge.
In the blockout it is known exactly from the scene. In a take it is marked by two people stepping frame by frame in
the editor, without knowing the arm or condition; a disagreement of more than two frames is settled by a third.

- **Transfer**: the shift observed between a take's before and after reveal, divided by the 0.5 s asked for.
  1 means the move survived whole; 0 means the model ignored it.
- **Error at the beat**: the take's reveal minus the blockout's, in frames.
- **Spread** across takes, since a control that holds on average but scatters by half a second is not a control.
- **Side checks**, pass or fail per take: the camera slides the right way, the walker passes behind the table, the
  walker stays one person.

**Reading the result.**

- The blockout arm transfers most of the shift (say, a mean of at least 0.8 with every take within four frames of
  the beat) and the text arm does not: editable 3D gives the timing control we want, and the next work is the editor
  side (takes on the timeline, the comparison view).
- Both arms transfer well: the timing is controllable in words, and the case for 3D rests on framing and occlusion,
  which the side checks speak to.
- Neither transfers: the model does not follow the reference closely enough at this grain; try a model with stronger
  video conditioning before building more on the blockout.

## What has to exist to run it

- **The proxy render**: the shot's range exported at 24 fps and 720p. The export already renders the shot frame for
  frame (0037); this needs a size and range option, not new drawing code.
- **A video model with reference video input**, its API host allowed in the environment, and a key. Which model is
  a cost decision for the person running the experiment; the paper's results suggest the choice matters (the gain
  over direct generation ranged from +0.031 to +0.204 with one coding agent across three generators, Figure 23).
- **Takes as assets**, with the provenance in 2, and a track to put them on.
- **The marking**: frame stepping already exists in the editor; a small sheet to record each take's reveal frame.

## Alternatives set aside

- **Compare Three.js with Blender first.** The paper has made that comparison once. Our open question is whether an
  edit to the staging reaches the take, which no renderer comparison answers.
- **Score takes with a vision model only.** The paper's ablations use one, but a reveal frame is a precise judgement;
  people mark it, and a model's marks can be checked against theirs later.
- **Stretch a take to the shot's length.** It would hide the timing error the comparison exists to find.
- **An agent harness with subagents and acceptance review now.** The paper's ablation shows review helps
  consistency, but it is machinery for many tasks. One shot, measured by people, comes first.

## Consequences

- Generation stays outside the timeline's core: a take is an asset with a provenance record, and the edit file keeps
  the staging that produced it.
- The experiment needs paid generations, a model choice, and network access to its API; none of it is in the repository
  yet.
- If the blockout arm wins, the editor work that follows is specific: takes beside shots, a same-moment comparison,
  and the blockout and take as two views of one clock.

## Source

Yiyan Ji, Qixun Wang, Yang Shi et al., "Coda-DaVinci: Reimagining Video Generation with Code2Video", arXiv
2611.26595v1, 19 November 2026, https://arxiv.org/abs/2611.26595. The repository it links
(github.com/FrankYang-17/Coda) does not contain the Coda-DaVinci code yet, and is under a non-commercial academic
license, so nothing here is taken from it.
