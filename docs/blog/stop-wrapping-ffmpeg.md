---
title: Stop wrapping FFmpeg. Make the video a file.
description: Where UberScene is going and why. Not another MCP server over FFmpeg, but the whole studio as code a model can compile, check and test.
sidebar: false
outline: [2, 2]
---

# Stop wrapping FFmpeg. Make the video a file.

<p class="blog-meta">November 27, 2026 · DAN, founder</p>

Every week I see the same post. "We built an AI video editor." I open it, and it's an MCP server on top of FFmpeg. Or an
FFmpeg wrapper with a chat box. Or a thread that says Claude Code just killed Premiere, because Claude Code can type
`ffmpeg -ss 72 -t 8 -i talk.mp4 clip.mp4`. Or a "video editing skill": a markdown file of FFmpeg recipes that everyone
forks, tweaks and shares.

I've seen this before. When coding agents arrived, developers did the same thing. We collected prompts, traded skills,
wrapped tools. It was the spark, and it faded. Nobody ships software by trading prompt files. Coding agents became real
when they worked on the codebase itself, with a compiler, tests and git around them.

Video is stuck at the spark. This post says where we're taking UberScene instead, and why.

## An editor behind MCP is Cursor as a VS Code plugin

Picture Cursor built as an MCP server for VS Code. The agent calls `open_file`, `move_cursor`, `select_range`,
`type_text`, one tool call at a time, steering an editor designed for a human hand. Nobody built it that way. Coding
agents won because they skip the editor and change what the editor shows: the file.

An editor behind MCP hands the agent the mouse and asks it to click faster.

The best argument for MCP is reuse: decades of editor features, available today. Features aren't the bottleneck. The
bottleneck is that the agent has nothing it can read, diff and verify. A thousand tools around a black box are still a
black box.

## FFmpeg is an encoder, not a source of truth

FFmpeg is superb at what it does. It's the wrong thing to hold an edit.

A filter graph is write-only. The model can't read yesterday's command and know what the video looks like. It can't
change one title without rebuilding the chain. It can't check that a cut landed on a word and not halfway through one.
Every edit is a fresh guess, and every guess is a full re-encode.

A shared skill doesn't fix that. It makes the guesses more consistent.

## Where we're going: the whole studio as compilable code

Our mission fits in one line: **we're turning editing, animation and compositing into code, so AI can drive them
natively.**

Remotion and HyperFrames point the right way: video from code. They render. They don't edit. They cover one piece of the
pipeline, and professional video needs the whole studio on one timeline:

1. **Professional editing.** Tracks, trims, slips, slides and ripples, transitions, speed ramps, multicam, sound under
   the picture. What editors do in Premiere or Resolve every day.
2. **Animation on the same timeline.** Titles, shapes and motion graphics drawn next to the footage and tied to the same
   words and beats. Not rendered somewhere else and dropped in as a flat clip.
3. **Camera, compositing and effects.** A camera that moves over the scene in 2D and 3D, people cut out of their
   background, grades, keys, effects stacked on top, three.js scenes that play like footage.

Having all three isn't the point. The point is that together they compile. One TSX file holds the edit, the animation
and the composite, and there is no project document beside it. The agent edits the text. A person edits on a timeline.
Both write to the same file, with undo.

## Why it has to compile

Once the video compiles, it gets what made coding agents work. Three layers, each one catching what the last one can't.

**Types and the compiler** reject a broken edit before a single frame renders. Every element is a fixed tag with a
schema. A contrast of 1.2 when the maximum is 1, a transition with no clip after it, a cut that names a word the
transcript doesn't have: these fail at the file, not in the export an hour later.

**Procedural checks** verify what the model did, and say how to fix it. A cut that lands inside a word gets named, with
the `word:N` reference to use instead. An `in` two frames before a shot change gets named, with the `shot:N` edge to cut
on, because otherwise the next shot flashes. A title that leaves the frame, crosses the safe zone, or sits on top of the
captions or the speaker's face gets named, with how far off it is. This is where the checks keep growing: a shot that
drifts 100 ms off the beat, a title that vanishes before anyone can read it, two titles that collide. Each new check is
one more thing a model never has to be told twice.

**Tests on top**, like any codebase. The frame at 3.2 s is the same pixels whether you played to it, scrubbed back to
it, or exported it. A seek that differs from playback is a bug with a failing test, not a vibe.

