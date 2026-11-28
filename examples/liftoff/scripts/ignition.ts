// The moment each launch clip lights: the first frame where the engines' fire shows. The film starts those shots on a
// beat at that frame, so the ignition is the cut and the music's hit is the sound of it.
//
//   pnpm --filter @uberscene/example-liftoff ignition     writes ignitions.ts, which video.tsx imports
//
// Fire is warm and bright: orange to white, redder than it is blue. The count of such pixels is taken in the part of
// the frame where the engines are, at 320×180. The ignition is the first frame where that count jumps: where its rise
// over the next tenth of a second is at least a third of the clip's biggest such rise. That is the burst a viewer
// sees, not the moment the frame turns white, which comes later.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { IGNITE } from "./sources";

const here = join(import.meta.dirname, "..");

const W = 320,
  H = 180,
  FPS = 30;
/** Brighter than this (0–255), and redder than blue by this much: fire. */
const BRIGHT = 120;
const WARM = 40;
/** The rise is measured over this many frames. */
const SPAN = 3;
/** The share of the biggest rise that counts as the burst. */
const BURST = 1 / 3;

const found: Record<string, number> = {};
for (const { id, region } of IGNITE) {
  const raw = execFileSync(
    "ffmpeg",
    [
      ...["-v", "error", "-i", join(here, "media", `${id}.webm`)],
      ...["-vf", `scale=${W}:${H},fps=${FPS}`, "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
    ],
    { maxBuffer: 1024 * 1024 * 1024 },
  );
  const frame = W * H * 3;
  const [x0, y0, x1, y1] = region.map((v, i) => Math.round(v * (i % 2 === 0 ? W : H)));
  const counts: number[] = [];
  for (let f = 0; f * frame < raw.length; f++) {
    let n = 0;
    for (let y = y0 as number; y < (y1 as number); y++)
      for (let x = x0 as number; x < (x1 as number); x++) {
        const i = f * frame + (y * W + x) * 3;
        const r = raw[i] as number,
          g = raw[i + 1] as number,
          b = raw[i + 2] as number;
        if (0.299 * r + 0.587 * g + 0.114 * b > BRIGHT && r - b > WARM) n++;
      }
    counts.push(n);
  }
  const rise = counts.map((c, i) => (counts[i + SPAN] ?? c) - c);
  const most = Math.max(...rise);
  const f = rise.findIndex((r) => r >= BURST * most);
  if (most <= 0 || f < 0) throw new Error(`${id}: no ignition found`);
  found[id] = Math.round((f / FPS) * 1000) / 1000;
  process.stdout.write(`${id}: lights at ${found[id]} s\n`);
}

writeFileSync(
  join(here, "ignitions.ts"),
  `// Written by scripts/ignition.ts from media/: the second each launch clip's engines light, in seconds of its file.
// Run \`pnpm --filter @uberscene/example-liftoff ignition\` to find them again.
export const IGNITIONS: Readonly<Record<string, number>> = ${JSON.stringify(found, null, 2)};
`,
);
