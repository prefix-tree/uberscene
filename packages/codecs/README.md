# @uberscene/codecs

UberScene's native codecs, as a binary for your platform. With it installed, an export can decode footage and encode
video without Chrome's codecs: HEVC, ProRes and DNxHR footage on a machine with no GPU, and a ProRes master in a
`.mov`. They are experimental and off unless asked for.

```sh
npm install @uberscene/codecs
UBERSCENE_CODECS=native npx uberscene video.tsx --out video.mp4
```

The install brings one of these, the one that fits the machine:

| Package | Platform |
|---|---|
| `@uberscene/codecs-darwin-arm64` | macOS on Apple silicon |
| `@uberscene/codecs-darwin-x64` | macOS on Intel |
| `@uberscene/codecs-linux-x64-gnu` | Linux x64 (glibc) |
| `@uberscene/codecs-linux-arm64-gnu` | Linux arm64 (glibc) |
| `@uberscene/codecs-win32-x64` | Windows x64 |

On another platform (Alpine, Windows on arm64), build `uberscene-codec` from the
[repository](https://github.com/prefix-tree/uberscene/tree/main/native) and name it in `UBERSCENE_CODEC_BIN`.

Keep this package at the same version as `uberscene`: the export and the binary speak a protocol that changes
between releases.

```ts
import { binaryPath } from "@uberscene/codecs";

binaryPath(); // the binary for this machine, or null when none is installed
```

[Native codecs](https://uberscene.prefixtree.xyz/guide/native-codecs) explains what they read and write.
