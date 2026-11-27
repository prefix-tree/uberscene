// Strudel, fetched on first use (decision 0042). Strudel is AGPL-3.0-or-later, so it is never a dependency of
// UberScene: the pinned packages are installed from npm into the cache, after its licence has been shown and
// accepted, and bundled there with esbuild (installed beside them, MIT) into the one script the render page loads.
// The combination exists only on the machine that renders; no one conveys it.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

/** The versions used, pinned, and checked by the spike's measures (scripts/strudel-spike.ts) when they change. */
export const STRUDEL_PACKAGES = {
  "@strudel/core": "1.2.6",
  "@strudel/mini": "1.2.6",
  "@strudel/tonal": "1.2.6",
  "@strudel/transpiler": "1.2.6",
  superdough: "1.3.0",
} as const;
/** What bundles them, in the cache. */
const BUNDLER = { esbuild: "0.28.2" } as const;

export const STRUDEL_LICENCE = "AGPL-3.0-or-later";
const VERSION = Object.values(STRUDEL_PACKAGES).join("-");

/** Where Strudel lives: `UBERSCENE_STRUDEL_CACHE`, else `~/.cache/uberscene/strudel/<versions>`. */
export function strudelCacheDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.UBERSCENE_STRUDEL_CACHE ?? join(homedir(), ".cache", "uberscene", "strudel", VERSION);
}

/** What is shown before Strudel is fetched the first time. */
export function strudelNotice(env: NodeJS.ProcessEnv = process.env): string {
  return [
    `Strudel (${Object.entries(STRUDEL_PACKAGES)
      .map(([n, v]) => `${n}@${v}`)
      .join(", ")}) is licensed ${STRUDEL_LICENCE}: https://codeberg.org/uzu/strudel`,
    `UberScene does not ship it: it is installed from npm into ${strudelCacheDir(env)} and run on your machine.`,
    "Running it and using the music it makes carries no conditions; passing Strudel on does, under its licence.",
  ].join("\n");
}

/** Thrown when Strudel's licence has not been accepted and there is no one to ask. */
export class StrudelLicenceNotAccepted extends Error {
  constructor() {
    super(`${strudelNotice()}\nAccept it with acceptLicence: true, or UBERSCENE_ACCEPT_LICENCE=strudel.`);
  }
}

function acceptancePath(env: NodeJS.ProcessEnv): string {
  return join(strudelCacheDir(env), "accepted.json");
}

/** Whether Strudel's licence has been accepted on this machine, for these versions. */
export function strudelAccepted(env: NodeJS.ProcessEnv = process.env): boolean {
  if (existsSync(acceptancePath(env))) return true;
  return (env.UBERSCENE_ACCEPT_LICENCE ?? "")
    .split(",")
    .map((s) => s.trim())
    .includes("strudel");
}

function recordAcceptance(env: NodeJS.ProcessEnv): void {
  mkdirSync(strudelCacheDir(env), { recursive: true });
  writeFileSync(
    acceptancePath(env),
    `${JSON.stringify({ licence: STRUDEL_LICENCE, packages: STRUDEL_PACKAGES, at: new Date().toISOString() }, null, 2)}\n`,
  );
}

/**
 * Accepts the licence: already accepted, by `accept`, or by the person at the terminal, who is shown it first. With no
 * one to ask, throws `StrudelLicenceNotAccepted`.
 */
async function ensureAccepted(accept: boolean, log: (m: string) => void, env: NodeJS.ProcessEnv): Promise<void> {
  if (strudelAccepted(env)) return;
  log(strudelNotice(env));
  if (!accept) {
    if (!process.stdin.isTTY) throw new StrudelLicenceNotAccepted();
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    const answer = (await rl.question(`Accept ${STRUDEL_LICENCE} and install Strudel? [y/N] `)).trim().toLowerCase();
    rl.close();
    if (answer !== "y" && answer !== "yes") throw new StrudelLicenceNotAccepted();
  }
  recordAcceptance(env);
}

