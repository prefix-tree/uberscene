import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { collectModule, loadModule, resolve, subtitles } from "@uberscene/sdk";

import generateMedia, { mediaDir } from "../../player/e2e/gen-media";
import { addAsset, snippetOf } from "../src";

const scratch = join(import.meta.dirname, ".tmp", "add");
let dir = "";

const SRT = `1
00:00:01,000 --> 00:00:02,000
Small software

2
00:00:03,000 --> 00:00:04,000
deserves a real cloud.
`;
const WHISPER = JSON.stringify({
  words: [
    { word: "Small", start: 1, end: 1.4 },
    { word: "software", start: 1.4, end: 2 },
  ],
});

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "a-"));
  for (const f of ["bars.webm", "solid.webm", "logo.png"]) copyFileSync(join(mediaDir, f), join(dir, f));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const manifestAt = (path: string) => JSON.parse(readFileSync(path, "utf8"));

describe("addAsset", () => {
  it("probes a video and writes its entry into a new manifest in the current folder", async () => {
    const result = await addAsset(join(dir, "bars.webm"), { cwd: dir });
    expect(result.manifest).toBe(join(dir, "uberscene.json"));
    expect(snippetOf(result)).toBe('<Clip id="bars" src="asset:bars" />');
    expect(manifestAt(result.manifest).assets.bars).toEqual({
      id: "bars",
      kind: "video",
      duration: 10,
      fps: 30,
      width: 640,
      height: 360,
      audio: { sampleRate: 48000, channels: 1, streams: 1 },
    });
  });

  it("probes a silent video and an image, and keeps the other assets", async () => {
    const manifest = join(dir, "two.json");
    await addAsset(join(dir, "solid.webm"), { manifest });
    await addAsset(join(dir, "logo.png"), { manifest, id: "logo-red" });
    const { assets } = manifestAt(manifest);
    expect(assets.solid).toMatchObject({ kind: "video", duration: 2, width: 640, height: 360 });
    expect(assets.solid.audio).toBeUndefined();
    expect(assets["logo-red"]).toEqual({ id: "logo-red", kind: "image", duration: 0, width: 128, height: 128 });
  });

  it("lists a .cube LUT, checked, without looking for a transcript, and refuses a broken one", async () => {
    const manifest = join(dir, "luts.json");
    const cube = ["LUT_3D_SIZE 2", ...Array.from({ length: 8 }, () => "0.5 0.5 0.5")].join("\n");
    writeFileSync(join(dir, "teal.cube"), cube);
    writeFileSync(join(dir, "teal.srt"), "1\n00:00:00,000 --> 00:00:01,000\nhi\n");
    const result = await addAsset(join(dir, "teal.cube"), { manifest });
    expect(manifestAt(manifest).assets.teal).toEqual({ id: "teal", kind: "lut", duration: 0 });
    expect(result.transcript).toBeUndefined();
    expect(snippetOf(result)).toBeNull();
    writeFileSync(join(dir, "broken.cube"), "LUT_3D_SIZE 2\n0 0 0");
    await expect(addAsset(join(dir, "broken.cube"), { manifest })).rejects.toThrow("1 values, expected 2³ = 8");
  });

  it("reads the transcript beside the media, JSON before subtitles, and keeps fields it does not own", async () => {
    const manifest = join(dir, "words.json");
    writeFileSync(
      manifest,
      JSON.stringify({
        assets: { bars: { id: "bars", kind: "video", duration: 1, shots: [{ i: 0, start: 0, end: 5 }] } },
      }),
    );
    writeFileSync(join(dir, "bars.srt"), SRT);
    const fromSrt = await addAsset(join(dir, "bars.webm"), { manifest });
    expect(fromSrt).toMatchObject({ transcript: join(dir, "bars.srt"), estimated: true });
    const bars = manifestAt(manifest).assets.bars;
    expect(bars.duration).toBe(10);
    expect(bars.shots).toEqual([{ i: 0, start: 0, end: 5 }]);
    expect(bars.transcript.words.map((w: { text: string }) => w.text)).toEqual([
      "Small",
      "software",
      "deserves",
      "a",
      "real",
      "cloud.",
    ]);

    writeFileSync(join(dir, "bars.json"), WHISPER);
    const fromJson = await addAsset(join(dir, "bars.webm"), { manifest });
    expect(fromJson).toMatchObject({ transcript: join(dir, "bars.json"), estimated: false });
    expect(manifestAt(manifest).assets.bars.transcript.words).toEqual([
      { i: 0, text: "Small", start: 1, end: 1.4 },
      { i: 1, text: "software", start: 1.4, end: 2 },
    ]);
    rmSync(join(dir, "bars.json"));
    rmSync(join(dir, "bars.srt"));
  });

  it("takes a transcript named elsewhere, and warns when its words outrun the media", async () => {
    const other = join(dir, "other.srt");
    writeFileSync(
      other,
      SRT.replace("00:00:03,000 --> 00:00:04,000", "00:00:03,000 --> 00:00:04,000\n\n3\n00:00:20,000 --> 00:00:21,000"),
    );
    const result = await addAsset(join(dir, "solid.webm"), { manifest: join(dir, "w.json"), transcript: other });
    expect(result.warnings.join(" ")).toMatch(/end after the media does \(2 s\)/);
    await expect(addAsset(join(dir, "nope.webm"))).rejects.toThrow("does not exist");
  });

  it("reads back the SRT an export writes: every word lands inside its cue", async () => {
    const words = "Small software deserves a real cloud. It should cost less than lunch.".split(" ");
    const manifest = {
      assets: {
        bars: {
          id: "bars",
          kind: "video" as const,
          duration: 10,
          transcript: { words: words.map((text, i) => ({ i, text, start: 0.5 + i * 0.6, end: 1 + i * 0.6 })) },
        },
      },
    };
    const state = resolve(
      collectModule(
        loadModule(`import { Captions, Clip, Composition, Track } from "@uberscene/kit";
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main"><Clip id="c" src="asset:bars" in={0} out={10} /></Track>
      <Captions id="cc" src="asset:bars" />
    </Composition>
  );
}`) as never,
      ),
      manifest,
    );
    const round = join(dir, "round");
    mkdirSync(round);
    copyFileSync(join(mediaDir, "bars.webm"), join(round, "bars.webm"));
    writeFileSync(join(round, "bars.srt"), subtitles(state, { format: "srt" }));
    const { entry } = await addAsset(join(round, "bars.webm"), { cwd: round });
    const cues = [...state.items.values()].filter((p) => p.kind === "caption");
    expect(entry.transcript?.words.map((w) => w.text.toLowerCase())).toEqual(words.map((w) => w.toLowerCase()));
    for (const w of entry.transcript?.words ?? [])
      expect(cues.some((c) => w.start >= c.start - 0.001 && w.end <= c.end + 0.001)).toBe(true);
  });

  it("writes the nearest uberscene.json above the current folder", async () => {
    const project = mkdtempSync(join(scratch, "p-"));
    const media = join(project, "media");
    mkdirSync(media);
    copyFileSync(join(mediaDir, "solid.webm"), join(media, "solid.webm"));
    writeFileSync(join(project, "uberscene.json"), JSON.stringify({ assets: {} }));
    const result = await addAsset(join(media, "solid.webm"), { cwd: media });
    expect(result.manifest).toBe(join(project, "uberscene.json"));
    expect(manifestAt(result.manifest).assets.solid.kind).toBe("video");
  });

  it("keeps writing a manifest.json that is already beside the media", async () => {
    const project = mkdtempSync(join(scratch, "o-"));
    const media = join(project, "media");
    mkdirSync(media);
    copyFileSync(join(mediaDir, "solid.webm"), join(media, "solid.webm"));
    writeFileSync(join(media, "manifest.json"), JSON.stringify({ assets: {} }));
    const result = await addAsset(join(media, "solid.webm"), { cwd: project });
    expect(result.manifest).toBe(join(media, "manifest.json"));
  });
});

