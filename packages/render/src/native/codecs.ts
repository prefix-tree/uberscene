// Which codecs an export uses: the browser's (WebCodecs, the default) or the native codec process
// (`native/`, craft-video), chosen with UBERSCENE_CODECS. The browser stays the reference; native is experimental.
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
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

interface Target {
  readonly package: string;
  readonly os: string;
  readonly cpu: string;
  readonly libc?: string;
  readonly binary: string;
}

/**
 * The binary `@uberscene/codecs` installed for this machine, looked for from the project and then from this package;
 * undefined when the package is not installed, or has no binary for this machine. `supported` says whether a binary
 * is published for the machine at all.
 */
export function installedCodec(from: readonly string[] = [join(process.cwd(), "package.json"), import.meta.url]): {
  binary?: string;
  supported?: boolean;
} {
  for (const base of from) {
    try {
      const codecs = createRequire(base);
      const targets = codecs(codecs.resolve("@uberscene/codecs/targets.json")) as Target[];
      const libc = process.platform !== "linux" ? undefined : glibc() ? "glibc" : "musl";
      const target = targets.find(
        (t) => t.os === process.platform && t.cpu === process.arch && (t.libc === undefined || t.libc === libc),
      );
      if (!target) return { supported: false };
      // The platform package is a dependency of @uberscene/codecs, so it resolves from there.
      const inner = createRequire(codecs.resolve("@uberscene/codecs/package.json"));
      const binary = join(dirname(inner.resolve(`${target.package}/package.json`)), "bin", target.binary);
      if (existsSync(binary)) return { binary, supported: true };
      return { supported: true };
    } catch {
      // Not installed here: look from the next place.
    }
  }
  return {};
}

const glibc = (): boolean =>
  Boolean((process.report?.getReport() as { header?: { glibcVersionRuntime?: string } })?.header?.glibcVersionRuntime);

/**
 * The native codec binary: `UBERSCENE_CODEC_BIN`; else, in a checkout of the repository, the one `pnpm native:build`
 * made (so a fresh build is never shadowed by an older packaged one); else the one `@uberscene/codecs` installed.
 */
export function codecBinary(
  env: NodeJS.ProcessEnv = process.env,
  installed: () => ReturnType<typeof installedCodec> = installedCodec,
  built = process.platform === "win32" ? `${BUILT}.exe` : BUILT,
): string {
  const named = env.UBERSCENE_CODEC_BIN;
  if (named) {
    if (!existsSync(named)) throw new Error(`UBERSCENE_CODEC_BIN names ${named}, which does not exist`);
    return named;
  }
  if (existsSync(built)) return built;
  const found = installed();
  if (found.binary) return found.binary;
  throw new Error(
    found.supported === false
      ? `UBERSCENE_CODECS asks for the native codecs, and @uberscene/codecs has no binary for ${process.platform} ${process.arch}: build uberscene-codec from the UberScene repository (\`pnpm native:build\`) and set UBERSCENE_CODEC_BIN to it`
      : "UBERSCENE_CODECS asks for the native codecs, which are not installed: run `npm install @uberscene/codecs`, or set UBERSCENE_CODEC_BIN to an uberscene-codec binary",
  );
}