/** The page's module: evaluates a score, plays its events through superdough into an OfflineAudioContext. */
const PAGE_ENTRY = `
import * as core from "@strudel/core";
import * as mini from "@strudel/mini";
import * as tonal from "@strudel/tonal";
import { evaluate } from "@strudel/transpiler";
import { initAudio, registerSynthSounds, setAudioContext, superdough } from "superdough";

const toBase64 = (floats) => {
  const bytes = new Uint8Array(floats.buffer, floats.byteOffset, floats.byteLength);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

let ready;
window.renderScore = async ({ code, cps, seconds, rate, seed }) => {
  // A seeded Math.random, so noise voices sound the same on every render.
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  ready ??= core.evalScope(core, mini, tonal);
  await ready;
  const { pattern } = await evaluate(code);
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
  setAudioContext(ctx);
  registerSynthSounds();
  await initAudio({});
  const events = [];
  for (const hap of pattern.queryArc(0, seconds * cps).filter((h) => h.hasOnset())) {
    const from = Number(hap.whole.begin), to = Number(hap.whole.end);
    events.push({ time: from / cps, duration: (to - from) / cps, value: hap.value });
    await superdough(hap.value, from / cps, (to - from) / cps, cps, from);
  }
  const buffer = await ctx.startRendering();
  return {
    events: events.map((e) => ({
      time: e.time,
      duration: e.duration,
      s: e.value.s ?? null,
      note: e.value.note ?? e.value.n ?? null,
      gain: typeof e.value.gain === "number" ? e.value.gain : 1,
      voice: typeof e.value.voice === "string" ? e.value.voice : null,
    })),
    left: toBase64(buffer.getChannelData(0)),
    right: toBase64(buffer.getChannelData(1)),
  };
};
window.strudelReady = true;
`;

export interface StrudelEngineOptions {
  /** Accept Strudel's licence without asking (it is still shown the first time). */
  readonly acceptLicence?: boolean;
  readonly log?: (message: string) => void;
  readonly env?: NodeJS.ProcessEnv;
}

/**
 * The page script, built once into the cache: Strudel installed (after its licence is accepted) and bundled with its
 * entry into one module.
 */
export async function strudelPageScript(options: StrudelEngineOptions = {}): Promise<string> {
  const env = options.env ?? process.env;
  const log = options.log ?? ((m: string) => process.stderr.write(`${m}\n`));
  const dir = strudelCacheDir(env);
  // Named by the entry's content, so a change to the page is built again rather than hidden by an older build.
  const built = join(dir, "dist", `page-${createHash("sha256").update(PAGE_ENTRY).digest("hex").slice(0, 12)}.js`);
  if (existsSync(built)) return readFileSync(built, "utf8");
  await ensureAccepted(options.acceptLicence ?? false, log, env);
  if (!existsSync(join(dir, "node_modules", "superdough", "package.json"))) {
    log(`Installing Strudel into ${dir}`);
    // The folder may not exist yet: the licence can be accepted by UBERSCENE_ACCEPT_LICENCE without a record in it.
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "package.json"),
      `${JSON.stringify({ private: true, dependencies: { ...STRUDEL_PACKAGES, ...BUNDLER } }, null, 2)}\n`,
    );
    // npm checks each package against the registry's integrity hash as it installs.
    execFileSync("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: dir, stdio: "inherit" });
  }
  writeFileSync(join(dir, "page.mjs"), PAGE_ENTRY);
  mkdirSync(join(dir, "dist"), { recursive: true });
  execFileSync(
    join(dir, "node_modules", ".bin", "esbuild"),
    ["page.mjs", "--bundle", "--format=esm", "--platform=browser", "--log-level=warning", `--outfile=${built}`],
    { cwd: dir, stdio: "inherit" },
  );
  return readFileSync(built, "utf8");
}
