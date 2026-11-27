// A Strudel score rendered to sound, offline, in the export's Chrome (decision 0042): the pattern is evaluated, each of
// its events is played through superdough into an OfflineAudioContext at the time the pattern gives it, and the
// result is written as a 16-bit stereo WAV. One page per render, Math.random seeded, so the same score sounds the same.
import { writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { createLoudnessMeter } from "../loudness";
import { findChrome } from "../web/chrome";
import { FLAGS } from "../web/engine";
import { type StrudelEngineOptions, strudelPageScript } from "./engine";

export interface StrudelScore {
  /** The score: Strudel code whose value is a pattern, e.g. `stack(s("white*8"), note("c2*4").s("sine"))`. */
  readonly code: string;
  /** Cycles a second. At 4 beats a cycle, `cps = bpm / 240`. */
  readonly cps: number;
  /** How many seconds to render; events after it are left out, and sound still ringing is cut. */
  readonly seconds: number;
  /** Samples a second; default 48 000. */
  readonly rate?: number;
  /** Seeds Math.random for noise voices; default 1. */
  readonly seed?: number;
}

/** One event the pattern played: when, and what (its sound name and note, when it has them). */
export interface StrudelEvent {
  readonly time: number;
  readonly s: string | null;
  readonly note: string | number | null;
}

export interface StrudelRender {
  readonly rate: number;
  readonly left: Float32Array;
  readonly right: Float32Array;
  readonly events: readonly StrudelEvent[];
  /** Milliseconds the render took in the page. */
  readonly ms: number;
}

const decode = (b64: string): Float32Array => {
  const bytes = Buffer.from(b64, "base64");
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
};

/** Renders a score to samples. Fetches Strudel on first use, after its licence (see engine.ts). */
export async function renderStrudel(score: StrudelScore, options: StrudelEngineOptions = {}): Promise<StrudelRender> {
  const script = await strudelPageScript(options);
  const rate = score.rate ?? 48_000;
  const server = createServer((req, res) => {
    const js = req.url === "/page.js";
    res
      .writeHead(200, { "content-type": js ? "text/javascript" : "text/html" })
      .end(js ? script : `<!doctype html><script type="module" src="/page.js"></script>`);
  });
  // AudioWorklets need a secure origin: 127.0.0.1 is one.
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ headless: true, args: FLAGS, executablePath: await findChrome() });
  try {
    // One page per render: superdough keeps module-wide state tied to the first AudioContext it plays on.
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(url);
    await page.waitForFunction("window.strudelReady === true", undefined, { timeout: 60_000 }).catch(() => {
      throw new Error(`the Strudel page did not load: ${errors.join("; ")}`);
    });
    const started = Date.now();
    const r = (await page
      .evaluate(
        // @ts-expect-error: renderScore is the page's.
        (job) => window.renderScore(job),
        { code: score.code, cps: score.cps, seconds: score.seconds, rate, seed: score.seed ?? 1 },
      )
      .catch((e: Error) => {
        throw new Error(`the score did not render: ${e.message}${errors.length ? `; ${errors.join("; ")}` : ""}`);
      })) as { events: StrudelEvent[]; left: string; right: string };
    return { rate, left: decode(r.left), right: decode(r.right), events: r.events, ms: Date.now() - started };
  } finally {
    await browser.close();
    server.close();
  }
}

/** The soft clip a limiter would apply: linear well under the ceiling, bending smoothly into it. */
function shaper(gain: number, ceiling: number | undefined): (v: number) => number {
  const limit = ceiling === undefined ? 1 : 10 ** (ceiling / 20);
  return (v) => {
    const x = v * gain;
    return ceiling === undefined ? Math.max(-1, Math.min(1, x)) : limit * Math.tanh(x / limit);
  };
}

/** The integrated loudness (LUFS) of a render after `gain` and the soft clip under `ceiling`. */
function loudnessAfter(render: Pick<StrudelRender, "left" | "right" | "rate">, gain: number, ceiling?: number): number {
  const shape = shaper(gain, ceiling);
  const meter = createLoudnessMeter(render.rate);
  meter.add(render.left.map(shape), render.right.map(shape));
  return meter.result().lufs ?? -70;
}

/**
 * The gain that brings a render to `lufs` once soft-clipped under `ceiling` (dBFS): found by measuring, since the clip
 * takes a little loudness back the louder it is driven.
 */
export function masterGain(render: Pick<StrudelRender, "left" | "right" | "rate">, lufs: number, ceiling = -1): number {
  let gain = 1;
  for (let i = 0; i < 6; i++) {
    const off = lufs - loudnessAfter(render, gain, ceiling);
    if (Math.abs(off) < 0.05) break;
    gain *= 10 ** (off / 20);
  }
  return gain;
}

/**
 * Writes a render as a 16-bit stereo WAV. `gain` scales it first; `ceiling` (dBFS) soft-clips the peaks under that
 * level, as a limiter would, so a loud score masters without hard clipping.
 */
export function writeStrudelWav(
  file: string,
  render: Pick<StrudelRender, "left" | "right" | "rate">,
  { gain = 1, ceiling }: { gain?: number; ceiling?: number } = {},
): void {
  const { left, right, rate } = render;
  const shape = shaper(gain, ceiling);
  const data = Buffer.alloc(left.length * 4);
  for (let i = 0; i < left.length; i++) {
    data.writeInt16LE(Math.round(shape(left[i] as number) * 32767), i * 4);
    data.writeInt16LE(Math.round(shape(right[i] ?? 0) * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0, "ascii");
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8, "ascii");
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 4, 28);
  head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36, "ascii");
  head.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([head, data]));
}
