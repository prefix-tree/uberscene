// Renders each example film three times for TikTok, 1080x1920: `out/<name>-code.mp4`, the film on top with its source
// lighting up below (frame.tsx); `out/<name>-reveal.mp4`, the film full screen that splits for a stretch to show the
// code playing it and then fills the frame again (reveal.tsx); and `out/<name>-post.mp4`, just the film (post.tsx).
//
//   pnpm --filter @uberscene/example-tiktok render            every film
//   pnpm --filter @uberscene/example-tiktok render reel hero  some of them
//
// Each film is rendered first, as it is, from its own folder, then played inside the frame as an asset. A film whose
// media is not made yet is skipped, with the command that makes it.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { addAsset, checkLayout, directoryResolver, formatLayout, loadVideo, renderVideo } from "@uberscene/render";
import { timelineBeats } from "@uberscene/sdk";

const here = import.meta.dirname;
const examples = join(here, "..");
const out = join(here, "out");
const manifest = join(here, "uberscene.json");
mkdirSync(out, { recursive: true });
if (!existsSync(manifest)) writeFileSync(manifest, `${JSON.stringify({ assets: {} }, null, 2)}\n`);

interface Film {
  /** The film's file, from examples/. */
  readonly file: string;
  /** What makes its media, when it is not in the repository. */
  readonly needs?: string;
  /**
   * When the reveal shows the code and when the film takes the frame back, in seconds of the film. Left out: the
   * middle third, each end moved to the nearest beat when the film has music.
   */
  readonly reveal?: readonly [number, number];
  /** Lines that open the reveal and say what it is: a question, its answer, the turn; each over its own seconds. */
  readonly hook?: readonly { text: string; from: number; to: number; size?: number; y?: number }[];
  /**
   * The film's music as a Strudel score (from examples/): shown first in the reveal, its sections lit as they play,
   * until `until`, when the editor switches to the film's file.
   */
  readonly music?: { readonly file: string; readonly until: number };
}

const FILMS: Record<string, Film> = {
  reel: { file: "interview/reel.tsx", needs: "bash examples/interview/scripts/prepare.sh" },
  cards: { file: "interview/cards.tsx", needs: "bash examples/interview/scripts/prepare.sh" },
  pipeline: { file: "showcase/pipeline.tsx", needs: "pnpm --filter @uberscene/example-showcase gen" },
  beats: { file: "showcase/beats.tsx", needs: "pnpm --filter @uberscene/example-showcase gen" },
  hero: { file: "showcase/hero.tsx" },
  "snake-heart": { file: "shorts/snake-heart.tsx" },
  "game-lighting": { file: "shorts/game-lighting.tsx" },
  // The code comes up for the build, as the lightning strikes, and the film takes the frame back on the drop.
  orbit: { file: "orbit/video.tsx", needs: "pnpm --filter @uberscene/example-orbit prepare-media", reveal: [8, 16] },
  // The code comes up for the Shuttle, and the film takes the frame back on the drop, as the Falcon Heavy lights.
  // The hook says what it is; the code comes up for Apollo with the music's score, whose lit section moves from 1969 to
  // the 80s as Atlantis lights, then switches to the pictures' file, and the film takes the frame back on the drop.
  liftoff: {
    file: "liftoff/video.tsx",
    needs: "pnpm --filter @uberscene/example-liftoff prepare-media",
    reveal: [12, 24],
    // The question, its answer and the turn, each held long enough to read, in the top third: the countdown's numbers
    // run below them from 3 s; the turn holds until just after ignition, and the mission until the code comes up.
    hook: [
      { text: "How do you edit\n60 years of launches?", from: 0, to: 2.9, y: 470 },
      { text: "Footage. Music.\nAn editor.", from: 2.9, to: 4.6, y: 470 },
      { text: "BUT no After Effects.\nNo Premiere. Just code.", from: 4.6, to: 8.4, size: 64, y: 470 },
      { text: "Building it to 10/10.\nFollow along.", from: 8.4, to: 11.6, size: 64, y: 470 },
    ],
    music: { file: "liftoff/score.ts", until: 20 },
  },
  // Drawn, no footage: every block that falls is a note of the score. The code comes up as the lead joins: the score
  // through the end of the build and into the drop, its lit chord the block landing above, then the file that draws
  // the lanes, and the film takes the frame back for the power-down.
  machine: {
    file: "machine/video.tsx",
    needs: "pnpm --filter @uberscene/example-machine prepare-media",
    reveal: [12, 24],
    hook: [
      { text: "Can you see music?", from: 0, to: 2.8, y: 820 },
      { text: "Every block\nis one note.", from: 2.8, to: 5.6, y: 820 },
      { text: "BUT no editor.\nJust code.", from: 5.6, to: 8.6, y: 820 },
      { text: "Building it to 10/10.\nFollow along.", from: 8.6, to: 11.6, size: 64, y: 820 },
    ],
    music: { file: "machine/score.ts", until: 18 },
  },
};

