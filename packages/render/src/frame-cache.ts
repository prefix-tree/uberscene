// Frames on disk, keyed by what draws them. A frame's key is a hash of everything that decides its pixels: the
// elements on screen at that time with their resolved props, the media files they read, the composition's settings,
// the fonts, the code the video loads (its packages, and UberScene's own source when it runs from a checkout), and the
// version of UberScene and of Chrome. A frame an edit did not touch keeps its key, so it is read
// from disk instead of drawn again; a frame it did touch gets a new key, and the old file is simply never read.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve as resolvePath, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { frameStartSeconds, motionBlurOf, shutterTimes } from "@uberscene/kit/schema";
import type { MediaResolver } from "@uberscene/player/engine";
import {
  endSeconds,
  followOf,
  lengthTicks,
  lookupAsset,
  type Placement,
  type ResolvedState,
  startSeconds,
} from "@uberscene/sdk";

import type { FontFile } from "./fonts";
import type { ExportSource } from "./renderer";
import { CHROME_MILESTONE } from "./web/chrome";

/** Bumped when what a key covers, or what is stored under it, changes. */
const CACHE_FORMAT = 2;

const VERSION = (() => {
  try {
    return String(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version);
  } catch {
    return "unknown";
  }
})();

/** Elements whose picture is free code or another composition: anything in the file may decide it. */
const FREE = new Set(["layer", "motion", "three", "nested", "multicam"]);
/** Elements that last as long as the video does: their own range says nothing about a frame. */
const WHOLE = new Set(["composition", "track", "captions"]);
/** Elements that draw nothing. */
const SILENT = new Set(["audio", "marker"]);

/**
 * A value as text, the same for the same value whatever its key order. What JSON cannot hold is written by what it
 * is: a function by its source, a React element by its type and props, a schema by a placeholder. `free` is set
 * when the value holds code, so the caller knows the file's own text decides the picture too.
 */
