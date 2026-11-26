---
layout: page
title: UberScene
titleTemplate: Multimedia pipeline as code
footer: false
sidebar: false
aside: false
---

<script setup>
import { withBase } from "vitepress";
</script>

<div class="home vp-doc">

<section class="home-hero">
<div class="home-hero-grid">
<div class="home-hero-main">

<p class="home-tags"><span>Open source · MIT</span><span>Early: the API changes until 1.0</span></p>

<p class="home-mission"><span>Our mission</span>Every tool of a studio as code: the editor, the animation studio, the compositor, 3D and sound, in files you and your agent write.</p>

<h1 class="home-title">Multimedia pipeline as code.</h1>

<p class="home-lead">Write it as <strong>a React file</strong>. Play it in the browser, fine-tune it on a timeline and <strong>export it to MP4</strong>. <strong>Your coding agent</strong> can do all of it.</p>

<div class="home-actions">
<a class="home-button primary" :href="withBase('/guide/getting-started')">Get started</a>
<a class="home-link" :href="withBase('/examples/')">See the examples</a>
</div>

<AgentPicker />

</div>
<figure class="home-film">
<video :src="withBase('/showcase/coffee.webm')" :poster="withBase('/showcase/coffee.jpg')" autoplay muted loop playsinline aria-label="The coffee film: a pour-over and an espresso cut together with transitions, titles and a warm grade"></video>
<figcaption><a :href="withBase('/examples/coffee')"><strong>The coffee film</strong></a>, four stock shots cut in one TSX file</figcaption>
</figure>
</div>
<figure class="home-sheet">
<a :href="withBase('/examples/coffee')"><img :src="withBase('/showcase/coffee-look.webp')" width="2600" height="972" loading="eager" alt="Eight frames of the coffee film in two rows: a pour-over titled SLOW POUR, a lower third over the bloom, a callout on a held frame, an espresso machine titled FAST SHOT, a Warm LUT badge, three glasses under EVERY GLASS, A LINE OF CODE, and a red cup as a quote builds word by word; under them, a strip of the film's sound with a peak on every cue" /></a>
<figcaption><code>uberscene look coffee.tsx --at 2.5,7.2,9.9,16,19.5,24.5,30.5,34.5 --listen all</code><span>One command draws a whole cut and its sound on one sheet: this is how an agent reviews a video without watching it. <a :href="withBase('/reference/cli#look')">look →</a></span></figcaption>
</figure>
</section>

<section class="home-chapter">

## One prompt, one line

<p class="home-chapter-lead">Ask your agent to "change red cup color to green": it adds one line to the file, a <code>recolor</code> effect, and the same short plays with the cup green. <a :href="withBase('/examples/recolor')">The file →</a></p>

<figure class="home-film">
<video :src="withBase('/showcase/recolor.webm')" :poster="withBase('/showcase/recolor.jpg')" autoplay muted loop playsinline aria-label="A short of espresso into a red paper cup; an agent is asked to change red cup color to green and writes one line; the same short plays with the cup green"></video>
</figure>

</section>

<section class="home-install" id="install">

## Install

<p class="home-chapter-lead">UberScene is built for a coding agent to drive: give it the two skills, one to set UberScene up and one that knows the whole language, then ask for a video in plain words. It adds your footage, writes <code>video.tsx</code>, checks it with sheets of frames and renders <code>video.mp4</code>. Or pick By hand and run the commands yourself. Either way you need Node 22.19 or later, and no ffmpeg.</p>

<AgentPicker full />

<p class="home-install-more"><a :href="withBase('/guide/agents')">With your agent →</a> <a :href="withBase('/guide/getting-started')">Quick start →</a></p>

</section>

<section class="home-why">

## Three tools, as code

<p class="home-why-lead">What you would open an editor, an animation studio and a compositor for, written as one file. An agent writes code better than it drives a timeline, so it can do all three.</p>

