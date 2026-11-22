// The native codecs as an npm package: `uberscene-codec`, built from `native/` in the repository, one package per
// platform. This package lists them as optional dependencies, so an install brings the one that fits the machine,
// and `binaryPath()` says where it landed. `@uberscene/render` asks it when `UBERSCENE_CODECS` wants native codecs.
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import targets from "../targets.json" with { type: "json" };

export interface CodecTarget {
  /** The npm package that carries the binary: `@uberscene/codecs-darwin-arm64`. */
  readonly package: string;
  /** Its folder under `platforms/`. */
  readonly dir: string;
  /** The Rust target it is built for. */
  readonly rust: string;
  readonly os: string;
  readonly cpu: string;
  /** On Linux, the C library the binary links: `glibc`. */
  readonly libc?: string;
  /** The binary's file name in the package's `bin/`. */
  readonly binary: string;
}

/** Every platform a binary is published for. */
export const TARGETS: readonly CodecTarget[] = targets;

export interface Machine {
  readonly platform: string;
  readonly arch: string;
  /** On Linux: `glibc` or `musl`. */
  readonly libc?: string | undefined;
}

/** The machine this process runs on. */
export function thisMachine(): Machine {
  const machine = { platform: process.platform, arch: process.arch };
  if (process.platform !== "linux") return machine;
  // Node says which glibc it runs on; on musl (Alpine) it says none.
  const header = (process.report?.getReport() as { header?: { glibcVersionRuntime?: string } } | undefined)?.header;
  return { ...machine, libc: header?.glibcVersionRuntime ? "glibc" : "musl" };
}

/** The target published for a machine, if there is one. */
export function targetFor(machine: Machine = thisMachine()): CodecTarget | null {
  return (
    TARGETS.find(
      (t) => t.os === machine.platform && t.cpu === machine.arch && (t.libc === undefined || t.libc === machine.libc),
    ) ?? null
  );
}

/**
 * Where this machine's `uberscene-codec` is, or null when its package is not installed: a platform none is published
 * for, or an install that left optional dependencies out.
 */
export function binaryPath(machine: Machine = thisMachine()): string | null {
  const target = targetFor(machine);
  if (!target) return null;
  try {
    const manifest = createRequire(import.meta.url).resolve(`${target.package}/package.json`);
    const binary = join(dirname(manifest), "bin", target.binary);
    return existsSync(binary) ? binary : null;
  } catch {
    return null;
  }
}
