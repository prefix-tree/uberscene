// The footage the weekly codec check cuts from: `phone.mp4`, a phone-style HEVC clip, and `master.mov`, a ProRes clip, two formats Chrome cannot
// read everywhere, so the native decoder reads them; plus a tone for the sound. Made with ffmpeg, on Linux, once per
// run; the check's other jobs download them. `tsx scripts/codec-media.ts <folder>`.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2];
if (!out) throw new Error("usage: tsx scripts/codec-media.ts <folder>");
mkdirSync(out, { recursive: true });

/** Each clip: 3 s of a moving test picture, 640×360 at 30 fps, no sound. */
const PICTURE = ["-f", "lavfi", "-i", "testsrc2=size=640x360:rate=30:duration=3"];
const CLIPS: Readonly<Record<string, readonly string[]>> = {
  "phone.mp4": [
    ...PICTURE,
    "-c:v",
    "libx265",
    "-tag:v",
    "hvc1",
    "-pix_fmt",
    "yuv420p",
    "-x265-params",
    "log-level=error",
  ],
  "master.mov": [...PICTURE, "-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le"],
  "tone.ogg": ["-f", "lavfi", "-i", "sine=frequency=660:sample_rate=48000:duration=12", "-c:a", "libopus"],
};

for (const [name, args] of Object.entries(CLIPS)) {
  const file = join(out, name);
  if (existsSync(file)) continue;
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args, file], { stdio: "inherit" });
  process.stdout.write(`${name}\n`);
}