<ul class="home-why-list">
<li><span><strong>An editor, as code</strong> Clips on tracks, cuts on words, trims, roll, slip and slide, transitions and multicam. The player is your monitor, and a drag on the timeline writes one value back into the file.</span></li>
<li><span><strong>An animation studio, as code</strong> Shapes, SVG and masks on the stage, any prop keyed over time with easing, and Motion or canvas on the video's clock, frame-exact when you scrub.</span></li>
<li><span><strong>A compositor, as code</strong> Layers and keys, 45 effects and transitions running as shaders or your own GLSL, a three.js scene with its camera and lights, and an export from the same file.</span></li>
</ul>

</section>

<section class="home-features">

## The whole pipeline

<p class="home-chapter-lead">Not only video as code: the edit, motion, compositing, 3D and sound. What works today, from the first cut to the export, in the order you use it. Under it, the roadmap: what is being built now and what is planned next. <a href="https://github.com/prefix-tree/uberscene/blob/main/BACKLOG.md">The backlog →</a></p>

<FeatureGroups />

</section>

<section class="home-elements">

## Every element

<p class="home-chapter-lead">Each one a few lines of TSX, rendered by the same player you embed. <a :href="withBase('/examples/')">All examples →</a></p>

<div class="home-element-grid">

<article class="home-element">

### Cuts and transitions

<p class="home-element-lead">Clips play one after another on a track. A transition between two of them overlaps them: wipe, iris, film burn, blinds and more. <a :href="withBase('/guide/transitions')">Transitions →</a></p>

<Example src="previews/elements/transition" alt="A wipe from one coffee shot to another">

<<< @/../examples/showcase/docs/transition.tsx

</Example>

</article>

<article class="home-element">

### Titles

<p class="home-element-lead">Text over the picture, timed to a clip, animated by letter or by word. <a :href="withBase('/guide/titles-and-graphics')">Titles and graphics →</a></p>

<Example src="previews/elements/title" alt="A title appearing word by word over a coffee shot">

<<< @/../examples/showcase/docs/title.tsx

</Example>

</article>

<article class="home-element">

### Captions

<p class="home-element-lead">Captions from the clip's transcript, or from SRT, VTT and Whisper. Karaoke, word by word or typewriter. <a :href="withBase('/guide/captions-and-sound')">Captions and sound →</a></p>

<Example src="previews/elements/captions" alt="Karaoke captions over a speaker">

<<< @/../examples/showcase/docs/captions.tsx

</Example>

</article>

<article class="home-element">

### Colour and effects

<p class="home-element-lead">Exposure, white balance, curves, LUTs, keying, glow and more, written in the order a colourist works. Shaders in the preview and the export. <a :href="withBase('/reference/effects/')">All 45 effects and transitions →</a></p>

<Example src="previews/guide/colour-grade" alt="A coffee shot, then the same shot graded">

<<< @/../examples/showcase/guide/colour-grade.tsx

</Example>

</article>

<article class="home-element">

### Motion graphics

<p class="home-element-lead">Ready-made lower thirds, callouts, counters and cards, timed like any title. <a :href="withBase('/reference/components/')">Components →</a></p>

<Example src="previews/components/lower-third" alt="A lower third sliding up over a coffee shot">

<<< @/../examples/showcase/components/lower-third.tsx

</Example>

</article>

<article class="home-element">

### Three.js and any React

<p class="home-element-lead">Any component on the video's clock: three.js, Motion, SVG or canvas, frame-exact when you scrub or export. Next: a 3D scene with a camera path that also renders guidance for video models. <a :href="withBase('/guide/free-code')">Free code →</a></p>

<Example src="previews/elements/three" alt="A spinning cube over a coffee shot">

<<< @/../examples/showcase/docs/three.tsx

</Example>

</article>

</div>

</section>

<section class="home-foot">

<p class="home-foot-mark" aria-hidden="true">UberScene</p>

**Free and open source under the MIT licence.** <a :href="withBase('/examples/')">More examples →</a>

[Quick start](./guide/getting-started) · [Principles](./guide/principles) · [Elements](./reference/elements/) · [CLI](./reference/cli) ·
[API](./reference/api) · [GitHub](https://github.com/prefix-tree/uberscene) ·
[npm](https://www.npmjs.com/package/uberscene)

</section>

</div>
