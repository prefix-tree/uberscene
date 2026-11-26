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

<p class="home-lead">We're turning <strong>editing</strong>, <strong>animation</strong> and <strong>compositing</strong> into code, so AI can drive them natively. One React file holds all three, with 3D and sound: play it in the browser, fine-tune it on a timeline, export it to MP4.</p>


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

<p class="p-label"><span>02</span> Made with it</p>

## Made with UberScene.

<p class="p-sub">Every one of these is a single file, written and checked by an agent and rendered by UberScene. Hover to play; open one to read its file. <a :href="withBase('/examples/')">All examples →</a></p>

<ul class="p-films">
<li><a :href="withBase('/examples/game-lighting')"><video :src="withBase('/shorts/game-lighting.webm')" :poster="withBase('/shorts/game-lighting.jpg')" muted loop playsinline preload="none" @mouseenter="(e) => e.target.play()" @mouseleave="(e) => e.target.pause()" aria-label="How game lighting fakes it"></video><span class="p-film-kind">A 3D explainer</span><span class="p-film-title">How game lighting fakes it</span></a></li>
<li><a :href="withBase('/examples/one-pixel')"><video :src="withBase('/shorts/one-pixel.webm')" :poster="withBase('/shorts/one-pixel.jpg')" muted loop playsinline preload="none" @mouseenter="(e) => e.target.play()" @mouseleave="(e) => e.target.pause()" aria-label="One pixel"></video><span class="p-film-kind">A narrated explainer</span><span class="p-film-title">One pixel</span></a></li>
<li><a :href="withBase('/examples/lunar-eclipse')"><video :src="withBase('/shorts/lunar-eclipse.webm')" :poster="withBase('/shorts/lunar-eclipse.jpg')" muted loop playsinline preload="none" @mouseenter="(e) => e.target.play()" @mouseleave="(e) => e.target.pause()" aria-label="The lunar eclipse"></video><span class="p-film-kind">A talking head with a diagram</span><span class="p-film-title">The lunar eclipse</span></a></li>
<li><a :href="withBase('/examples/hundred-videos')"><video :src="withBase('/shorts/hundred-videos.webm')" :poster="withBase('/shorts/hundred-videos.jpg')" muted loop playsinline preload="none" @mouseenter="(e) => e.target.play()" @mouseleave="(e) => e.target.pause()" aria-label="An interview that changes layout"></video><span class="p-film-kind">An interview short</span><span class="p-film-title">An interview that changes layout</span></a></li>
<li><a :href="withBase('/examples/kinetic')"><video :src="withBase('/showcase/kinetic.webm')" :poster="withBase('/showcase/kinetic.jpg')" muted loop playsinline preload="none" @mouseenter="(e) => e.target.play()" @mouseleave="(e) => e.target.pause()" aria-label="Kinetic type"></video><span class="p-film-kind">Kinetic type</span><span class="p-film-title">Kinetic type</span></a></li>
<li><a :href="withBase('/examples/snake-heart')"><video :src="withBase('/shorts/snake-heart.webm')" :poster="withBase('/shorts/snake-heart.jpg')" muted loop playsinline preload="none" @mouseenter="(e) => e.target.play()" @mouseleave="(e) => e.target.pause()" aria-label="Snake that ends in a heart"></video><span class="p-film-kind">A generative short</span><span class="p-film-title">Snake that ends in a heart</span></a></li>
</ul>

</section>

<section class="p-section">

<p class="p-label"><span>03</span> Demo</p>

## One prompt, one line.

<p class="p-sub">Ask your agent to “change red cup color to green”. It adds one line to the file, and the same short plays with the cup green. <a :href="withBase('/examples/recolor')">The file →</a></p>

<figure class="p-film">
<video :src="withBase('/showcase/recolor.webm')" :poster="withBase('/showcase/recolor.jpg')" autoplay muted loop playsinline aria-label="A short of espresso into a red paper cup; an agent is asked to change red cup color to green and writes one line; the same short plays with the cup green"></video>
</figure>

</section>

<section class="p-section" id="get">

<p class="p-label"><span>04</span> Get it</p>

## Give it to your agent.

<ul class="home-why-list">
<li><span><strong>An editor, as code</strong> Clips on tracks, cuts on words, trims, roll, slip and slide, transitions and multicam. The player is your monitor, and a drag on the timeline writes one value back into the file.</span></li>
<li><span><strong>An animation studio, as code</strong> Shapes, SVG and masks on the stage, any prop keyed over time with easing, and Motion or canvas on the video's clock, frame-exact when you scrub.</span></li>
<li><span><strong>A compositor, as code</strong> Layers and keys, 46 effects and transitions running as shaders or your own GLSL, a three.js scene with its camera and lights, and an export from the same file.</span></li>
</ul>

<p class="p-sub">Two skills: one sets UberScene up, one knows the whole language. Then ask for a video in plain words. Node 22.19 or later, no FFmpeg.</p>

<AgentPicker full />

</section>

<section class="p-section">

<p class="p-label"><span>05</span> Roadmap</p>

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