/** A 16-bit mono WAV of clicks at `bpm` from `first` seconds: a short burst on each beat. */
function clickWav(path: string, bpm: number, first: number, seconds: number): void {
  const sr = 44100;
  const n = Math.round(seconds * sr);
  const data = Buffer.alloc(n * 2);
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296 - 0.5;
  };
  for (let t = first; t < seconds; t += 60 / bpm) {
    const at = Math.round(t * sr);
    for (let i = 0; i < 0.03 * sr && at + i < n; i++)
      data.writeInt16LE(Math.round(rnd() * 1.6 * Math.exp(-i / (0.006 * sr)) * 20000), (at + i) * 2);
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(sr, 24);
  head.writeUInt32LE(sr * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([head, data]));
}

describe("addAsset: beats", () => {
  it("finds the beats of a sound file with no transcript, and a clip cuts on beat:N", async () => {
    clickWav(join(dir, "song.wav"), 120, 0.5, 10);
    const result = await addAsset(join(dir, "song.wav"), { cwd: dir });
    const entry = manifestAt(result.manifest).assets.song;
    expect(entry.tempo).toBeGreaterThan(118);
    expect(entry.tempo).toBeLessThan(122);
    expect(entry.beats.length).toBeGreaterThanOrEqual(18);
    expect(Math.abs(entry.beats[0].start - 0.5)).toBeLessThan(0.03);

    const manifest = manifestAt(result.manifest);
    const state = resolve(
      collectModule(
        loadModule(`import { Audio, Composition, Title, Track } from "@uberscene/kit";
export default () => (
  <Composition fps={30} width={640} height={360}>
    <Track id="music" layout="free"><Audio id="song" src="asset:song" start={0} in="beat:0" out="beat:15.end" /></Track>
    <Track id="text" layout="free"><Title id="hit" anchor="song" at="beat:4" duration={1}>Now</Title></Track>
  </Composition>
);`) as never,
        {},
      ),
      manifest,
    );
    expect(state.errors).toEqual([]);
    const beat = (i: number) => entry.beats[i].start as number;
    // The title starts on beat 4, counted in what the song plays (it starts at beat 0).
    expect(state.items.get("hit")?.start).toBeCloseTo(beat(4) - beat(0), 2);
    expect(state.items.get("song")?.duration).toBeCloseTo(entry.beats[15].end - beat(0), 2);
  });

  it("sets a grid with a tempo and a first beat, and finds no beats when told not to", async () => {
    clickWav(join(dir, "loop.wav"), 100, 0, 4);
    const grid = await addAsset(join(dir, "loop.wav"), { cwd: dir, bpm: 90, firstBeat: 0.2 });
    expect(grid.entry.tempo).toBe(90);
    expect(grid.entry.beats?.slice(0, 3).map((b) => b.start)).toEqual([0.2, 0.867, 1.533]);

    clickWav(join(dir, "fx.wav"), 100, 0, 4);
    const none = await addAsset(join(dir, "fx.wav"), { cwd: dir, beats: false });
    expect(none.entry.beats).toBeUndefined();
  });
});
