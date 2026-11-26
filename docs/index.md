---
layout: page
title: UberScene
titleTemplate: The whole studio, as code
footer: false
sidebar: false
aside: false
---

<script setup>
import { withBase } from "vitepress";
</script>

<div class="home p vp-doc">

<section class="p-hero">

<p class="p-mark"><img :src="withBase('/logo.svg')" alt="" width="56" height="56" /><span>UberScene</span></p>

<h1 class="p-title">The whole studio, as <em>code</em>.</h1>

<p class="p-lead">We’re turning editing, animation and compositing into code, so AI can drive them natively.</p>

<div class="p-actions">
<a class="p-btn primary" href="#get">Install</a>
<a class="p-btn" :href="withBase('/guide/getting-started')">Documentation</a>
<a class="p-btn" :href="withBase('/examples/')">Examples</a>
<a class="p-btn" href="https://github.com/prefix-tree/uberscene">GitHub</a>
</div>

<p class="p-note">Open source · MIT · Early: the API changes until 1.0</p>

<figure class="p-film">
<video :src="withBase('/showcase/coffee.webm')" :poster="withBase('/showcase/coffee.jpg')" autoplay muted loop playsinline aria-label="The coffee film: a pour-over and an espresso cut together with transitions, titles and a warm grade"></video>
<figcaption>The coffee film, four stock shots cut in one TSX file</figcaption>
</figure>

</section>

<section class="p-section">

<p class="p-label"><span>01</span> Highlights</p>

## What's inside.

<ol class="p-grid">
<li><h3>An editor</h3><p>Clips on tracks, cuts on transcript words and shots, every trim mode (roll, slip, slide), transitions and multicam.</p></li>
<li><h3>An animation studio</h3><p>Shapes, SVG and masks, any value keyed over time with easing, a camera that makes room, and any React on the video's clock.</p></li>
<li><h3>A compositor</h3><p>Layers, keying and cut-outs, 45 shader effects and transitions or your own GLSL, and three.js scenes that play like footage.</p></li>
<li><h3>Captions and sound</h3><p>Captions from the transcript that follow every trim, music cut on the beat, fades, ducking and pan.</p></li>
<li><h3>Review without watching</h3><p>An agent reads the timeline as text and looks at sheets of frames with the sound under them, then fixes what it sees.</p></li>
<li><h3>Its own export</h3><p>MP4, WebM, AV1, stills and subtitles from headless Chrome, with no FFmpeg. Native ProRes and HEVC codecs, experimental.</p></li>
</ol>

</section>

<section class="p-section">

<p class="p-label"><span>02</span> Demo</p>

## One prompt, one line.

<p class="p-sub">Ask your agent to “change red cup color to green”. It adds one line to the file, and the same short plays with the cup green. <a :href="withBase('/examples/recolor')">The file →</a></p>

<figure class="p-film">
<video :src="withBase('/showcase/recolor.webm')" :poster="withBase('/showcase/recolor.jpg')" autoplay muted loop playsinline aria-label="A short of espresso into a red paper cup; an agent is asked to change red cup color to green and writes one line; the same short plays with the cup green"></video>
</figure>

</section>

<section class="p-section" id="get">

<p class="p-label"><span>03</span> Get it</p>

## Give it to your agent.

<p class="p-sub">Two skills: one sets UberScene up, one knows the whole language. Then ask for a video in plain words. Node 22.19 or later, no FFmpeg.</p>

<AgentPicker full />

</section>

<section class="p-section">

<p class="p-label"><span>04</span> Roadmap</p>

## What comes next.

<ol class="p-grid p-next">
<li><span>Next</span><h3>Cut-outs with no other tool</h3><p><code>uberscene matte</code> runs a matting model and writes the matte.</p></li>
<li><span>Next</span><h3>Coloured words in a title</h3><p>One word in the accent colour, the title still editable as one.</p></li>
<li><span>Next</span><h3>Ends on a word or a beat</h3><p>An overlay that lasts until a spoken word or a beat, and follows it.</p></li>
<li><span>Next</span><h3>Loudness and a sound report</h3><p>A loudness target on export, and a report by role for an agent that cannot hear.</p></li>
<li><span>Planned</span><h3>Rigs and generated motion</h3><p>One move over many elements, elements that follow, and drift, shake and settle as values.</p></li>
<li><span>Planned</span><h3>Takes from a 3D blockout</h3><p>A 3D scene and its camera path guide a video model; the take sits beside its shot.</p></li>
</ol>

<p class="p-more"><a href="https://github.com/prefix-tree/uberscene/blob/main/BACKLOG.md">The backlog →</a></p>

</section>

<section class="home-foot">

<p class="home-foot-mark" aria-hidden="true">UberScene</p>

**Free and open source under the MIT licence.** <a :href="withBase('/examples/')">More examples →</a>

[Quick start](./guide/getting-started) · [Principles](./guide/principles) · [Elements](./reference/elements/) · [CLI](./reference/cli) ·
[API](./reference/api) · [GitHub](https://github.com/prefix-tree/uberscene) ·
[npm](https://www.npmjs.com/package/uberscene)

</section>

</div>