/** Elements whose line lights up while they are on screen; sound and structure do not. */
const SHOWN = new Set(["title", "clip", "shape", "layer", "svg", "sticker", "captions", "nested"]);

const only = process.argv.slice(2);
/** `POSTS=reveal,post` renders only those posts. */
const kinds = process.env.POSTS?.split(",");
for (const [name, film] of Object.entries(FILMS)) {
  if (only.length > 0 && !only.includes(name)) continue;
  const file = join(examples, film.file);
  const folder = dirname(file);
  const video = await loadVideo(file);
  if (video.state.errors.length > 0) {
    process.stderr.write(`${name}: skipped, it does not resolve: ${video.state.errors[0]?.message}\n`);
    continue;
  }
  const media = directoryResolver(join(folder, "media"), video.manifest);
  const missing = Object.keys(video.manifest.assets).filter(
    (id) => !existsSync(join(folder, "media")) || !hasMedia(join(folder, "media"), id),
  );
  const used = new Set([...video.state.items.values()].flatMap((p) => (p.source ? [p.source.asset] : [])));
  if (missing.some((id) => used.has(id))) {
    process.stderr.write(`${name}: skipped, its media is not made yet: ${film.needs ?? "see its README"}\n`);
    continue;
  }

  // 1. The film, as it is, rendered again only when its file, its manifest or its media changed.
  const code = readFileSync(file, "utf8");
  // The media files too, by name, size and time: a remade song or clip keeps its manifest entry but not its sound.
  const mediaDir = join(folder, "media");
  const files = existsSync(mediaDir)
    ? readdirSync(mediaDir)
        .sort()
        .map((f) => {
          const st = statSync(join(mediaDir, f));
          return `${f}:${st.size}:${Math.round(st.mtimeMs)}`;
        })
    : [];
  const hash = createHash("sha256")
    .update(code)
    .update(JSON.stringify(video.manifest))
    .update(files.join("\n"))
    .digest("hex")
    .slice(0, 12);
  const rendered = join(out, `${name}.${hash}.webm`);
  if (!existsSync(rendered)) {
    process.stdout.write(`${name}: rendering the film\n`);
    const r = await renderVideo({
      state: video.state,
      media,
      out: rendered,
      bitrate: 24_000_000,
      source: video.source,
    });
    for (const w of r.warnings) process.stderr.write(`${name}: warning: ${w}\n`);
  }

  // 2. The lines to light: each shown element's `id="…"` line, while it is on screen.
  const lines = code.split("\n");
  const lit = [...video.state.items.values()]
    .filter((p) => SHOWN.has(p.kind) && p.end > p.start)
    .flatMap((p) => {
      // Written as a prop, or as a field of a table the file maps to elements.
      const line = lines.findIndex((l) => l.includes(`id="${p.id}"`) || l.includes(`id: "${p.id}"`));
      return line >= 0 ? [{ line, from: round(p.start), to: round(p.end) }] : [];
    });

  // 3. The film as an asset of the frame.
  const id = `film-${name}`;
  await addAsset(rendered, { id, manifest });
  const { width, height } = video.state.composition;
  const length = round(video.state.composition.duration);
  const resolver = directoryResolver(out, JSON.parse(readFileSync(manifest, "utf8")), { [id]: rendered });

  // 4. The three posts.
  const props = { code, lit, film: id, width, height, length, file: basename(file), hook: "This video is code." };
  const [split, back] = film.reveal ?? middleThird(video.state, length);
  const picture = { file: basename(file), label: film.music ? "the pictures" : "playing above", code, lit };
  const pages = film.music
    ? (() => {
        const score = readFileSync(join(examples, film.music.file), "utf8");
        return [
          { file: basename(film.music.file), label: "the music", code: score, lit: scoreLit(score), from: 0 },
          { ...picture, from: film.music.until },
        ];
      })()
    : [{ ...picture, from: 0 }];
  for (const [kind, page, extra] of [
    ["code", "frame.tsx", props],
    ["reveal", "reveal.tsx", { film: id, width, height, length, pages, split, back, hook: film.hook }],
    ["post", "post.tsx", { film: id, width, height, length }],
  ] as const) {
    if (kinds && !kinds.includes(kind)) continue;
    const post = await loadVideo(join(here, page), { manifest, props: extra });
    if (post.state.errors.length > 0)
      throw new Error(`${name}-${kind}: ${post.state.errors.map((e) => `${e.id}: ${e.message}`).join("; ")}`);
    const target = join(out, `${name}-${kind}.mp4`);
    const r = await renderVideo({
      state: post.state,
      media: resolver,
      out: target,
      bitrate: 16_000_000,
      source: post.source,
    });
    process.stdout.write(
      `${name}-${kind}: ${r.frames} frames, ${r.width}x${r.height}, ${(r.wallMs / 1000).toFixed(0)} s → ${target}\n`,
    );
    if (kind !== "post") {
      const layout = await checkLayout({
        state: post.state,
        media: resolver,
        source: { ...post.source, file: page },
        safeZone: "tiktok",
        step: 0.5,
      });
      if (layout.issues.length > 0) process.stderr.write(formatLayout(layout));
    }
  }
}

