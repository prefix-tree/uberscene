// The matting models `uberscene matte` knows: where each one is published, its checksum and licence, and how to feed
// it. UberScene ships this list, not the models: a model is fetched from its own source on first use, after its
// licence has been shown and accepted, and kept in a cache.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { packageRoot } from "../native/codecs";

const modelSchema = z.strictObject({
  /** What it is, in a few words. */
  title: z.string(),
  /** Where its file is published: https, or file: for a model of your own. */
  source: z.string().regex(/^(https|file):/, "a model's source is an https or file URL"),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes: z.number().int().positive(),
  /** The licence's SPDX name, and where to read it. */
  licence: z.string(),
  licenceUrl: z.string(),
  /** The one used when `--model` is left out. */
  default: z.boolean().optional(),
  /** The input that takes the frame (RGB, NCHW, 0..1 before `normalize`), and the output that gives alpha. */
  input: z.string(),
  output: z.string(),
  /** A fixed input size (width, height) the frame is resized to; left out, the frame goes in at its own size. */
  size: z.tuple([z.number().int().positive(), z.number().int().positive()]).optional(),
  /** Per channel: divide by the frame's largest value first (`scaleToMax`), then subtract `mean` and divide by `std`. */
  normalize: z
    .strictObject({
      scaleToMax: z.boolean().optional(),
      mean: z.tuple([z.number(), z.number(), z.number()]),
      std: z.tuple([z.number(), z.number(), z.number()]),
    })
    .optional(),
  /** Stretch the output to 0..1 by its own lowest and highest value (a model whose output is not a matte as is). */
  stretch: z.boolean().optional(),
  /** The input that takes how much the model shrinks the frame inside it (RobustVideoMatting's `downsample_ratio`). */
  downsampleRatio: z.string().optional(),
  /** State the model carries from one frame to the next: its inputs, the outputs that feed them, and warm-up passes. */
  recurrent: z
    .strictObject({
      inputs: z.array(z.string()).min(1),
      outputs: z.array(z.string()).min(1),
      warmup: z.number().int().nonnegative().default(0),
    })
    .refine((r) => r.inputs.length === r.outputs.length, "a recurrent model has one output for each state input")
    .optional(),
});
export type MatteModel = z.infer<typeof modelSchema> & { readonly name: string };

const registrySchema = z.record(
  z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "model names are lowercase-with-dashes"),
  modelSchema,
);

/**
 * Every model: the ones this package lists (`models.json`), with the ones in `UBERSCENE_MODEL_REGISTRY`, a JSON file of
 * the same shape, added or replacing them. Throws, saying which entry is wrong, on a list that does not parse.
 */
