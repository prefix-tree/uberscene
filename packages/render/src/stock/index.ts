// `uberscene find` and `uberscene fetch`: footage and sound from a stock library, chosen from a search, fetched into
// the project with where it came from kept on its manifest entry, so the credits write themselves.
//
// A search is cached for a day (Pixabay asks clients to), keyed by what was asked, never by the key it was asked with.
// A fetch downloads the file as the library serves it when the engine can play it as it is (Pixabay's MP4, Commons'
// WebM, a WAV), and otherwise converts it with ffmpeg: a stretch of a file (`from`/`to`), an Ogg Theora video, or a
// sound that is not a WAV (so `add` can read its samples for beats and waveforms).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import type { AssetEntry, AssetManifest, AssetSource } from "@uberscene/sdk";

import { addAsset } from "../add";
import { findManifest, MANIFEST_FILE } from "../manifest-file";
import { commons } from "./commons";
import { pixabay } from "./pixabay";
import {
  type Fetcher,
  type StockCandidate,
  type StockFile,
  type StockProvider,
  type StockSearch,
  USER_AGENT,
} from "./types";

export type { StockCandidate, StockFile, StockSearch } from "./types";

/** The libraries, by name. */
function stockProviders(env: NodeJS.ProcessEnv = process.env): Record<string, StockProvider> {
  return { pixabay: pixabay(env), commons: commons() };
}

function provider(name: string, env: NodeJS.ProcessEnv): StockProvider {
  const all = stockProviders(env);
  const p = all[name];
  if (!p) throw new Error(`no stock library "${name}"; there are ${Object.keys(all).join(" and ")}`);
  return p;
}

/** Where searches are cached: `UBERSCENE_STOCK_CACHE`, else `~/.cache/uberscene/stock`. */
function stockCacheDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.UBERSCENE_STOCK_CACHE ?? join(homedir(), ".cache", "uberscene", "stock");
}
const DAY = 24 * 60 * 60 * 1000;

export interface StockOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly fetcher?: Fetcher;
  /** Skip the search cache. */
  readonly fresh?: boolean;
  readonly now?: () => number;
}

/** Searches a library: candidates to choose from, best first as the library ranks them. */
export async function findStock(
  library: string,
  search: StockSearch,
  options: StockOptions = {},
): Promise<StockCandidate[]> {
  const env = options.env ?? process.env;
  const p = provider(library, env);
  if (!p.kinds.includes(search.kind))
    throw new Error(`${library} has no ${search.kind === "audio" ? "sounds" : "videos"}`);
  const now = options.now ?? Date.now;
  const file = join(
    stockCacheDir(env),
    `${createHash("sha256")
      .update(JSON.stringify([library, search]))
      .digest("hex")
      .slice(0, 24)}.json`,
  );
  if (!options.fresh && existsSync(file)) {
    const cached = JSON.parse(readFileSync(file, "utf8")) as { at: number; candidates: StockCandidate[] };
    if (now() - cached.at < DAY) return cached.candidates;
  }
  const candidates = await p.search(search, options.fetcher ?? fetch);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ at: now(), candidates }));
  return candidates;
}

/** `pixabay:287510` or `commons:Some file.webm`, as its library and its id there. */
export function parseStockRef(ref: string): { library: string; id: string } {
  const at = ref.indexOf(":");
  if (at <= 0 || at === ref.length - 1)
    throw new Error(`"${ref}" is not a stock reference: write it as library:id, e.g. pixabay:287510`);
  return { library: ref.slice(0, at), id: ref.slice(at + 1) };
}

