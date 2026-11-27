// Which codecs an export uses: the browser's (WebCodecs, the default) or the native codec process
// (`native/`, craft-video), chosen with UBERSCENE_CODECS. The browser stays the reference; native is experimental.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type CodecSide = "browser" | "native";

export interface CodecModes {
  /** Who decodes the footage the page draws. */
  readonly decode: CodecSide;
  /** Who encodes the pictures of a video export. */
  readonly encode: CodecSide;
}

export const BROWSER_CODECS: CodecModes = { decode: "browser", encode: "browser" };

const MODES: Readonly<Record<string, CodecModes>> = {
  browser: BROWSER_CODECS,
  native: { decode: "native", encode: "native" },
  "native-decode": { decode: "native", encode: "browser" },
  "native-encode": { decode: "browser", encode: "native" },
};

/** The codecs `UBERSCENE_CODECS` asks for; unset or empty is the browser's. */
export function codecModes(env: NodeJS.ProcessEnv = process.env): CodecModes {
  const value = env.UBERSCENE_CODECS?.trim().toLowerCase();
  if (!value) return BROWSER_CODECS;
  const modes = MODES[value];
  if (!modes)
    throw new Error(`UBERSCENE_CODECS wants one of ${Object.keys(MODES).join(", ")}; got "${env.UBERSCENE_CODECS}"`);
  return modes;
}

export function usesNative(modes: CodecModes): boolean {
  return modes.decode === "native" || modes.encode === "native";
}

/** Where `pnpm native:build` writes the binary, in the workspace. */
const BUILT = fileURLToPath(new URL("../../../../native/target/release/uberscene-codec", import.meta.url));

/** Where the release publishes the binaries: one asset per target on the release of each version. */
const RELEASES = "https://github.com/prefix-tree/uberscene/releases/download";

/** A machine a binary is published for, named as its release asset is: `uberscene-codec-<name>[.exe]`. */
export interface CodecTarget {
  readonly name: string;
  readonly os: NodeJS.Platform;
  readonly cpu: string;
  /** On Linux, the C library the binary links: `glibc`. */
  readonly libc?: "glibc";
}

/** Every machine the release builds a binary for (`.github/workflows/codecs-build.yml`). */
export const CODEC_TARGETS: readonly CodecTarget[] = [
  { name: "darwin-arm64", os: "darwin", cpu: "arm64" },
  { name: "darwin-x64", os: "darwin", cpu: "x64" },
  { name: "linux-x64-gnu", os: "linux", cpu: "x64", libc: "glibc" },
  { name: "linux-arm64-gnu", os: "linux", cpu: "arm64", libc: "glibc" },
  { name: "win32-x64", os: "win32", cpu: "x64" },
];

export interface Machine {
  readonly platform: string;
  readonly arch: string;
  readonly libc?: string | undefined;
}

/** The machine this process runs on; on Linux, with the C library Node runs on (none named on musl). */
function thisMachine(): Machine {
  if (process.platform !== "linux") return { platform: process.platform, arch: process.arch };
  const header = (process.report?.getReport() as { header?: { glibcVersionRuntime?: string } } | undefined)?.header;
  return { platform: process.platform, arch: process.arch, libc: header?.glibcVersionRuntime ? "glibc" : "musl" };
}

/** The target published for a machine, or null for one the release builds nothing for (Alpine, Windows on arm64). */
export function codecTarget(machine: Machine = thisMachine()): CodecTarget | null {
  return (
    CODEC_TARGETS.find(
      (t) => t.os === machine.platform && t.cpu === machine.arch && (t.libc === undefined || t.libc === machine.libc),
    ) ?? null
  );
}

/** The binary's file name on a machine. */
const binaryName = (platform: string) => (platform === "win32" ? "uberscene-codec.exe" : "uberscene-codec");

/** Where downloaded binaries live: `UBERSCENE_CODEC_CACHE`, else `~/.cache/uberscene/codecs`; one folder per version. */
function codecCacheDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.UBERSCENE_CODEC_CACHE ?? join(homedir(), ".cache", "uberscene", "codecs");
}

/** This package's root: the folder of the nearest `package.json` named `@uberscene/render` above this module. */
export function packageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const manifest = join(dir, "package.json");
    if (
      existsSync(manifest) &&
      (JSON.parse(readFileSync(manifest, "utf8")) as { name?: string }).name === "@uberscene/render"
    )
      return dir;
    const up = dirname(dir);
    if (up === dir) throw new Error("cannot find the @uberscene/render package around its own code");
    dir = up;
  }
}