/**
 * The lines of a Strudel score to light: each section's `const name = \`stack(` block, every line of it, while the
 * section plays. The sections' times come from the score's own `arrange([cycles, \${name}], …)` and its `cps`.
 * Lines go in bottom-up, so the line the window keeps in view is the block's first.
 */
function scoreLit(code: string): { line: number; from: number; to: number; cols?: readonly [number, number] }[] {
  const lines = code.split("\n");
  const cps = Number(/cps:\s*([\d.]+)/.exec(code)?.[1] ?? 0.5);
  const lit: { line: number; from: number; to: number; cols?: readonly [number, number] }[] = [];
  let at = 0;
  for (const [, cycles, name] of code.matchAll(/\[(\d+),\s*\$\{(\w+)\}\]/g)) {
    const from = at / cps;
    at += Number(cycles);
    const first = lines.findIndex((l) => l.startsWith(`const ${name} = `));
    if (first < 0) continue;
    let last = first;
    while (last < lines.length - 1 && !lines[last]?.trimEnd().endsWith("`;")) last++;
    for (let line = last; line >= first; line--) lit.push({ line, from: round(from), to: round(at / cps) });
    // The chord sounding and the bass root under it: a `chord("<…>")` or `note("<…>")` of plain steps, one a bar,
    // lit word by word. Steps with brackets or `*` are rhythms within the bar, not one step a bar, and are left.
    const bars = Number(cycles);
    for (let line = first; line <= last; line++) {
      for (const m of (lines[line] ?? "").matchAll(/(?:chord|note)\("<([^"<>[\]*]+)>"\)/g)) {
        const inner = m[1] as string;
        const start = (m.index ?? 0) + m[0].indexOf("<") + 1;
        const steps = [...inner.matchAll(/\S+/g)].map(
          (w) => [start + (w.index ?? 0), start + (w.index ?? 0) + w[0].length] as const,
        );
        if (steps.length < 2) continue;
        for (let bar = 0; bar < bars; bar++) {
          const cols = steps[bar % steps.length] as readonly [number, number];
          lit.push({ line, cols, from: round(from + bar / cps), to: round(from + (bar + 1) / cps) });
        }
      }
    }
  }
  return lit;
}

/** The middle third of a film, each end moved to the nearest beat of its music when it has some. */
function middleThird(state: Parameters<typeof timelineBeats>[0], length: number): [number, number] {
  const beats = timelineBeats(state).map((b) => b.time);
  const snap = (t: number): number =>
    beats.length === 0 ? round(t) : beats.reduce((best, b) => (Math.abs(b - t) < Math.abs(best - t) ? b : best));
  return [snap(length / 3), snap((2 * length) / 3)];
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Whether a media folder holds a file for an asset id, under any extension. */
function hasMedia(dir: string, id: string): boolean {
  return ["webm", "mp4", "mov", "wav", "mp3", "m4a", "png", "jpg", "jpeg", "svg", "webp", "gif", "cube"].some((ext) =>
    existsSync(join(dir, `${id}.${ext}`)),
  );
}