export function matteModels(env: NodeJS.ProcessEnv = process.env, root = packageRoot()): readonly MatteModel[] {
  const read = (file: string): Record<string, z.infer<typeof modelSchema>> => {
    const parsed = registrySchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
    if (!parsed.success)
      throw new Error(
        `${file} is not a list of matting models: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      );
    return parsed.data;
  };
  const all = {
    ...read(join(root, "models.json")),
    ...(env.UBERSCENE_MODEL_REGISTRY ? read(env.UBERSCENE_MODEL_REGISTRY) : {}),
  };
  return Object.entries(all).map(([name, m]) => ({ ...m, name }));
}

/** The model named, or the default; throws with the names there are. */
export function matteModel(name: string | undefined, models: readonly MatteModel[]): MatteModel {
  const found = name ? models.find((m) => m.name === name) : (models.find((m) => m.default) ?? models[0]);
  if (!found)
    throw new Error(`no matting model ${name ? `"${name}"` : ""}; there are: ${models.map((m) => m.name).join(", ")}`);
  return found;
}

/** Where models live: `UBERSCENE_MODEL_CACHE`, else `~/.cache/uberscene/models`; one folder per model. */
function modelCacheDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.UBERSCENE_MODEL_CACHE ?? join(homedir(), ".cache", "uberscene", "models");
}

/** The model's file in the cache, named by its checksum, so a new version of a model is a new file. */
export function cachedModelPath(model: MatteModel, env: NodeJS.ProcessEnv = process.env): string {
  return join(modelCacheDir(env), model.name, `${model.sha256}.onnx`);
}

/** Who accepted a model's licence, and when: kept beside the model in the cache. */
function acceptancePath(model: MatteModel, env: NodeJS.ProcessEnv): string {
  return join(modelCacheDir(env), model.name, "accepted.json");
}

/** Whether this model's licence has been accepted on this machine (for this exact file). */
export function licenceAccepted(model: MatteModel, env: NodeJS.ProcessEnv = process.env): boolean {
  const file = acceptancePath(model, env);
  if (existsSync(file)) {
    const record = JSON.parse(readFileSync(file, "utf8")) as { sha256?: string; licence?: string };
    if (record.sha256 === model.sha256 && record.licence === model.licence) return true;
  }
  return (env.UBERSCENE_ACCEPT_LICENCE ?? "")
    .split(",")
    .map((s) => s.trim())
    .includes(model.name);
}

/** Records that this model's licence was accepted, so it is not asked again. */
export function acceptLicence(model: MatteModel, env: NodeJS.ProcessEnv = process.env): void {
  const file = acceptancePath(model, env);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    `${JSON.stringify({ model: model.name, licence: model.licence, sha256: model.sha256, at: new Date().toISOString() }, null, 2)}\n`,
  );
}

/** What is shown before a model is fetched the first time. */
export function licenceNotice(model: MatteModel): string {
  const mb = Math.round(model.bytes / 1e6);
  return [
    `${model.name} (${model.title}) is licensed ${model.licence}: ${model.licenceUrl}`,
    `UberScene does not ship it: it is downloaded from ${model.source} (${mb} MB) into ${modelCacheDir()} and run on your machine.`,
    "Running it and using the mattes it makes carries no conditions; passing the model file on does, under its licence.",
  ].join("\n");
}

/** Thrown when a model's licence has not been accepted and there is no one to ask. */
export class LicenceNotAccepted extends Error {
  constructor(readonly model: MatteModel) {
    super(`${licenceNotice(model)}\nRerun with --accept-licence to accept it and download the model.`);
  }
}

/**
 * The model's file, fetched into the cache first if it is not there: checked against its SHA-256, written beside its
 * place and renamed, so a second run meanwhile never finds half a file. Its licence must have been accepted.
 */
export async function ensureModel(
  model: MatteModel,
  options: {
    readonly log?: (message: string) => void;
    readonly fetch?: typeof fetch;
    readonly env?: NodeJS.ProcessEnv;
  } = {},
): Promise<string> {
  const env = options.env ?? process.env;
  const log = options.log ?? (() => undefined);
  const path = cachedModelPath(model, env);
  if (existsSync(path)) return path;
  if (!licenceAccepted(model, env)) throw new LicenceNotAccepted(model);
  log(`downloading ${model.name} (${Math.round(model.bytes / 1e6)} MB, ${model.licence}) from ${model.source} (once)`);
  const bytes = model.source.startsWith("file:")
    ? readFileSync(fileURLToPath(model.source))
    : await download(model, options.fetch ?? fetch, log);
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== model.sha256)
    throw new Error(`the file at ${model.source} is not ${model.name} (sha256 ${actual}, expected ${model.sha256})`);
  mkdirSync(dirname(path), { recursive: true });
  const partial = `${path}.${process.pid}.partial`;
  writeFileSync(partial, bytes);
  renameSync(partial, path);
  return path;
}

/** The model's bytes from its source, with its progress every 10%. */
async function download(model: MatteModel, get: typeof fetch, log: (message: string) => void): Promise<Buffer> {
  const response = await get(model.source);
  if (!response.ok || !response.body)
    throw new Error(`cannot download ${model.name}: ${model.source} answered ${response.status}`);
  const chunks: Uint8Array[] = [];
  let got = 0;
  let said = 0;
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
    got += chunk.length;
    const tenth = Math.floor((got / model.bytes) * 10);
    if (tenth > said && tenth < 10) {
      said = tenth;
      log(`${model.name}: ${tenth * 10}%`);
    }
  }
  return Buffer.concat(chunks);
}
