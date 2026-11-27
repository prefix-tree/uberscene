// The moment each launch clip lights: the first frame where the engines' fire shows. The film starts those shots on a
// beat at that frame, so the ignition is the cut and the music's hit is the sound of it.
//
//   pnpm --filter @uberscene/example-liftoff ignition     writes ignitions.ts, which video.tsx imports
//
// Fire is near white and yellow, brighter than anything else in a launch frame. The count of such pixels is taken
// in the clip's lower part (where the pad is), at 320×180; the ignition is the first frame where that count rises
// past a fixed share of the area and stays there, measured against the clip's first second.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { IGNITE } from "./sources";

const here = join(import.meta.dirname, "..");

const W = 320,
  H = 180,
  FPS = 30;
/** Brighter than this (0–255), and no bluer than red: fire. */
const BRIGHT = 215;
/** The fire covers at least this share of the counted area, above the first second's level. */
const SHARE = 0.004;
/** It stays lit this many frames. */
const HOLD = 6;

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
  const area = ((x1 as number) - (x0 as number)) * ((y1 as number) - (y0 as number));
  const counts: number[] = [];
  for (let f = 0; f * frame < raw.length; f++) {
    let n = 0;
    for (let y = y0 as number; y < (y1 as number); y++)
      for (let x = x0 as number; x < (x1 as number); x++) {
        const i = f * frame + (y * W + x) * 3;
        const r = raw[i] as number,
          g = raw[i + 1] as number,
          b = raw[i + 2] as number;
        if (0.299 * r + 0.587 * g + 0.114 * b > BRIGHT && r >= b) n++;
      }
    counts.push(n);
  }
  const base = Math.max(...counts.slice(0, FPS));
  const lit = (f: number): boolean => (counts[f] as number) > base + SHARE * area;
  const f = counts.findIndex(
    (_, i) => i > FPS / 2 && Array.from({ length: HOLD }, (_, k) => lit(i + k)).every(Boolean),
  );
  if (f < 0) throw new Error(`${id}: no ignition found (counts peak at ${Math.max(...counts)} of ${area})`);
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
