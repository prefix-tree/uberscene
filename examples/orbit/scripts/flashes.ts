// The lightning in the storm footage, as times: each frame where a flash starts. The film starts a storm shot on a
// snare at one of these times, so the flash is the cut and the snare is the sound of it.
//
//   pnpm --filter @uberscene/example-orbit flashes     writes lightning.ts, which video.tsx imports
//
// A flash is bluish white (city lights are orange) and sudden: the frame where the count of bright, blue-white pixels
// jumps to at least twice the frame before it, by at least 30 pixels at 406×270. The station's arm, white too, covers
// the upper left of the frame, so only the right half and the bottom quarter are counted.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const here = join(import.meta.dirname, "..");
const clip = join(here, "media", "storms.webm");

const W = 406,
  H = 270,
  FPS = 30;
/** Brighter than this (0–255) and no redder than blue: lightning, not a city. */
const BRIGHT = 140;
/** A flash adds at least this many such pixels, and at least doubles them. */
const RISE = 30;
/** Two flashes closer than this are one. */
const APART = 0.3;

const raw = execFileSync(
  "ffmpeg",
  ["-v", "error", "-i", clip, "-vf", `scale=${W}:${H},fps=${FPS}`, "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
  { maxBuffer: 1024 * 1024 * 1024 },
);
const frameBytes = W * H * 3;
const counts: number[] = [];
/** The mean x of each frame's bright pixels, as a fraction of the width: where the lightning is. */
const centres: number[] = [];
for (let f = 0; f * frameBytes < raw.length; f++) {
  let n = 0,
    sx = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (x < W * 0.55 && y < H * 0.75) continue;
      const i = f * frameBytes + (y * W + x) * 3;
      const r = raw[i] as number,
        g = raw[i + 1] as number,
        b = raw[i + 2] as number;
      if (0.299 * r + 0.587 * g + 0.114 * b > BRIGHT && b >= r - 5) {
        n++;
        sx += x;
      }
    }
  counts.push(n);
  centres.push(n > 0 ? sx / n / W : 0.5);
}

const flashes: { time: number; pixels: number; x: number }[] = [];
for (let f = 1; f < counts.length; f++) {
  const now = counts[f] as number;
  const before = counts[f - 1] as number;
  if (now - before < RISE || now < 2 * before) continue;
  const time = Math.round((f / FPS) * 1000) / 1000;
  const last = flashes[flashes.length - 1];
  if (last && time - last.time < APART) continue;
  flashes.push({ time, pixels: now, x: Math.round((centres[f] as number) * 100) / 100 });
}

writeFileSync(
  join(here, "lightning.ts"),
  `// Written by scripts/flashes.ts from media/storms.webm: the second each lightning flash starts, how many bright
// pixels it adds, and where it is across the frame (0 left, 1 right), for the crop to centre on.
// Run \`pnpm --filter @uberscene/example-orbit flashes\` to find them again.
export const LIGHTNING: readonly { readonly time: number; readonly pixels: number; readonly x: number }[] = ${JSON.stringify(flashes)};
`,
);
process.stdout.write(
  `lightning.ts: ${flashes.length} flashes in storms.webm, at ${flashes.map((f) => f.time).join(", ")} s\n`,
);
