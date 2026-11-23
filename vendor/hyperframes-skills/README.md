# HyperFrames skills, to adapt

The agent skills of [HyperFrames](https://github.com/heygen-com/hyperframes) (HeyGen, Apache-2.0), copied as they
are at commit `457cc5692685` so we can adapt them to UberScene one by one. Nothing here ships: the plugin's skill is
`plugins/uberscene/skills/`, and an adapted skill moves there once it speaks UberScene (TSX, `uberscene` commands,
our elements) instead of HyperFrames (HTML, GSAP, `hyperframes` commands).

- **published:** the skills HyperFrames lists on skills.sh (`skills/` in their repository).
- **internal:** the skills their own agents use in the repository (`.agents/skills/`): motion and seam doctrine for
  launch videos.

Left out: the docs of their registry blocks (`registry/blocks/*/SKILL.md`), which describe HyperFrames blocks rather
than how to work.

| Skill | Kind | What it is for (their words) |
|---|---|---|
| [`figma`](./figma/SKILL.md) | published | Bring Figma into a HyperFrames video - rendered assets, brand tokens, components, storyboard frames as reconstructed motion (frames read as states, no… |
| [`hyperframes`](./hyperframes/SKILL.md) | published | Read first to make, edit, animate or render any video with HyperFrames (HTML rendered to video), including launch films, explainers, music videos, cha… |
| [`hyperframes-cli`](./hyperframes-cli/SKILL.md) | published | HyperFrames CLI - scaffold, check frames, edit timelines, preview, render, share and project history; read JSON and recover from failures. |
| [`hyperframes-registry`](./hyperframes-registry/SKILL.md) | published | About 450 ready-made HyperFrames blocks and components installed as editable source - transitions, overlays, titles, kinetic type, captions, charts, m… |
| [`media-use`](./media-use/SKILL.md) | published | Get or make any media for a HyperFrames video - music, sound effects, images, icons, logos, voiceover, avatar and generated video, transcripts, cutout… |
| [`remotion-to-hyperframes`](./remotion-to-hyperframes/SKILL.md) | published | Bring existing video code or footage into HyperFrames and verify it frame by frame against the original - Remotion first, also Motion Canvas, Lottie, … |
| [`reverse-any-video`](./reverse-any-video/SKILL.md) | published | Rebuild any video file as an editable HyperFrames project - motion graphics, talking heads, live action or AI-generated footage - checked against the … |
| [`slideshow`](./slideshow/SKILL.md) | published | Build a HyperFrames slideshow to present live - slides, fragment reveals, branching hotspots and presenter mode with speaker notes, served by `hyperfr… |
| [`style-sampling`](./style-sampling/SKILL.md) | published | Make a new episode in a proven video style - Collage Explainer, Finance Explainer, Animated Science Explainer, 3D Brand Explainer, 3D True Crime - on … |
| [`captions-overlay`](./internal/captions-overlay/SKILL.md) | internal | Overlay doctrine for captions in HyperFrames videos — the caption MODEL (drop / rail / embed) and the rule that captions are an OVERLAY composited on … |
| [`changelog-video`](./internal/changelog-video/SKILL.md) | internal | Turn a weekly changelog .md into a finished branded changelog video (square 1080, ~45-60s, Annie VO, animated brand background, mock-UI visualizations… |
| [`cut-the-curve`](./internal/cut-the-curve/SKILL.md) | internal | The technique catalog: five velocity-matched SEAMS (zoom-through, INVERSE zoom-through, cut-the-curve, waterfall cut, rack-focus blur-cut) plus the tw… |
| [`motion-doctrine`](./internal/motion-doctrine/SKILL.md) | internal | GATEWAY — load FIRST before composing any HyperFrames animation or video. The high-level motion law that makes a multi-scene video feel like ONE conti… |
| [`oversized-cursor`](./internal/oversized-cursor/SKILL.md) | internal | House-style oversized macOS cursor technique for HyperFrames launch videos. Load whenever a scene involves cursors or a pointer-led action, when kicki… |
| [`seam-craft`](./internal/seam-craft/SKILL.md) | internal | Render-correctness doctrine for scene-to-scene seams in HyperFrames launch videos — the prerequisites that make transitions composite correctly on the… |

## Licence

Apache License 2.0, in [`LICENSE`](./LICENSE); copyright HeyGen and the HyperFrames contributors. An adapted skill
keeps a line saying it is based on the HyperFrames skill of the same name, and says what was changed.
