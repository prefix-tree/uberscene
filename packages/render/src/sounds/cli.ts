// `uberscene sound` on the command line: the kit listed, or one of its sounds written as a WAV and added.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { addAsset } from "../add";
import { findManifest, MANIFEST_FILE } from "../manifest-file";
import { makeSound, SOUND_KIT } from "./kit";
import { wav } from "./synth";

export interface SoundFlags {
  readonly duration?: string | undefined;
  readonly seed?: string | undefined;
  readonly id?: string | undefined;
  readonly out?: string | undefined;
  readonly manifest?: string | undefined;
  readonly json?: boolean | undefined;
}

/** Lists the kit, or writes one sound; returns the exit code. */
export async function soundCommand(args: readonly string[], flags: SoundFlags, usage: string): Promise<number> {
  if (args.length === 0) {
    const rows = Object.entries(SOUND_KIT).map(([name, s]) => ({
      name,
      kind: s.bed ? "bed" : "cue",
      length: s.length,
      moment: s.moment,
      what: s.what,
    }));
    if (flags.json) process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
    else
      for (const r of rows)
        process.stdout.write(`${r.name.padEnd(9)} ${r.kind}  ${`${r.length} s`.padStart(7)}  ${r.what}\n`);
    return 0;
  }
  if (args.length !== 1) {
    process.stderr.write(usage);
    return 2;
  }
  const name = args[0] as string;
  const number = (flag: string, v: string | undefined) => {
    if (v === undefined) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`--${flag} wants a number, got "${v}"`);
    return n;
  };
  const length = number("duration", flags.duration);
  const seed = number("seed", flags.seed);
  const samples = makeSound(name, {
    ...(length !== undefined ? { length } : {}),
    ...(seed !== undefined ? { seed } : {}),
  });
  const id = flags.id ?? (seed === undefined ? name : `${name}-${seed}`);
  const manifest = resolve(flags.manifest ?? findManifest(process.cwd()).path ?? MANIFEST_FILE);
  const file = resolve(flags.out ?? join(dirname(manifest), "media", `${id}.wav`));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, wav(samples));
  const added = await addAsset(file, { id, manifest, beats: false });
  process.stderr.write(`${id}: ${added.entry.duration} s → ${file}\n`);
  return 0;
}
