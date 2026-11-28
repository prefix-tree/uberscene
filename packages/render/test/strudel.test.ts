import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createLoudnessMeter } from "../src/loudness";
import { STRUDEL_LICENCE, strudelAccepted, strudelCacheDir, strudelNotice } from "../src/strudel/engine";
import { masterGain, writeStrudelWav } from "../src/strudel/render";

const RATE = 48_000;
/** A second of a 220 Hz sine at `amp`, on both channels. */
function tone(amp: number, seconds = 1) {
  const left = new Float32Array(RATE * seconds).map((_, i) => amp * Math.sin((2 * Math.PI * 220 * i) / RATE));
  return { left, right: left.slice(), rate: RATE };
}

describe("Strudel's licence", () => {
  it("is not accepted on a fresh cache, and names the licence and where it goes", () => {
    const env = { UBERSCENE_STRUDEL_CACHE: mkdtempSync(join(tmpdir(), "strudel-")) };
    expect(strudelAccepted(env)).toBe(false);
    expect(strudelNotice(env)).toContain(STRUDEL_LICENCE);
    expect(strudelNotice(env)).toContain(strudelCacheDir(env));
    // chord() and voicing() come from tonal, so it is pinned and named with the rest.
    expect(strudelNotice(env)).toContain("@strudel/tonal@");
  });

  it("is accepted by UBERSCENE_ACCEPT_LICENCE=strudel, among other names", () => {
    const env = {
      UBERSCENE_STRUDEL_CACHE: mkdtempSync(join(tmpdir(), "strudel-")),
      UBERSCENE_ACCEPT_LICENCE: "rvm, strudel",
    };
    expect(strudelAccepted(env)).toBe(true);
  });
});

describe("masterGain", () => {
  it("brings a quiet render to the target loudness under the ceiling", () => {
    const render = tone(0.01);
    const gain = masterGain(render, -14, -1);
    const out = (v: number) => 10 ** (-1 / 20) * Math.tanh((v * gain) / 10 ** (-1 / 20));
    const meter = createLoudnessMeter(RATE);
    meter.add(render.left.map(out), render.right.map(out));
    expect(meter.result().lufs).toBeCloseTo(-14, 0);
    expect(Math.max(...render.left.map(out))).toBeLessThan(10 ** (-1 / 20));
  });
});

describe("writeStrudelWav", () => {
  it("writes 16-bit stereo at the render's rate, soft-clipped under the ceiling", () => {
    const file = join(mkdtempSync(join(tmpdir(), "strudel-")), "out.wav");
    writeStrudelWav(file, tone(2), { ceiling: -6 });
    const wav = readFileSync(file);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.readUInt16LE(22)).toBe(2);
    expect(wav.readUInt32LE(24)).toBe(RATE);
    expect(wav.readUInt16LE(34)).toBe(16);
    let peak = 0;
    for (let i = 44; i < wav.length; i += 2) peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
    expect(peak / 32767).toBeLessThanOrEqual(10 ** (-6 / 20) + 1e-4);
    expect(peak / 32767).toBeGreaterThan(0.45);
  });
});