function stable(value: unknown, flags: { free: boolean }, seen = new Set<object>()): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "function") {
    flags.free = true;
    return `fn:${Function.prototype.toString.call(value)}`;
  }
  if (typeof value !== "object") return JSON.stringify(value) ?? String(value);
  if (seen.has(value)) return "[cycle]";
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((v) => stable(v, flags, seen)).join(",")}]`;
    if (value instanceof Map) return `map${stable([...value.entries()], flags, seen)}`;
    if (value instanceof Set) return `set${stable([...value.values()], flags, seen)}`;
    const record = value as Record<string, unknown>;
    if ("_zod" in record || "_def" in record) return "[schema]";
    if ("$$typeof" in record) {
      flags.free = true;
      const type = record.type;
      const name = typeof type === "string" ? type : typeof type === "function" ? `fn:${type.toString()}` : "element";
      return `<${name} ${stable(record.props, flags, seen)}>`;
    }
    return `{${Object.keys(record)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(record[k], flags, seen)}`)
      .join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

/**
 * The placements that can draw at `t`: the ones on the timeline there, with everything inside them, and the elements
 * they follow, which place them even while not on screen themselves.
 */
function drawnAt(state: ResolvedState, t: number): Placement[] {
  const out = new Map<string, Placement>();
  const covers = (p: Placement): boolean => t >= startSeconds(p) - 1e-6 && t <= endSeconds(p) + 1e-6;
  const add = (p: Placement): void => {
    if (out.has(p.id)) return;
    out.set(p.id, p);
    const leader = state.items.get(followOf(p) ?? "");
    if (leader) add(leader);
    for (const id of p.children) {
      const child = state.items.get(id);
      // Captions hold a cue for every line said; only the one on screen draws.
      if (child && (p.kind !== "captions" || covers(child))) add(child);
    }
  };
  for (const p of state.items.values()) {
    if (p.kind === "composition" || p.kind === "track") out.set(p.id, p);
    else if (!SILENT.has(p.kind) && lengthTicks(p) > 0 && covers(p)) {
      const parent = state.items.get(p.parent ?? "");
      // A child is added with its parent; a multicam's generated clips name it as their parent and are added here.
      if (!parent || parent.kind === "track" || parent.kind === "composition" || parent.kind === "multicam") add(p);
    }
  }
  return [...out.values()];
}

export interface FrameKeyInput {
  readonly state: ResolvedState;
  readonly source: ExportSource;
  readonly media: MediaResolver;
  readonly fonts?: readonly FontFile[] | undefined;
}

/** Works out frame keys for one file: what is shared by every frame is hashed once. */
export class FrameKeys {
  private readonly shared: string;
  private readonly whole: string;
  private readonly stats = new Map<string, Promise<string>>();

  constructor(private readonly input: FrameKeyInput) {
    const { state, source } = input;
    const flags = { free: false };
    const fonts = (input.fonts ?? []).map((f) => [
      f.name,
      f.weight,
      f.style,
      createHash("sha256")
        .update(new Uint8Array(f.data as ArrayBuffer))
        .digest("hex"),
    ]);
    this.shared = stable(
      {
        format: CACHE_FORMAT,
        version: VERSION,
        chrome: [CHROME_MILESTONE, source.executablePath ?? process.env.UBERSCENE_CHROMIUM ?? ""],
        // Not the duration: a cut that grows at its end leaves the frames before it as they were.
        composition: {
          id: state.composition.id,
          fps: state.composition.fps,
          width: state.composition.width,
          height: state.composition.height,
        },
        theme: state.theme,
        declaredFonts: state.fonts,
        fonts,
        // The code that draws: a component of the kit is not in the file, and its version does not move while it is
        // edited in a checkout.
        code: source.code ?? codeFingerprint(),
      },
      flags,
    );
    // For a frame that free code draws: the file's text, its own modules and props, and every element, since code can
    // read them all.
    this.whole = stable(
      {
        text: source.text,
        ...(source.files ? { files: source.files } : {}),
        props: source.props ?? {},
        items: [...state.items.values()],
      },
      flags,
    );
  }

  /** The size and modified time of an asset's file: a re-encoded or replaced file is another picture. */
  private stat(asset: string): Promise<string> {
    let known = this.stats.get(asset);
    if (!known) {
      known = this.input.media.resolve(asset).then(
        (handle) => {
          if (handle.kind !== "path") return stable(handle, { free: false });
          const s = statSync(handle.path);
          return `${handle.path}:${s.size}:${s.mtimeMs}`;
        },
        () => "missing",
      );
      this.stats.set(asset, known);
    }
    return known;
  }

  /** See `wholeKey`: the whole file, every asset it plays, and `extra`. */
  async whole_(extra: unknown): Promise<string> {
    const assets = new Set<string>();
    for (const p of this.input.state.items.values()) {
      if (!p.source) continue;
      assets.add(p.source.asset.replace(/^asset:/, ""));
      const matte = matteAsset(this.input.state, p);
      if (matte) assets.add(matte);
    }
    const stats = await Promise.all([...assets].sort().map(async (id) => `${id}=${await this.stat(id)}`));
    const hash = createHash("sha256");
    hash.update(this.shared);
    hash.update(this.whole);
    hash.update(`\n${stats.join("\n")}\n`);
    hash.update(stable(extra, { free: false }));
    return hash.digest("hex").slice(0, 40);
  }

  /**
   * The key of frame `frame`, as a file-name-safe string. `extra` names anything else that decides the stored bytes:
   * the kind of picture, its size, its label.
   */
  async key(frame: number, extra: unknown = null, state: ResolvedState = this.input.state): Promise<string> {
    const { fps, rate, duration } = state.composition;
    const blur = motionBlurOf(state);
    const start = frameStartSeconds(frame, rate);
    const times = blur ? shutterTimes(start, fps, blur, duration) : [start];
    const flags = { free: false };
    const tree = state.tree;
    const drawn = times.map((t) =>
      drawnAt(state, t).map((p) => {
        if (FREE.has(p.kind)) flags.free = true;
        return stable(
          {
            id: p.id,
            kind: p.kind,
            track: p.track,
            parent: p.parent,
            // The composition, a track and the captions run the video's whole length, which is not theirs to say.
            ...(WHOLE.has(p.kind) ? {} : { start: startSeconds(p), end: endSeconds(p) }),
            source: p.source,
            between: p.between,
            interior: p.interior,
            text: tree.byId.get(p.id)?.text,
            props: p.props,
            // The manifest is not hashed, so the matte a cutout cuts with is named here, its file's stat with it.
            ...(matteAsset(state, p) ? { matte: `asset:${matteAsset(state, p)}` } : {}),
          },
          flags,
        );
      }),
    );
    const body = stable(drawn, flags);
    const assets = new Set<string>();
    for (const m of body.matchAll(/asset:([A-Za-z0-9_.-]+)/g)) assets.add(m[1] as string);
    for (const m of body.matchAll(/"asset":"([^"]+)"/g)) assets.add((m[1] as string).replace(/^asset:/, ""));
    const stats = await Promise.all([...assets].sort().map(async (id) => `${id}=${await this.stat(id)}`));
    const hash = createHash("sha256");
    hash.update(this.shared);
    hash.update(`\nframe:${frame} at ${times.join(",")}\n`);
    hash.update(body);
    hash.update(`\n${stats.join("\n")}\n`);
    hash.update(stable(extra, flags));
    if (flags.free) hash.update(this.whole);
    return hash.digest("hex").slice(0, 40);
  }
}

/** Folders and files of a package that are not code it runs. */
const NOT_CODE = new Set(["node_modules", "dist", "test", "tests", "__tests__", "bench", "coverage"]);
/** A workspace package's hash, by its folder, kept while the size and modified time of each of its files stay. */
const packageHashes = new Map<string, { readonly stats: string; readonly hash: string }>();

/** The folder of package `name` as seen from `from`, its links followed; undefined when it is not installed there. */
function packageFolder(name: string, from: string): string | undefined {
  for (let dir = resolvePath(from); ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) return realpathSync(candidate);
    if (dirname(dir) === dir) return undefined;
  }
}

/** The files of a workspace package that decide what it does: its `src` (or the folder without one) and package.json. */
function codeFiles(folder: string): string[] {
  const out = [join(folder, "package.json")];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith(".") || NOT_CODE.has(entry.name) || /\.test\.[cm]?[jt]sx?$/.test(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && entry.name !== "package.json") out.push(path);
    }
  };
  const src = join(folder, "src");
  walk(existsSync(src) ? src : folder);
  return out;
}

/** A hash of a workspace package's code; read again only when one of its files changed size or time. */
function workspaceHash(folder: string): string {
  const files = codeFiles(folder);
  const stats = files
    .map((f) => {
      const s = statSync(f);
      return `${f}:${s.size}:${s.mtimeMs}`;
    })
    .join("\n");
  const known = packageHashes.get(folder);
  if (known?.stats === stats) return known.hash;
  const hash = createHash("sha256");
  for (const f of files) hash.update(`\n${f.slice(folder.length)}\n`).update(readFileSync(f));
  const digest = hash.digest("hex");
  packageHashes.set(folder, { stats, hash: digest });
  return digest;
}

/**
 * Adds package `folder` to `out`: an installed one (in node_modules) by its name and version, a workspace one (linked
 * from a checkout) by the hash of its code, with the packages it depends on, since its version says nothing.
 */
function addPackage(folder: string, out: Map<string, string>): void {
  if (out.has(folder)) return;
  let json: { name?: string; version?: string; dependencies?: object; peerDependencies?: object };
  try {
    json = JSON.parse(readFileSync(join(folder, "package.json"), "utf8"));
  } catch {
    out.set(folder, "unreadable");
    return;
  }
  const installed = folder.split(sep).includes("node_modules");
  if (installed) {
    out.set(folder, `${json.name}@${json.version}`);
    return;
  }
  out.set(folder, `${json.name}#${workspaceHash(folder)}`);
  for (const name of Object.keys({ ...json.dependencies, ...json.peerDependencies })) {
    const dep = packageFolder(name, folder);
    if (dep) addPackage(dep, out);
  }
}

