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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  liftoff: {
    file: "liftoff/video.tsx",
    needs: "pnpm --filter @uberscene/example-liftoff prepare-media",
    reveal: [16, 24],
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

  // 1. The film, as it is, rendered again only when its file or its manifest changed.
  const code = readFileSync(file, "utf8");
  const hash = createHash("sha256").update(code).update(JSON.stringify(video.manifest)).digest("hex").slice(0, 12);
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
  for (const [kind, page, extra] of [
    ["code", "frame.tsx", props],
    ["reveal", "reveal.tsx", { film: id, width, height, length, code, lit, file: basename(file), split, back }],
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
