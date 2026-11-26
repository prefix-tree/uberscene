// `uberscene matte`: a footage file in, its matte beside it, and both in the manifest. The model runs in the export's
// headless Chrome, on a page of its own (page.ts) that this module serves with the footage, the model and the two
// libraries it loads.
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import { availableParallelism } from "node:os";
import { basename, dirname, extname, join, normalize } from "node:path";

import type { AssetManifest } from "@uberscene/sdk";

import { addAsset, probe } from "../add";
import { writeAtomically } from "../atomic";
import { findChrome } from "../web/chrome";
import { FLAGS } from "../web/engine";
import { ensureModel, type MatteModel, matteModel, matteModels } from "./models";
import { MATTE_PAGE, type MatteJob, type MatteSummary } from "./page";

export interface MatteOptions {
  /** The model's name; default the registry's default. */
  readonly model?: string;
  /** The manifest to write; default the one `add` would use. */
  readonly manifest?: string;
  /** The footage's asset id; default its file name without the extension, as `add` names it. */
  readonly id?: string;
  /** Replace a matte that is already there. */
  readonly force?: boolean;
  /** The folder ONNX Runtime is looked for from (its node_modules); default the footage's folder, then the working one. */
  readonly cwd?: string;
  readonly log?: (message: string) => void;
}

export interface MatteResult extends MatteSummary {
  /** The matte file written, and its asset id. */
  readonly file: string;
  readonly id: string;
  readonly footage: string;
  readonly model: MatteModel;
  readonly manifest: string;
  /** Seconds the whole run took. */
  readonly seconds: number;
  readonly warnings: readonly string[];
}

/** Bytes read from the page at a time (base64 in a string). */
const READ_CHUNK = 4 * 1024 * 1024;

/**
 * Makes the matte of a footage file: runs the model on every frame in Chrome, writes `<name>.matte.webm` beside the
 * footage (one frame for each of the footage's, at its rate and size), adds it to the manifest as `<id>.matte`, and
 * sets `matte`, `matteModel` and `subjects` on the footage's entry, adding the footage first if it is not there.
 */
export async function makeMatte(footage: string, options: MatteOptions = {}): Promise<MatteResult> {
  const started = Date.now();
  const log = options.log ?? (() => undefined);
  if (!existsSync(footage)) throw new Error(`${footage} does not exist`);
  const probed = await probe(footage);
  if (probed.kind !== "video")
    throw new Error(
      `${basename(footage)} is ${probed.kind === "image" ? "an image" : `a ${probed.kind}`}: a matte is made of video`,
    );
  const id = options.id ?? basename(footage, extname(footage));
  const file = join(dirname(footage), `${id}.matte.webm`);
  if (existsSync(file) && !options.force) throw new Error(`${file} is already there: pass --force to make it again`);
  const model = matteModel(options.model, matteModels());
  const modelPath = await ensureModel(model, { log });
  const ort = onnxRuntimeDist(options.cwd ?? dirname(footage));

  const server = await serve({ footage, model: modelPath, ort });
  const { chromium } = (await import("playwright-core")) as unknown as {
    chromium: { launch(o: object): Promise<{ newPage(): Promise<MattePage>; close(): Promise<void> }> };
  };
  const browser = await chromium.launch({ headless: true, args: FLAGS, executablePath: await findChrome({ log }) });
  const warnings: string[] = [];
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e: Error) => errors.push(e.message));
    page.on("console", (m: { text(): string }) => {
      const [tag, frames, perFrame] = m.text().split(" ");
      if (tag === "matte-progress") log(`${id}: ${frames} frames, ${perFrame} s a frame`);
    });
    await page.goto(server.url);
    await page.waitForFunction("window.__matte !== undefined", undefined, { timeout: 60_000 }).catch(() => {
      throw new Error(`the matte page did not load${errors.length ? `: ${errors.join("; ")}` : ""}`);
    });
    log(`${id}: running ${model.name} (${model.licence}) on ${probed.width}x${probed.height} at ${probed.fps} fps`);
    const job: MatteJob = {
      model: {
        input: model.input,
        output: model.output,
        size: model.size,
        normalize: model.normalize,
        stretch: model.stretch,
        downsampleRatio: model.downsampleRatio,
        recurrent: model.recurrent,
      },
      threads: Math.min(8, availableParallelism()),
      subjectEvery: 0.5,
    };
    const summary = await page.evaluate((j: MatteJob) => window.__matte!.run(j), job);
    const bytes = new Uint8Array(summary.bytes);
    for (let offset = 0; offset < summary.bytes; offset += READ_CHUNK) {
      const part = await page.evaluate(({ o, n }: { o: number; n: number }) => window.__matte!.read(o, n), {
        o: offset,
        n: READ_CHUNK,
      });
      bytes.set(Buffer.from(part, "base64"), offset);
    }
    await writeAtomically(file, bytes);
    if (summary.coverage < 0.01)
      warnings.push(`${model.name} found almost no subject in ${basename(footage)} (under 1% of the picture)`);
    if (summary.coverage > 0.9)
      warnings.push(`${model.name} kept over 90% of the picture of ${basename(footage)}: check the matte`);
    if (summary.frames === 0) throw new Error(`no frames were decoded from ${footage}`);
    const manifest = await record(footage, file, id, model, summary, options.manifest);
    return {
      ...summary,
      file,
      id: `${id}.matte`,
      footage: id,
      model,
      manifest,
      seconds: (Date.now() - started) / 1000,
      warnings,
    };
  } finally {
    await browser.close();
    await server.close();
  }
}

