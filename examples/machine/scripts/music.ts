// The machine's music and its notes: score.ts rendered with Strudel, mastered to -14 LUFS under a -1 dBFS ceiling and
// added with its grid (120 BPM from 0 s, so beat N is at N / 2 seconds, exactly), then each voice's notes written to
// notes.ts, which the film draws from.
//
//   pnpm --filter @uberscene/example-machine music     writes media/song.wav and notes.ts, then adds the song
//
// The first run installs Strudel into ~/.cache/uberscene/strudel after showing its licence (AGPL-3.0-or-later, not
// part of UberScene). Set UBERSCENE_ACCEPT_LICENCE=strudel to accept it where no one can answer.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { addAsset, masterGain, renderStrudel, type StrudelEvent, writeStrudelWav } from "@uberscene/render";

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

// The notes, a voice at a time. A voice made of several sounds (the snare's noise and body, a chord's notes) plays
// them at the same moment: the film needs the moment once.
const r3 = (v: number): number => Math.round(v * 1000) / 1000;
const of = (voice: string, each: (e: StrudelEvent) => string = () => ""): StrudelEvent[] => {
  const seen = new Set<string>();
  return render.events
    .filter((e) => e.voice === voice && !seen.has(`${r3(e.time)} ${each(e)}`) && seen.add(`${r3(e.time)} ${each(e)}`))
    .sort((a, b) => a.time - b.time);
};
const STEPS: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
/** A note name as a MIDI number: `ab1` is 32, `c5` is 72. */
const midi = (note: StrudelEvent["note"]): number => {
  if (typeof note === "number") return note;
  const m = /^([a-g])([b#]?)(-?\d+)$/.exec((note ?? "").toLowerCase());
  if (!m) throw new Error(`not a note: ${note}`);
  return (STEPS[m[1] as string] as number) + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0) + 12 * (Number(m[3]) + 1);
};

/** How loud a note is beside the loudest of its voice, 0 to 1. */
const level = (list: readonly StrudelEvent[]): ((e: StrudelEvent) => number) => {
  const top = Math.max(...list.map((e) => e.gain));
  return (e) => Math.round((e.gain / top) * 100) / 100;
};
const hats = of("hats");
const lead = of("lead", (e) => String(e.note));
const notes = {
  kick: of("kick").map((e) => r3(e.time)),
  snare: of("snare").map((e) => r3(e.time)),
  hats: hats.map((e) => ({ time: r3(e.time), level: level(hats)(e) })),
  bass: of("bass").map((e) => ({ time: r3(e.time), note: String(e.note).toLowerCase(), midi: midi(e.note) })),
  // A chord a bar, so the bar says which.
  chords: of("chords").map((e) => ({ time: r3(e.time), length: r3(e.duration), chord: Math.floor(e.time / 2) % 4 })),
  // The lead and its answer can sound together: a note is its moment and its pitch.
  lead: lead.map((e) => ({ time: r3(e.time), midi: midi(e.note), level: level(lead)(e) })),
};
for (const [voice, list] of Object.entries(notes))
  if (list.length === 0) throw new Error(`the score has no notes for the voice "${voice}"`);

writeFileSync(
  join(here, "notes.ts"),
  `// Written by scripts/music.ts from score.ts: the notes each voice plays, in seconds, as Strudel rendered them. The
// film draws from these, so every part moves on the note that sounds.
// Run \`pnpm --filter @uberscene/example-machine music\` to write them again.
export const NOTES = ${JSON.stringify(notes)} as const;
`,
);
process.stdout.write(
  `notes.ts: ${Object.entries(notes)
    .map(([voice, list]) => `${voice} ${list.length}`)
    .join(", ")}\n`,
);
