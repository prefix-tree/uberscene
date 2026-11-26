---
"@uberscene/render": minor
"@uberscene/sdk": patch
"uberscene": minor
---

`uberscene matte talk.mp4` makes the matte `cutout` reads: it runs a matting model on every frame in headless Chrome (ONNX Runtime for the web, an optional peer dependency: `npm i -D onnxruntime-web`), writes `talk.matte.webm` beside the footage, one grey frame for each of its frames, adds it to the manifest as `talk.matte`, and sets `matte`, `matteModel` and `subjects` on the footage. It prints seconds a frame, soft edge, change between frames and how much of the picture is the subject. The default model is RobustVideoMatting ResNet-50 (GPL-3.0); `matte models` lists the others (`rvm-mobilenet`, `u2net-human`, Apache-2.0). UberScene lists models and does not ship them: the first use of one shows its licence and downloads it from its own source into `~/.cache/uberscene/models`, checked against its SHA-256 (`--accept-licence` for scripts and agents). `UBERSCENE_MODEL_REGISTRY` adds your own. The manifest type gains `matteModel`.