interface MattePage {
  on(event: string, listener: (value: never) => void): void;
  goto(url: string): Promise<unknown>;
  waitForFunction(fn: string, arg?: unknown, options?: { timeout: number }): Promise<unknown>;
  evaluate<T, A>(fn: (arg: A) => T | Promise<T>, arg: A): Promise<T>;
}

/** The matte and the footage in the manifest: the matte as an asset, and on the footage `matte`, `matteModel`, `subjects`. */
async function record(
  footage: string,
  file: string,
  id: string,
  model: MatteModel,
  summary: MatteSummary,
  manifestOption: string | undefined,
): Promise<string> {
  const footageEntry = await addAsset(footage, { id, ...(manifestOption ? { manifest: manifestOption } : {}) });
  const path = footageEntry.manifest;
  await addAsset(file, { id: `${id}.matte`, manifest: path });
  const manifest = JSON.parse(readFileSync(path, "utf8")) as AssetManifest;
  const entry = manifest.assets[id];
  if (!entry) throw new Error(`${id} is missing from ${path} after adding it`);
  const subjects = summary.subjects.map((s) => ({
    t: s.at,
    x: round(s.x),
    y: round(s.y),
    w: round(s.w),
    h: round(s.h),
  }));
  const next: AssetManifest = {
    ...manifest,
    assets: {
      ...manifest.assets,
      [id]: {
        ...entry,
        matte: `${id}.matte`,
        matteModel: { name: model.name, sha256: model.sha256 },
        ...(subjects.length ? { subjects } : {}),
      },
    },
  };
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`);
  return path;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Where ONNX Runtime for the web keeps its files: looked for from `cwd` (the user's project), then from this package.
 * It is an optional dependency: missing, the error says how to add it.
 */
function onnxRuntimeDist(cwd: string): string {
  for (const from of [join(cwd, "noop.js"), join(process.cwd(), "noop.js"), import.meta.url]) {
    try {
      // Its package.json is not exported: find the package's folder from its entry.
      let dir = dirname(createRequire(from).resolve("onnxruntime-web"));
      while (!existsSync(join(dir, "package.json")) && dirname(dir) !== dir) dir = dirname(dir);
      const dist = join(dir, "dist");
      if (existsSync(join(dist, "ort.min.mjs"))) return dist;
    } catch {
      // Not from here; the next place.
    }
  }
  throw new Error(
    "uberscene matte runs the model with ONNX Runtime for the web, which is not installed: run `npm i -D onnxruntime-web`",
  );
}

/** mediabunny's browser module, the one the export page bundles. */
function mediabunnyModule(): string {
  const entry = createRequire(import.meta.url).resolve("mediabunny");
  let dir = dirname(entry);
  while (!existsSync(join(dir, "package.json"))) dir = dirname(dir);
  return join(dir, "dist", "bundles", "mediabunny.mjs");
}

const TYPES: Readonly<Record<string, string>> = {
  ".mjs": "text/javascript",
  ".js": "text/javascript",
  ".wasm": "application/wasm",
};

/**
 * The page, the footage, the model and the libraries, on a local port only the matte's browser uses. Cross-origin
 * isolated, so ONNX Runtime can run on several threads.
 */
async function serve(files: {
  footage: string;
  model: string;
  ort: string;
}): Promise<{ url: string; close(): Promise<void> }> {
  const bunny = mediabunnyModule();
  const isolate = { "cross-origin-opener-policy": "same-origin", "cross-origin-embedder-policy": "require-corp" };
  const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const path = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
    const send = (file: string, type: string) => sendFile(req, res, file, type, isolate);
    if (path === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", ...isolate });
      res.end(MATTE_PAGE);
    } else if (path === "/footage") send(files.footage, "application/octet-stream");
    else if (path === "/model") send(files.model, "application/octet-stream");
    else if (path === "/lib/mediabunny.mjs") send(bunny, "text/javascript");
    else if (path.startsWith("/lib/ort/")) {
      const file = normalize(join(files.ort, path.slice("/lib/ort/".length)));
      if (!file.startsWith(files.ort) || !existsSync(file)) {
        res.writeHead(404);
        res.end();
      } else send(file, TYPES[extname(file)] ?? "application/octet-stream");
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise<void>((ok) => server.close(() => ok())),
  };
}

/** A file, whole or the byte range asked for (the footage is read in ranges). */
function sendFile(
  req: IncomingMessage,
  res: ServerResponse,
  file: string,
  type: string,
  headers: Record<string, string>,
): void {
  const size = statSync(file).size;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      res.writeHead(416, { "content-range": `bytes */${size}`, ...headers });
      res.end();
      return;
    }
    res.writeHead(206, {
      "content-type": type,
      "accept-ranges": "bytes",
      "content-range": `bytes ${start}-${end}/${size}`,
      "content-length": end - start + 1,
      ...headers,
    });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { "content-type": type, "accept-ranges": "bytes", "content-length": size, ...headers });
  createReadStream(file).pipe(res);
}
