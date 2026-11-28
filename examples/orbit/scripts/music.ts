// The orbit film's music: score.ts rendered with Strudel, mastered to -14 LUFS under a -1 dBFS ceiling, and added
// with its grid. The score is the clock: 120 BPM from 0 s, so beat N is at N / 2 seconds, exactly, not detected.
//
//   pnpm --filter @uberscene/example-orbit music     writes media/song.wav, then adds it
//
// The first run installs Strudel into ~/.cache/uberscene/strudel after showing its licence (AGPL-3.0-or-later, not
// part of UberScene). Set UBERSCENE_ACCEPT_LICENCE=strudel to accept it where no one can answer.
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { addAsset, masterGain, renderStrudel, writeStrudelWav } from "@uberscene/render";

import { SCORE } from "../score";

const here = join(import.meta.dirname, "..");
mkdirSync(join(here, "media"), { recursive: true });
const file = join(here, "media", "song.wav");

const render = await renderStrudel(SCORE);
const gain = masterGain(render, -14, -1);
writeStrudelWav(file, render, { gain, ceiling: -1 });
process.stdout.write(
  `song.wav: ${SCORE.seconds} s, ${render.events.length} events, rendered in ${(render.ms / 1000).toFixed(1)} s, gain ${(20 * Math.log10(gain)).toFixed(1)} dB\n`,
);

const added = await addAsset(file, {
  id: "song",
  manifest: join(here, "uberscene.json"),
  bpm: SCORE.bpm,
  firstBeat: 0,
});
process.stdout.write(`song: ${added.entry.beats?.length} beats at ${added.entry.tempo} BPM\n`);