export interface FetchStockOptions extends StockOptions {
  /** The asset id; default one made from the title. */
  readonly id?: string;
  /** The manifest to add it to; default the nearest `uberscene.json`, or a new one in `cwd`. */
  readonly manifest?: string;
  /** The folder to write the file into; default `media` beside the manifest. */
  readonly dir?: string;
  readonly cwd?: string;
  /** Keep only these seconds of the original (converts it). */
  readonly from?: number;
  readonly to?: number;
  /**
   * The picture's height the film needs, in pixels: the smallest rendition at least this tall is fetched (so a
   * vertical crop of landscape footage keeps real pixels). Default 1080; the largest there is when none is as tall.
   */
  readonly height?: number;
  readonly log?: (message: string) => void;
  /** Runs ffmpeg; replaced in tests. */
  readonly ffmpeg?: (args: readonly string[]) => void;
}

export interface FetchStockResult {
  readonly file: string;
  readonly manifest: string;
  readonly entry: AssetEntry;
  readonly candidate: StockCandidate;
  /** Whether ffmpeg converted it, and why. */
  readonly converted?: string;
}

/** Fetches a candidate into the project and adds it to the manifest with where it came from. */
export async function fetchStock(ref: string, options: FetchStockOptions = {}): Promise<FetchStockResult> {
  const env = options.env ?? process.env;
  const fetcher = options.fetcher ?? fetch;
  const log = options.log ?? (() => undefined);
  const { library, id: libraryId } = parseStockRef(ref);
  const candidate = await provider(library, env).get(libraryId, fetcher);
  if ((options.from === undefined) !== (options.to === undefined))
    throw new Error("--from and --to go together: they name the stretch of the original to keep");
  if (options.from !== undefined && options.to !== undefined) {
    if (!(options.to > options.from)) throw new Error(`--to (${options.to}) must be after --from (${options.from})`);
    if (candidate.duration > 0 && options.from >= candidate.duration)
      throw new Error(`${ref} is ${candidate.duration} s long; --from ${options.from} is past its end`);
  }

  const cwd = options.cwd ?? process.cwd();
  const manifest = resolve(cwd, options.manifest ?? findManifest(cwd).path ?? MANIFEST_FILE);
  const dir = resolve(cwd, options.dir ?? join(dirname(manifest), "media"));
  mkdirSync(dir, { recursive: true });
  const id = options.id ?? slug(candidate.source.title);
  const chosen = pickFile(candidate, options.height ?? 1080);
  const why = conversion(candidate, chosen, options);
  const ext = candidate.kind === "audio" ? (why ? "wav" : extOf(chosen)) : why ? "webm" : extOf(chosen);
  const file = join(dir, `${id}.${ext}`);
  // Written under another name and moved, so a fetch cut off half way is made again next time.
  const part = `${file}.part`;
  rmSync(part, { force: true });
  if (why) {
    log(`${id}: converting ${ref} with ffmpeg (${why})`);
    const run = options.ffmpeg ?? runFfmpeg;
    run(ffmpegArgs(candidate, chosen, part, options));
  } else {
    log(`${id}: downloading ${ref}${chosen.bytes ? `, ${Math.round(chosen.bytes / 1e6)} MB` : ""}`);
    const r = await fetcher(chosen.url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!r.ok || !r.body) throw new Error(`${new URL(chosen.url).host} answered ${r.status} for ${ref}`);
    await pipeline(Readable.fromWeb(r.body as never), createWriteStream(part));
  }
  renameSync(part, file);

  const added = await addAsset(file, { id, manifest, beats: false });
  const source: AssetSource = {
    ...candidate.source,
    ...(options.from !== undefined && options.to !== undefined ? { from: options.from, to: options.to } : {}),
  };
  const current = JSON.parse(readFileSync(manifest, "utf8")) as AssetManifest;
  const entry: AssetEntry = { ...(current.assets[id] ?? added.entry), source };
  writeFileSync(manifest, `${JSON.stringify({ ...current, assets: { ...current.assets, [id]: entry } }, null, 2)}\n`);
  return { file, manifest, entry, candidate, ...(why ? { converted: why } : {}) };
}

