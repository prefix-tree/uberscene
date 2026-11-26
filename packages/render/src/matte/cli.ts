// `uberscene matte`, `uberscene matte models` and `uberscene matte install` on the command line.
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";

import {
  acceptLicence,
  cachedModelPath,
  ensureModel,
  LicenceNotAccepted,
  licenceAccepted,
  licenceNotice,
  type MatteModel,
  matteModel,
  matteModels,
} from "./models";
import { type MatteResult, makeMatte } from "./run";

export interface MatteFlags {
  readonly model?: string | undefined;
  readonly "accept-licence"?: boolean | undefined;
  readonly force?: boolean | undefined;
  readonly json?: boolean | undefined;
  readonly manifest?: string | undefined;
  readonly id?: string | undefined;
  readonly quiet?: boolean | undefined;
}

const say = (m: string) => process.stderr.write(`${m}\n`);

/** Runs one of the matte commands; returns the exit code. */
export async function matteCommand(args: readonly string[], flags: MatteFlags, usage: string): Promise<number> {
  const log = flags.quiet ? () => undefined : say;
  if (args[0] === "models" && args.length === 1) {
    const models = matteModels().map((m) => ({
      name: m.name,
      title: m.title,
      licence: m.licence,
      mb: Math.round(m.bytes / 1e6),
      default: m.default === true,
      downloaded: existsSync(cachedModelPath(m)),
    }));
    if (flags.json) process.stdout.write(`${JSON.stringify(models, null, 2)}\n`);
    else
      for (const m of models)
        process.stdout.write(
          `${m.name.padEnd(16)} ${m.licence.padEnd(11)} ${`${m.mb} MB`.padStart(7)}  ${m.downloaded ? "downloaded" : "          "}  ${m.title}${m.default ? "  (default)" : ""}\n`,
        );
    return 0;
  }
  if (args[0] === "install" && args.length <= 2) {
    const model = matteModel(args[1] ?? flags.model, matteModels());
    if (!(await agreed(model, flags))) return 2;
    say(`${model.name} is at ${await ensureModel(model, { log })}`);
    return 0;
  }
  if (args.length !== 1) {
    process.stderr.write(usage);
    return 2;
  }
  const model = matteModel(flags.model, matteModels());
  if (!(await agreed(model, flags))) return 2;
  let result: MatteResult;
  try {
    result = await makeMatte(args[0] as string, {
      ...(flags.model ? { model: flags.model } : {}),
      ...(flags.manifest ? { manifest: flags.manifest } : {}),
      ...(flags.id ? { id: flags.id } : {}),
      ...(flags.force ? { force: true } : {}),
      log,
    });
  } catch (error) {
    if (error instanceof LicenceNotAccepted) {
      say(error.message);
      return 2;
    }
    throw error;
  }
  for (const w of result.warnings) say(`warning: ${w}`);
  if (flags.json) {
    const { model: m, ...rest } = result;
    process.stdout.write(
      `${JSON.stringify({ ...rest, model: { name: m.name, licence: m.licence, sha256: m.sha256 } }, null, 2)}\n`,
    );
  } else process.stdout.write(`${describeMatte(result)}\n`);
  return 0;
}

/**
 * Whether the model's licence is accepted: already, by `--accept-licence`, or by the person at the terminal. Shows the
 * licence the first time; with no one to ask, says how to accept it and returns false.
 */
async function agreed(model: MatteModel, flags: MatteFlags): Promise<boolean> {
  if (licenceAccepted(model)) return true;
  if (flags["accept-licence"]) {
    say(licenceNotice(model));
    acceptLicence(model);
    return true;
  }
  if (!process.stdin.isTTY || !process.stderr.isTTY) {
    say(new LicenceNotAccepted(model).message);
    return false;
  }
  say(licenceNotice(model));
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = (await rl.question(`Accept ${model.licence} and download ${model.name}? [y/N] `)).trim().toLowerCase();
  rl.close();
  if (answer !== "y" && answer !== "yes") return false;
  acceptLicence(model);
  return true;
}

/** What a matte run printed: the file, the model, its speed, and what can be measured of the matte. */
function describeMatte(r: MatteResult): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  return [
    `${r.file}: ${r.frames} frames, ${r.width}x${r.height}, matte of ${r.footage} as ${r.id} in ${r.manifest}`,
    `  ${r.model.name} (${r.model.licence}), ${r.backend}: ${r.perFrame.toFixed(2)} s a frame, ${r.seconds.toFixed(0)} s in all`,
    `  soft edge ${pct(r.soft.mean)} (most ${pct(r.soft.max)}), change between frames ${pct(r.change.mean)} (most ${pct(r.change.max)} at ${r.change.at.toFixed(2)} s), subject ${pct(r.coverage)} of the picture`,
  ].join("\n");
}