That's the loop. The model edits, the checks say what's wrong, the model fixes it, a person reviews a diff. Without that
loop, an agent editing video is guessing faster.

A small example. Ask the agent to "change the red cup to green." It doesn't open a colour panel. It adds one line:

```tsx
effects={[{ type: "recolor", from: "#c3292a", to: "#2f9e4f" }]}
```

The change is a diff. It gets reviewed like code, and it renders the same every time. [See it play.](/examples/recolor)

## Why React and TypeScript, not our own language

The tempting move is to design a clean video DSL. A tight grammar, made for timelines, nothing extra. It's a trap, and
there's data on it.

A model is as good at a language as the amount of that language it has seen. The MultiPL-T paper says it directly:
"the performance of Code LLMs depends on the amount of language data available for training." Its training set had
about 64 GB of Python and about 1 GB of OCaml, and the models are measurably weaker on the small languages
([Cassano et al.](https://arxiv.org/html/2308.09895v6)). A survey of 111 papers on code generation found that
performance on low-resource and domain-specific languages "remains a significant challenge", and names the cause: data
scarcity and, for DSLs,
"specialized syntax that is poorly represented in general-purpose datasets"
([Joel et al.](https://arxiv.org/abs/2410.03981)).

A brand-new video DSL starts at zero gigabytes. Every rule has to live in the prompt. Every release breaks what the
model half learned. You spend your life writing the docs the model should already know.

TypeScript is the opposite. In August 2025 it passed Python and JavaScript to become the most used language on GitHub,
and GitHub's own explanation is that developers are "shifting toward typed languages that make agent-assisted coding
more reliable" ([Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/)).
React is how that code builds interfaces. Models have read millions of components.

So we don't teach the model a language. We give it one it already writes, and spend our effort on the types and checks
around it.

## React already fits video

A timeline is a tree. A clip is a component with props. A title animated with Motion, or a three.js scene, is just more
React. And cuts name a word in the transcript, not a second, because models are bad at frame math and good at naming
things:

```tsx
<Composition fps={30} width={1920} height={1080}>
  <Track id="main">
    <Clip id="talk" src="asset:founder" in="word:0" out="word:11.end" />
    <Transition id="x1" type="crossfade" duration={0.4} />
    <Clip id="broll" src="asset:product" in={0} out={1.6} />
  </Track>
  <Track id="text" layout="free">
    <Motion id="sandbox" anchor="talk" at="word:7" duration={2.4}
      sequence={[[".pill", { opacity: [0, 1], x: [-40, 0] }]]}>
      <div className="pill">Every app in a sandbox</div>
    </Motion>
  </Track>
</Composition>
```

Re-trim the talk and the callout moves with its word. No FFmpeg flags, no timeline clicks, no seconds worked out by
hand. UberScene does the arithmetic on an exact tick grid, so a cut never lands a frame off because `0.1 + 0.2` isn't
`0.3`.

## What we won't build

Direction is as much what you refuse as what you ship.

- **No tool catalog for the model.** Editor actions exist for a person's gestures. The model gets the file, the
  compiler and the checks, the same as it gets on any codebase.
- **No FFmpeg in the edit.** The export draws and encodes in headless Chrome, with nothing else to install. FFmpeg can
  inspect the result. It doesn't hold the cut.
- **No project file beside the code.** If the timeline shows it, the TSX says it. There is one source of truth, and you
  can diff it.
- **No language of our own.** If a feature needs new syntax, we got the API wrong.
- **No locked core.** MIT, no paid tier, no watermark. [Cutleap](https://cutleap.com), the AI video editor we're
  building, runs on the same open framework anyone can use.

## Where this ends up

The goal is a video you work on the way you work on software. You open a pull request that recuts the intro. A check
fails because a title covers the speaker. The agent fixes it and pushes again. You scrub the preview, approve the diff,
and the export is byte-for-byte what you saw. A hundred variants are a loop, not a week.

It's early. The API still changes between releases, and it will until 1.0. Every release says how to move a file, and
`uberscene lint --fix` moves most of it. I won't list what we shipped here. I'll post the steps as they happen,
including the ones that fail.

If you think MCP-wrapped editors win, convince me. I want the best version of that argument.

[Read the principles](/guide/principles) · [Start with your agent](/guide/agents) ·
[Code on GitHub (MIT)](https://github.com/prefix-tree/uberscene)
