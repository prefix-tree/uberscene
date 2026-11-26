// The spike behind decision 0042 (music as code): can a Strudel pattern be rendered offline, in the export's Chrome,
// to sound that lands exactly on the pattern's own times, the same on every run?
//
//   pnpm --filter @uberscene/render exec tsx scripts/strudel-spike.ts [out.wav]
//
// Strudel is AGPL-3.0-or-later, so it is never a dependency of this repository: the script installs a pinned version
// into ~/.cache/uberscene/strudel-spike on first run, after saying so, bundles it there into one page script, and
// serves that page to Chrome from 127.0.0.1 (AudioWorklets need a secure origin). It renders a two-section pattern
// made of synth voices only (no samples), writes it as a WAV to listen to, and measures:
//   - how far each kick's first sample is from the time the pattern gives it (queryArc / cps);
//   - whether two renders are the same, with Math.random seeded in the page (noise voices use it).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";
import { build } from "vite";

import { findChrome } from "../src/web/chrome";
import { FLAGS } from "../src/web/engine";

/** The versions tried, pinned. All four are AGPL-3.0-or-later. */
const STRUDEL = {
  "@strudel/core": "1.2.6",
  "@strudel/mini": "1.2.6",
  "@strudel/transpiler": "1.2.6",
  superdough: "1.3.0",
};

const CPS = 0.5;
const RATE = 48_000;
const KICK = `note("c1*4").s("sine").decay(.18).sustain(0)`;
/** Two sections of two cycles each: hats alone, then kick, bass and hats. 8 seconds at 0.5 cycles a second. */
const SCORE = `arrange(
  [2, s("white*8").decay(.04).sustain(0).gain(.25)],
  [2, stack(${KICK}, note("<c2 g1>").s("sawtooth").lpf(600).gain(.3), s("white*8").decay(.04).sustain(0).gain(.2))]
)`;
/** Only the kick of the second section, for measuring onsets with nothing else sounding. */
const KICKS = `arrange([2, silence], [2, ${KICK}])`;

const PAGE = `
import * as core from "@strudel/core";
import * as mini from "@strudel/mini";
import { evaluate } from "@strudel/transpiler";
import { initAudio, registerSynthSounds, setAudioContext, superdough } from "superdough";

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
  ready ??= core.evalScope(core, mini);
  await ready;
  const { pattern } = await evaluate(code);
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
  setAudioContext(ctx);
  registerSynthSounds();
  await initAudio({});
  const onsets = [];
  for (const hap of pattern.queryArc(0, seconds * cps).filter((h) => h.hasOnset())) {
    const from = Number(hap.whole.begin), to = Number(hap.whole.end);
    onsets.push(from / cps);
    await superdough(hap.value, from / cps, (to - from) / cps, cps, from);
  }
  const buffer = await ctx.startRendering();
  return { onsets, left: Array.from(buffer.getChannelData(0)), right: Array.from(buffer.getChannelData(1)) };
};
window.spikeReady = true;
`;

interface Rendered {
  readonly onsets: number[];
  readonly left: number[];
  readonly right: number[];
}

const out = process.argv[2] ?? "strudel-spike.wav";
const cache = join(homedir(), ".cache", "uberscene", "strudel-spike");
await installStrudel(cache);
const script = await bundle(cache);
const server = createServer((req, res) => {
  const body = req.url === "/page.js" ? script : `<!doctype html><script type="module" src="/page.js"></script>`;
  res.writeHead(200, { "content-type": req.url === "/page.js" ? "text/javascript" : "text/html" }).end(body);
});
await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
const browser = await chromium.launch({ headless: true, args: FLAGS, executablePath: await findChrome() });
try {
  // One page per render: superdough keeps module-wide state tied to the first AudioContext it plays on.
  const render = async (code: string, seed = 1): Promise<Rendered & { ms: number }> => {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto(url);
      await page.waitForFunction("window.spikeReady === true", undefined, { timeout: 60_000 }).catch(() => {
        throw new Error(`the spike page did not load: ${errors.join("; ")}`);
      });
      const started = Date.now();
      const r = (await page.evaluate(
        // @ts-expect-error: renderScore is the page's.
        (job) => window.renderScore(job),
        { code, cps: CPS, seconds: 8, rate: RATE, seed },
      )) as Rendered;
      return { ...r, ms: Date.now() - started };
    } finally {
      await page.close();
    }
  };

  const score = await render(SCORE);
  writeWav(out, score.left, score.right, RATE);
  process.stdout.write(`score: 8 s rendered in ${score.ms} ms, ${score.onsets.length} events → ${out}\n`);

  const kicks = await render(KICKS);
  const errorsMs = kicks.onsets.map((t) => (firstSound(kicks.left, t, RATE) - t) * 1000);
  process.stdout.write(
    `kicks: ${kicks.onsets.length}, first sample after the pattern's time by ${Math.min(...errorsMs).toFixed(3)} to ${Math.max(...errorsMs).toFixed(3)} ms\n`,
  );

  const again = await render(SCORE);
  const diff = score.left.reduce((most, v, i) => Math.max(most, Math.abs(v - (again.left[i] ?? 0))), 0);
  process.stdout.write(
    `the same score rendered twice: largest difference ${diff.toExponential(2)} (${diff === 0 ? "identical" : `${(20 * Math.log10(diff)).toFixed(0)} dBFS`})\n`,
  );
} finally {
  await browser.close();
  server.close();
}

/** Installs the pinned Strudel packages into the cache, once, after saying what they are and their licence. */
async function installStrudel(dir: string): Promise<void> {
  if (existsSync(join(dir, "node_modules", "superdough", "package.json"))) return;
  const names = Object.entries(STRUDEL).map(([name, version]) => `${name}@${version}`);
  process.stdout.write(`Installing Strudel (${names.join(", ")}) into ${dir}.\n`);
  process.stdout.write(
    "Strudel is AGPL-3.0-or-later (https://codeberg.org/uzu/strudel); it is not part of UberScene.\n",
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ private: true, dependencies: STRUDEL }, null, 2));
  execFileSync("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: dir, stdio: "inherit" });
}

/** The page's script: Strudel and its entry bundled into one module, in the cache, by the repository's Vite. */
async function bundle(dir: string): Promise<string> {
  writeFileSync(join(dir, "page.mjs"), PAGE);
  await build({
    root: dir,
    logLevel: "warn",
    configFile: false,
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      outDir: join(dir, "dist"),
      emptyOutDir: true,
      minify: false,
      lib: { entry: join(dir, "page.mjs"), formats: ["es"], fileName: () => "page.js" },
    },
  });
  return readFileSync(join(dir, "dist", "page.js"), "utf8");
}

/** The time of the first sample at or after 10 ms before `t` that is louder than -60 dBFS. */
function firstSound(samples: readonly number[], t: number, rate: number): number {
  for (let i = Math.max(0, Math.round((t - 0.01) * rate)); i < samples.length; i++)
    if (Math.abs(samples[i]!) > 1e-3) return i / rate;
  return Number.NaN;
}

function writeWav(file: string, left: readonly number[], right: readonly number[], rate: number): void {
  const data = Buffer.alloc(left.length * 4);
  for (let i = 0; i < left.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i]!)) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i] ?? 0)) * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 4, 28);
  head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34);
  head.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([head, data]));
}
