// Sound cues for the shorts, made in code by the sound kit of @uberscene/render (`uberscene sound`), so they are ours
// to share under the repository's licence. The same code writes the same bytes on every machine, which the shorts
// test checks against the committed files.
//
//   pnpm --filter @uberscene/example-shorts sounds           writes the cues that are missing
//   pnpm --filter @uberscene/example-shorts sounds --force   writes them all again
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { makeSound, soundWav } from "@uberscene/render";

/** The cues the shorts use, by the asset id each is added under. */
const CUES = ["tick", "click", "pop", "whoosh", "swish", "riser", "thud", "chime"] as const;

export const SOUNDS: Record<string, () => Float32Array> = Object.fromEntries(
  CUES.map((id) => [id, () => makeSound(id)]),
);

/** A mono 16-bit PCM WAV file of the samples. */
export const wav = (samples: Float32Array): Buffer => soundWav(samples);

if (import.meta.filename === process.argv[1]) {
  const force = process.argv.includes("--force");
  for (const [id, synth] of Object.entries(SOUNDS)) {
    const file = join(import.meta.dirname, `${id}.wav`);
    if (existsSync(file) && !force) continue;
    writeFileSync(file, wav(synth()));
    process.stdout.write(`${id}.wav\n`);
  }
}
