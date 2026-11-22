---
"@uberscene/codecs": minor
"@uberscene/render": minor
"uberscene": minor
---

The native codecs are on npm: `npm install @uberscene/codecs` brings the `uberscene-codec` binary for your platform (macOS arm64 and x64, Linux x64 and arm64 with glibc, Windows x64), and an export with `UBERSCENE_CODECS` finds it there. Before, the binary had to be built from the repository with Rust. Nothing installs the package unless you ask, and the codecs stay experimental. Keep it at the same version as `uberscene`. `UBERSCENE_CODEC_BIN` still names a binary built elsewhere, for other platforms.