/** The rendition to fetch: the smallest at least `height` tall, or the largest. A sound has one. */
export function pickFile(candidate: StockCandidate, height: number): StockFile {
  const files = candidate.files;
  if (files.length === 0) throw new Error(`${candidate.ref} has no file to fetch`);
  return files.find((f) => (f.height ?? 0) >= height) ?? (files[files.length - 1] as StockFile);
}

const PLAYABLE_VIDEO = new Set(["video/mp4", "video/webm"]);
const PLAYABLE_AUDIO = new Set(["audio/wav", "audio/x-wav", "audio/wave"]);

/** Why the file must be converted rather than downloaded as it is; undefined when it need not be. */
export function conversion(
  candidate: StockCandidate,
  file: StockFile,
  options: Pick<FetchStockOptions, "from" | "to">,
): string | undefined {
  if (options.from !== undefined) return `keeping ${options.from}–${options.to} s`;
  if (candidate.kind === "audio" && !PLAYABLE_AUDIO.has(file.mime)) return `${file.mime} to WAV`;
  if (candidate.kind === "video" && !PLAYABLE_VIDEO.has(file.mime)) return `${file.mime} to WebM`;
  return undefined;
}

/** ffmpeg's arguments: it seeks before reading, so only the stretch kept is read from the library. */
export function ffmpegArgs(
  candidate: StockCandidate,
  file: StockFile,
  out: string,
  options: Pick<FetchStockOptions, "from" | "to" | "height">,
): string[] {
  const stretch =
    options.from !== undefined && options.to !== undefined
      ? { before: ["-ss", String(options.from)], after: ["-t", String(options.to - options.from)] }
      : { before: [], after: [] };
  const input = ["-v", "error", "-y", "-user_agent", "uberscene", ...stretch.before, "-i", file.url, ...stretch.after];
  if (candidate.kind === "audio")
    return [...input, "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", "-f", "wav", out];
  // Scaled down to the height asked for, when the rendition is taller: the pixels a crop needs and no more. CRF 28
  // keeps the detail it needs; the sound of stock footage is left out, as a film lays its own.
  const height = options.height ?? 1080;
  const scale = (file.height ?? 0) > height ? ["-vf", `scale=-2:${height}:flags=lanczos`] : [];
  return [
    ...input,
    ...scale,
    ...["-an", "-c:v", "libvpx-vp9", "-crf", "28", "-b:v", "0", "-g", "30", "-deadline", "good", "-cpu-used", "4"],
    ...["-row-mt", "1", "-pix_fmt", "yuv420p", "-f", "webm", out],
  ];
}

function runFfmpeg(args: readonly string[]): void {
  try {
    execFileSync("ffmpeg", args, { stdio: ["ignore", "inherit", "inherit"] });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT")
      throw new Error("this file has to be converted, and that needs ffmpeg (with libvpx-vp9) on the PATH");
    throw e;
  }
}

const extOf = (file: StockFile): string =>
  ({ "video/mp4": "mp4", "video/webm": "webm", "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav" })[
    file.mime
  ] ?? "bin";

/** An asset id from a title: lower case, words joined by `-`, at most five words. */
export function slug(title: string): string {
  const words = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 5);
  return words.join("-") || "stock";
}

/** The credits for every fetched asset in a manifest, as a Markdown table. */
export function stockCredits(manifest: AssetManifest): string {
  const rows = Object.values(manifest.assets)
    .filter((a): a is AssetEntry & { source: AssetSource } => a.source !== undefined)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => {
      const s = a.source;
      const stretch = s.from !== undefined ? `, ${s.from}–${s.to} s` : "";
      const cell = (t: string) => t.replaceAll("|", "\\|");
      return `| \`${a.id}\` | [${cell(s.title)}](${s.page})${stretch} | ${cell(s.author)} | ${cell(s.licence)} | ${s.provider} |`;
    });
  if (rows.length === 0) return "";
  return ["| Asset | Source | Author | Licence | Library |", "|---|---|---|---|---|", ...rows].join("\n");
}