/** The package a bare specifier names: `@scope/name` or `name`, without a subpath. */
function packageName(specifier: string): string {
  const parts = specifier.split("/");
  return (specifier.startsWith("@") ? parts.slice(0, 2) : parts.slice(0, 1)).join("/");
}

/** UberScene's own package: the folder above this file's, in src or in dist. */
const RENDER_FOLDER = fileURLToPath(new URL("..", import.meta.url));

export interface CodeOptions {
  /** The video's folder, where its packages resolve from. */
  readonly folder?: string;
  /** The video's text and its own modules, read for the packages they import. */
  readonly texts?: readonly string[];
  /** Modules offered to the video (`imports` of `loadVideo`): a package name, or a path relative to `folder`. */
  readonly offered?: Readonly<Record<string, string>>;
}

/**
 * A hash of the code a video loads beyond its own text: UberScene's packages (which draw every element), the packages
 * the video imports, and files offered to it. A package from node_modules counts by name and version; one linked from
 * a checkout (a workspace) by the text of its source, so an edit to a kit component gives new keys.
 */
export function codeFingerprint(options: CodeOptions = {}): string {
  const folder = options.folder ?? process.cwd();
  const packages = new Map<string, string>();
  const missing = new Set<string>();
  const local: string[] = [];
  addPackage(realpathSync(RENDER_FOLDER), packages);
  const names = new Set<string>();
  for (const text of options.texts ?? [])
    for (const m of text.matchAll(/\bfrom\s*["']([^"'\n]+)["']|\bimport\s*\(?\s*["']([^"'\n]+)["']/g)) {
      const specifier = (m[1] ?? m[2]) as string;
      if (!specifier.startsWith(".") && !specifier.startsWith("node:") && !isAbsolute(specifier))
        names.add(packageName(specifier));
    }
  for (const [name, specifier] of Object.entries(options.offered ?? {})) {
    if (specifier.startsWith(".") || isAbsolute(specifier)) {
      const path = resolvePath(folder, specifier);
      local.push(
        `${name}=${existsSync(path) ? createHash("sha256").update(readFileSync(path)).digest("hex") : "none"}`,
      );
    } else names.add(packageName(specifier));
  }
  for (const name of names) {
    const found = packageFolder(name, folder) ?? packageFolder(name, RENDER_FOLDER);
    if (found) addPackage(found, packages);
    else missing.add(name);
  }
  return createHash("sha256")
    .update([...new Set(packages.values())].sort().join("\n"))
    .update(`\nmissing:${[...missing].sort().join(",")}\nlocal:${local.sort().join(",")}`)
    .digest("hex");
}

/** A key for something every part of the file can decide, such as its sound over a stretch. */
export async function wholeKey(keys: FrameKeys, extra: unknown): Promise<string> {
  return keys.whole_(extra);
}

/** The most the cache folder holds, in bytes; past it the files used longest ago are deleted. */
const CACHE_CAP_BYTES = 500 * 1024 * 1024;
/** Bytes written to a folder between two trims of it: a trim lists the whole folder, so not on every frame. */
const TRIM_EVERY_BYTES = 25 * 1024 * 1024;
const writtenSinceTrim = new Map<string, number>();

/** A file from the cache, or null. A hit counts as a use, so the trim keeps it over files not read since. */
export function readCached(dir: string, name: string): Uint8Array | null {
  try {
    const bytes = readFileSync(join(dir, name));
    try {
      const now = new Date();
      utimesSync(join(dir, name), now, now);
    } catch {}
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Keeps bytes in the cache. A cache that cannot be written is not an error: the frame is drawn again next time. Every
 * edit makes new keys, so the folder is trimmed to CACHE_CAP_BYTES as it fills: on the first write of a process, then
 * every TRIM_EVERY_BYTES.
 */
export function writeCached(dir: string, name: string, bytes: Uint8Array): void {
  try {
    mkdirSync(dir, { recursive: true });
    // Written beside itself, then renamed, so a call that reads while another writes never sees half a file.
    const partial = join(dir, `${name}.${process.pid}.tmp`);
    writeFileSync(partial, bytes);
    renameSync(partial, join(dir, name));
    const since = writtenSinceTrim.get(dir);
    if (since === undefined || since + bytes.length >= TRIM_EVERY_BYTES) {
      trimCache(dir);
      writtenSinceTrim.set(dir, 0);
    } else writtenSinceTrim.set(dir, since + bytes.length);
  } catch {
    /* a read-only folder, a full disk: carry on without the cache */
  }
}

/**
 * Deletes the cache's files used longest ago (by modified time, which a read refreshes) until the folder holds no
 * more than `cap` bytes, and a little under it, so the next writes do not trim again at once.
 */
export function trimCache(dir: string, cap = CACHE_CAP_BYTES): void {
  let files: { path: string; size: number; used: number }[];
  try {
    files = readdirSync(dir).flatMap((name) => {
      try {
        const st = statSync(join(dir, name));
        return st.isFile() ? [{ path: join(dir, name), size: st.size, used: st.mtimeMs }] : [];
      } catch {
        return [];
      }
    });
  } catch {
    return;
  }
  let total = files.reduce((sum, f) => sum + f.size, 0);
  if (total <= cap) return;
  const target = cap * 0.9;
  for (const f of files.sort((a, b) => a.used - b.used)) {
    if (total <= target) break;
    try {
      rmSync(f.path, { force: true });
      total -= f.size;
    } catch {}
  }
}

/** The matte a clip with `cutout` draws with, by asset id, from the manifest; none for anything else. */
function matteAsset(state: ResolvedState, p: Placement): string | undefined {
  if (!p.source || p.props.cutout === undefined || p.props.cutout === false) return undefined;
  return lookupAsset(state.manifest, p.source.asset)?.matte;
}
