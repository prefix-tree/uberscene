// The nature film's media: the footage and recordings in sources.ts fetched into media/ (each stretch only, with where
// it came from on its manifest entry), the score rendered with Strudel and added on its grid, then CREDITS.md.
//
//   pnpm --filter @uberscene/example-nature prepare-media           everything that is missing
//   pnpm --filter @uberscene/example-nature prepare-media --music   the score again
//
// Needs PIXABAY_API_KEY and FREESOUND_API_KEY (free keys; see `uberscene find --help`) and ffmpeg with libvpx-vp9.
// Strudel is fetched on first use after its licence (AGPL-3.0-or-later); UBERSCENE_ACCEPT_LICENCE=strudel accepts it.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { addAsset, fetchStock, masterGain, renderStrudel, stockCredits, writeStrudelWav } from "@uberscene/render";
import type { AssetManifest } from "@uberscene/sdk";

import { SCORE } from "../score";
import { FOOTAGE, SOUNDS } from "../sources";

const here = join(import.meta.dirname, "..");
const media = join(here, "media");
const manifest = join(here, "uberscene.json");
mkdirSync(media, { recursive: true });
if (!existsSync(manifest)) writeFileSync(manifest, `${JSON.stringify({ assets: {} }, null, 2)}\n`);
const onlyMusic = process.argv.includes("--music");
/** The cues, levelled louder than the places they are laid over. */
const CUES = new Set(["whoosh", "braam", "wings"]);

/** A sound file's integrated loudness and its sample peak, from ffmpeg's EBU R128 meter (its report is on stderr). */
function measure(file: string): { lufs: number; peak: number } {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "ebur128=peak=sample", "-f", "null", "-"], {
    encoding: "utf8",
  });
  const summary = run.stderr.slice(run.stderr.lastIndexOf("Summary"));
  const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1] ?? -70);
  const peak = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1] ?? -70);
  return { lufs, peak };
}

const have = (id: string): boolean => id in (JSON.parse(readFileSync(manifest, "utf8")) as AssetManifest).assets;

if (!onlyMusic)
  for (const s of [...FOOTAGE, ...SOUNDS]) {
    if (have(s.id)) continue;
    const r = await fetchStock(s.ref, {
      id: s.id,
      manifest,
      dir: media,
      from: s.from,
      to: s.to,
      height: 1080,
      log: (m) => process.stdout.write(`${m}\n`),
    });
    process.stdout.write(
      `${s.id}: ${r.entry.duration} s${r.entry.onset !== undefined ? `, onset ${r.entry.onset} s` : ""}\n`,
    );
  }

// Every recording at one loudness, so the film's volumes mean the same for each: places at -23 LUFS, cues at -18,
// raised or lowered by a plain gain that never takes a peak past -1 dBFS. Recorded levels differ by 25 dB or more.
if (!onlyMusic)
  for (const s of SOUNDS) {
    const file = join(media, `${s.id}.wav`);
    const target = CUES.has(s.id) ? -18 : -23;
    const { lufs, peak } = measure(file);
    const gain = Math.min(target - lufs, -1 - peak);
    if (Math.abs(gain) < 0.5) continue;
    const tmp = `${file}.level.wav`;
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-af", `volume=${gain.toFixed(2)}dB`, tmp]);
    renameSync(tmp, file);
    await addAsset(file, { id: s.id, manifest, beats: false });
    process.stdout.write(`${s.id}: ${lufs.toFixed(1)} LUFS, ${gain > 0 ? "+" : ""}${gain.toFixed(1)} dB\n`);
  }

if (onlyMusic || !have("score")) {
  const render = await renderStrudel(SCORE);
  const file = join(media, "score.wav");
  writeStrudelWav(file, render, { gain: masterGain(render, -16, -1), ceiling: -1 });
  const added = await addAsset(file, { id: "score", manifest, bpm: SCORE.bpm, firstBeat: 0 });
  process.stdout.write(`score: ${added.entry.duration} s, ${render.events.length} events\n`);
}

writeFileSync(
  join(here, "CREDITS.md"),
  `# Credits\n\nWritten by \`scripts/prepare.ts\` from what it fetched. The footage is from Pixabay (the Pixabay Content License) and the recordings from Freesound (CC0); none of it is committed. The score is \`score.ts\`, under the repository's licence; Strudel, which renders it, is fetched on first use.\n\n${stockCredits(JSON.parse(readFileSync(manifest, "utf8")) as AssetManifest)}\n`,
);
process.stdout.write("CREDITS.md\n");
