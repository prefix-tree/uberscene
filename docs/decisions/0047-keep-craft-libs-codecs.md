# 0047. Keep craft-libs as the codec layer

> Status: accepted. Builds on [0032](./0032-native-codecs-behind-a-flag.md), which put native codecs behind
> `UBERSCENE_CODECS`; 0032 is not changed, and its flag stays as it is. Ties in with
> [0044](./0044-timeline-time-in-ticks.md), which shares craft-time's tick unit with the native side.

## Context

The editor's goal says it should go "down to its own codecs". 0032 already gives native decode and encode, on
craft-video, craft-audio and craft-media (MIT OR Apache-2.0), pinned in `native/Cargo.toml` to craft-libs commit
`82062077`. The question is whether the codecs themselves should live here, and what has to be true before native
becomes a default anywhere.

What the native side does that Chrome cannot:

- HEVC without a GPU (Chrome decodes it only through hardware).
- ProRes and DNxHR in, ProRes out (`--codec prores` into `.mov`).

What it costs today:

- Upkeep: a Rust toolchain in CI (the `native` job in `ci.yml`), the weekly `codecs-weekly.yml` that builds the
  binaries as the release does and exports on darwin-arm64, darwin-x64, linux-x64-gnu and win32-x64, and release
  binaries with SHA-256s that `uberscene codecs install` checks.
- Speed. 0032 measured the process alone at 1080p on 4 cores: VP9 decode 71 fps on one thread against libvpx's 272,
  H.264 encode about 52 core-ms a frame against Chrome's about 20. The `bench` job in `ci.yml` measures the whole
  export. Its latest run (27 November 2026, run 46014561279, "cuts only", 20 s of 1080p30, H.264, 4 tabs):

  | `UBERSCENE_CODECS` | fps |
  |---|---|
  | `browser` | 41.1 |
  | `native-decode` | 26.9 |
  | `native-encode` | 2.3 |
  | `native` | 2.2 |

  So end to end native decode is about two thirds of the browser's speed and native encode is far behind; the copies
  0032 names (3 MB of I420 into the page per decoded frame, 8 MB of RGBA out per encoded one) are part of that.
- 0044 says `native/` depends on craft-time at the craft-libs commit it already pins, with ticks in the protocol. That
  dependency is not in `native/Cargo.toml` yet, and the protocol still speaks `UBF1`.

## Decision

- **craft-libs stays the codec layer.** This repository owns only the wrapper in `native/` (the `uberscene-codec`
  binary) and its protocol (`native/PROTOCOL.md`). A codec bug or a missing feature is fixed upstream in craft-libs,
  and the pin moves. No bitstream code is written here.
- **"Its own codecs" means no FFmpeg and no browser dependency for the formats that matter.** craft-libs gives that
  already. Writing decoders and encoders in this repository would be a separate, large project with nothing a user
  would see.
- **Toward a default, in this order, each step its own pull request with the `bench` job's numbers:**
  1. Native decode as an automatic fallback for footage Chrome cannot decode (HEVC without hardware, ProRes, DNxHR)
     when the binary is installed, with one warning instead of a failed export.
  2. `native-decode` as the default for those formats once the bench shows it no slower end to end than the browser on
     footage both can read.
  3. Native encode stays opt-in until the bench shows it at or under the browser's cost per frame.
- **The preview may decode natively,** through the editor's development server or a small local helper serving
  frames to the player's `FrameSource` seam (`packages/player/src/types.ts`; the player takes a `frameSourceFactory`
  and falls back to Mediabunny), only for formats the browser cannot play, with the browser's decoder as the fallback.
  A plain web page, such as the hosted demo, stays browser only. This settles #233 as scoped.
- **craft-time comes in with the native protocol's next version,** as 0044 says: the same craft-libs commit, ticks in
  the protocol (`UBF2`), shared test cases. Until then the native side keeps seconds.

## Consequences

- The release keeps building and attaching the binaries, and the weekly codec check keeps running.
- ProRes and DNxHR footage keep needing `UBERSCENE_CODECS` until step 1 lands.
- Codec speed is craft-libs work: a separate issue tracks native decode and encode against the browser, with the
  `bench` job as the measure.
- Moving the pin is the one way codec behaviour changes here, so a pin bump is reviewed with the weekly check's and the
  bench's results.

## Alternatives

- **Own codecs in this repository:** full control, at the cost of a codec project as large as the editor, and nothing
  craft-libs does not already give.
- **FFmpeg:** faster codecs today, but a GPL or LGPL binary to ship and the dependency
  0021 removed.
- **WebAssembly codecs in the page:** no copies between processes, but single threaded without cross-origin isolation
  and slower than native (0032's reasons).
