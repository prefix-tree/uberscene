---
name: uberscene-setup
description: Install, check, upgrade or repair UberScene in a project, so the uberscene command line works before any video is made. Use when asked to set up or install UberScene, when a uberscene command is not found or fails to start, when the first export cannot download Chrome, or after upgrading UberScene.
license: MIT
---

# Set up UberScene

UberScene is a video editor as code: one TSX file is the video, and the `uberscene` command line checks it and renders
it. This skill gets that command line working in a project and keeps it current. Making the video itself is the
`uberscene` skill's job: once setup passes, hand over to it.

Run every step in the project folder (where the video and its media will live), and read each command's output
before going on. Stop and tell the person when a step fails in a way this page does not cover.

## 1. Check Node

```sh
node --version
```

UberScene needs **Node 22.19 or later**. If Node is missing or older, tell the person and point them to
[nodejs.org](https://nodejs.org) or their version manager (`nvm install 22`, `fnm install 22`, `volta install node@22`).
Do not install a system Node without asking: it changes their machine for every project.

No ffmpeg is needed. Exports draw in Chrome for Testing, which UberScene downloads itself.

## 2. Install the packages

Use the package manager the project already uses: a `pnpm-lock.yaml` means pnpm, `yarn.lock` yarn, `bun.lock` bun,
otherwise npm. With no `package.json` yet, run `npm init -y` first.

```sh
npm install uberscene @uberscene/kit react zod
# pnpm add uberscene @uberscene/kit react zod
# yarn add uberscene @uberscene/kit react zod
# bun add uberscene @uberscene/kit react zod
```

- `uberscene` is the command line (`npx uberscene`).
- `@uberscene/kit` holds the elements a video file imports (`Composition`, `Clip`, `Title`…).
- `react` and `zod` are what a video file is written with: the elements are React, and a file's `schema` is zod.

Keep all four in `dependencies`, at the versions npm picked: the UberScene packages are released together and must
match.

## 3. Fetch Chrome now

```sh
npx uberscene browser install
```

Every export and every `look` sheet draws its frames in Chrome for Testing. Fetching it now takes a minute once,
instead of in the middle of the first render. It lands in `~/.cache/uberscene/browsers`, shared by every project.

- **Download blocked** (a proxy, an offline machine, CI): set `UBERSCENE_CHROMIUM` to a Chrome of the same milestone
  that is already installed, or `UBERSCENE_BROWSER_CACHE` to a folder that can be written and is kept between runs.
  `npx uberscene --help` prints the milestone this version needs.
- **Linux, Chrome will not start** (missing `libnss3`, `libgbm` and the like): the machine lacks Chrome's system
  libraries. Name the error to the person; installing system packages is their call.

## 4. Install the skill that matches this version

Skip this step in Claude Code with the UberScene plugin: the plugin carries both skills.

```sh
npx uberscene skills install                                  # Claude Code: .claude/skills/uberscene
npx uberscene skills install --dir .agents/skills/uberscene   # Codex, Cursor, Gemini CLI, VS Code, OpenCode
```

This writes the `uberscene` skill (how to write and check a video, with every element, effect, transition, component
and command of this version) and this setup skill beside it. Point `--dir` at the folder your agent reads skills
from. A folder someone edited is left alone; say so to the person rather than adding `--force` on your own.

## 5. Prove it works

Write a three second test file, read it back, and draw one sheet. This touches every part: the packages, the command
line and Chrome. The file carries an empty manifest, so it needs no media and no `uberscene.json`.

<!-- sync: example setup-check.tsx -->
```tsx
// setup-check.tsx
import { Composition, Title, Track } from "@uberscene/kit";

export const manifest = { assets: {} };

export default function Video() {
  return (
    <Composition fps={30} width={1080} height={1920}>
      <Track id="text">
        <Title id="hello" duration={3} style="h1">
          UberScene works
        </Title>
      </Track>
    </Composition>
  );
}
```
<!-- /sync -->

```sh
npx uberscene inspect setup-check.tsx
npx uberscene look setup-check.tsx --out setup-check.png
```

`inspect` prints `3.00 s (90 frames)  0 errors` and one track with the title; it needs no browser. `look` draws the
frames in Chrome and writes `setup-check.png`, which shows the words: open it and look. Then delete `setup-check.tsx`
and `setup-check.png`: they are not the person's.

A real video's media goes into the manifest with `npx uberscene add <media file>`, which writes `uberscene.json`;
every command looks for it in the file's folder or a folder above it.

## Upgrade

```sh
npm install uberscene@latest @uberscene/kit@latest
npx uberscene skills install --dir <the folder you used before>
npx uberscene blocks update
npx uberscene lint --fix video.tsx
```

Upgrade the UberScene packages together. Install the skill again so the agent learns the new version's commands
(step 4). `blocks update` refreshes blocks copied into the project that nobody edited. `lint --fix` rewrites what an
older file spelled the way an earlier version took it. Then render the video once and look at it.

## When something fails

| What you see | What to do |
|---|---|
| `uberscene: command not found` | Use `npx uberscene`, or run step 2: the package is not in this project |
| `Unsupported engine` or a syntax error at start | Node is older than 22.19 (step 1) |
| `Cannot find module '@uberscene/kit'` in a video file | Step 2 in the folder that holds the file, or a folder above it |
| Versions of UberScene packages differ | Install them together at one version (step 2) |
| The first export hangs at "downloading Chrome" | Step 3, and its notes on a blocked download |
| `could not look up Chrome …` | The download is blocked: step 3, `UBERSCENE_CHROMIUM` or a cache folder fetched elsewhere |
| `the export runs on Chrome N only` | `UBERSCENE_CHROMIUM` names another milestone: unset it, or point it at Chrome N |
| `no manifest for video.tsx` | `npx uberscene add <media file>` writes `uberscene.json` |
| The agent uses a command `--help` does not list | Its skill is from another version: step 4 |
| Exporting ProRes or HEVC footage fails | Experimental native codecs: `UBERSCENE_CODECS=native` and `npx uberscene codecs install` |

When setup passes, tell the person what was installed and which version (`npm ls uberscene`), and go on with the
`uberscene` skill.
