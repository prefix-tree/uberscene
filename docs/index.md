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

<div class="home vp-doc">

<section class="home-hero">
<div class="home-hero-grid">
<div class="home-hero-main">

<p class="home-tags"><span>Open source · MIT</span><span>Early: the API changes until 1.0</span></p>

<h1 class="home-title">The whole studio, as code.</h1>

<p class="home-lead">We’re turning <strong>editing</strong>, <strong>animation</strong> and <strong>compositing</strong> into code, so AI can drive them natively.</p>

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
</section>

<section class="home-chapter">

## One prompt, one line

<p class="home-chapter-lead">Ask your agent to "change red cup color to green": it adds one line to the file, a <code>recolor</code> effect, and the same short plays with the cup green. <a :href="withBase('/examples/recolor')">The file →</a></p>

<figure class="home-film">
<video :src="withBase('/showcase/recolor.webm')" :poster="withBase('/showcase/recolor.jpg')" autoplay muted loop playsinline aria-label="A short of espresso into a red paper cup; an agent is asked to change red cup color to green and writes one line; the same short plays with the cup green"></video>
</figure>

</section>

<section class="home-why">

## Why code

<p class="home-why-lead">An agent writes code better than it drives a timeline. So each tool is a few lines of one file, and the model can change all of them.</p>

<ul class="home-why-list">
<li><span><strong>An editor, as code</strong> Clips on tracks, cuts on words, trims, roll, slip and slide, transitions and multicam. The player is your monitor, and a drag on the timeline writes one value back into the file.</span></li>
<li><span><strong>An animation studio, as code</strong> Shapes, SVG and masks on the stage, any prop keyed over time with easing, and Motion or canvas on the video's clock, frame-exact when you scrub.</span></li>
<li><span><strong>A compositor, as code</strong> Layers and keys, 45 effects and transitions running as shaders or your own GLSL, a three.js scene with its camera and lights, and an export from the same file.</span></li>
</ul>

</section>

<section class="home-features">

## Features

<p class="home-chapter-lead">What works today, in the order you use it, and what comes next. <a :href="withBase('/examples/')">All examples →</a> <a href="https://github.com/prefix-tree/uberscene/blob/main/BACKLOG.md">The backlog →</a></p>

<FeatureGroups />

</section>

<section class="home-foot">

<p class="home-foot-mark" aria-hidden="true">UberScene</p>

**Free and open source under the MIT licence.** <a :href="withBase('/examples/')">More examples →</a>

[Quick start](./guide/getting-started) · [Principles](./guide/principles) · [Elements](./reference/elements/) · [CLI](./reference/cli) ·
[API](./reference/api) · [GitHub](https://github.com/prefix-tree/uberscene) ·
[npm](https://www.npmjs.com/package/uberscene)

</section>

</div>
