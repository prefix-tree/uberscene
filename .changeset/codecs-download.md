---
"@uberscene/render": minor
"uberscene": minor
---

The native codecs download on first use: the first export with `UBERSCENE_CODECS` fetches `uberscene-codec` for your machine (macOS arm64 and x64, Linux x64 and arm64 with glibc, Windows x64) from the version's GitHub release into `~/.cache/uberscene/codecs` (`UBERSCENE_CODEC_CACHE` moves it), and checks it against the SHA-256 the package carries. `npx uberscene codecs install` downloads it ahead, for a Dockerfile or a CI step. Before, the binary had to be built from the repository with Rust. `UBERSCENE_CODEC_BIN` still names a binary built elsewhere.