/** The version the binary must match: this package's. The binary and the export speak a protocol that changes between releases. */
function codecVersion(): string {
  return (JSON.parse(readFileSync(join(packageRoot(), "package.json"), "utf8")) as { version: string }).version;
}

/**
 * The SHA-256 of each target's binary on this version's release, which the release writes into the published package
 * (`codecs.json`). A download is checked against it. Null in a checkout of the repository, which has none.
 */
export function codecHashes(root = packageRoot()): Readonly<Record<string, string>> | null {
  const file = join(root, "codecs.json");
  if (!existsSync(file)) return null;
  return (JSON.parse(readFileSync(file, "utf8")) as { sha256: Record<string, string> }).sha256;
}

/** The cached binary of this version, for this machine; it may not exist yet. */
function cachedCodecPath(env: NodeJS.ProcessEnv = process.env, version = codecVersion()): string {
  return join(codecCacheDir(env), version, binaryName(process.platform));
}

/** The address of a target's binary on a version's release. */
export function codecUrl(version: string, target: CodecTarget): string {
  return `${RELEASES}/v${version}/uberscene-codec-${target.name}${target.os === "win32" ? ".exe" : ""}`;
}

/**
 * The native codec binary without asking the network: `UBERSCENE_CODEC_BIN`; else, in a checkout of the repository,
 * the one `pnpm native:build` made; else this version's binary in the cache. Throws, saying how to get one, when there
 * is none: `ensureCodecBinary` downloads it instead.
 */
export function codecBinary(
  env: NodeJS.ProcessEnv = process.env,
  built = process.platform === "win32" ? `${BUILT}.exe` : BUILT,
  cached: () => string = () => cachedCodecPath(env),
): string {
  const named = env.UBERSCENE_CODEC_BIN;
  if (named) {
    if (!existsSync(named)) throw new Error(`UBERSCENE_CODEC_BIN names ${named}, which does not exist`);
    return named;
  }
  if (existsSync(built)) return built;
  const inCache = cached();
  if (existsSync(inCache)) return inCache;
  throw new Error(
    codecTarget() === null
      ? `UBERSCENE_CODECS asks for the native codecs, and none are published for ${process.platform} ${process.arch}: build uberscene-codec from the UberScene repository (\`pnpm native:build\`) and set UBERSCENE_CODEC_BIN to it`
      : "UBERSCENE_CODECS asks for the native codecs, which are not downloaded: run `uberscene codecs install`, or set UBERSCENE_CODEC_BIN to an uberscene-codec binary",
  );
}

/** The binary, downloaded into the cache first when there is none yet: what an export with `UBERSCENE_CODECS` calls. */
export async function ensureCodecBinary(log: (message: string) => void = () => undefined): Promise<string> {
  try {
    return codecBinary();
  } catch (error) {
    if (codecTarget() === null || codecHashes() === null) throw error;
    return installCodec(log);
  }
}

/**
 * Downloads this version's binary for this machine from its GitHub release into the cache, checks it against the hash
 * the package carries, and returns its path. A binary already in the cache is kept.
 */
export async function installCodec(
  log: (message: string) => void = () => undefined,
  options: { readonly fetch?: typeof fetch; readonly env?: NodeJS.ProcessEnv; readonly root?: string } = {},
): Promise<string> {
  const env = options.env ?? process.env;
  const root = options.root ?? packageRoot();
  const version = (JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string }).version;
  const target = codecTarget();
  if (!target)
    throw new Error(
      `no native codecs are published for ${process.platform} ${process.arch}: build uberscene-codec from the UberScene repository (\`pnpm native:build\`) and set UBERSCENE_CODEC_BIN to it`,
    );
  const path = cachedCodecPath(env, version);
  if (existsSync(path)) return path;
  const expected = codecHashes(root)?.[target.name];
  if (!expected)
    throw new Error(
      "this copy of @uberscene/render carries no codec hashes (a checkout of the repository): build the codecs with `pnpm native:build`",
    );
  const url = codecUrl(version, target);
  log(`downloading the native codecs ${version} for ${target.name} into ${dirname(path)} (once)`);
  const response = await (options.fetch ?? fetch)(url);
  if (!response.ok) throw new Error(`cannot download the native codecs: ${url} answered ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected)
    throw new Error(
      `the native codecs downloaded from ${url} are not the released ones (sha256 ${actual}, expected ${expected})`,
    );
  mkdirSync(dirname(path), { recursive: true });
  // Written beside its place and renamed, so a second export starting meanwhile never finds half a binary.
  const partial = `${path}.${process.pid}.partial`;
  writeFileSync(partial, bytes, { mode: 0o755 });
  renameSync(partial, path);
  return path;
}
