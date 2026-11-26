import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { checkSync, formatSync, inspect, loadVideo } from "../src";

const scratch = join(import.meta.dirname, ".tmp", "sync");
const cli = join(import.meta.dirname, "..", "src", "cli.ts");
let dir = "";
let file = "";

// A song at 120 BPM whose first beat is at 0.3 s. "late" starts 100 ms after beat 6.
const beats = Array.from({ length: 40 }, (_, i) => ({ i, start: 0.3 + i * 0.5, end: 0.8 + i * 0.5 }));
const video = (lateStart: string) => `import { Audio, Clip, Composition, Track } from "@uberscene/kit";
export const manifest = { assets: {
  song: { id: "song", kind: "audio", duration: 20.5, tempo: 120, audio: { sampleRate: 48000, channels: 2, streams: 1 },
    beats: ${JSON.stringify(beats)} },
  pour: { id: "pour", kind: "video", duration: 30, fps: 30, width: 640, height: 360 },
} };
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="music" layout="free" role="music">
        <Audio id="song" src="asset:song" start={0} in="beat:0" out="beat:15.end" />
      </Track>
      <Track id="shots" layout="free">
        <Clip id="first" src="asset:pour" anchor="song" at="beat:2" in={2} duration={1} />
        <Clip id="late" src="asset:pour" ${lateStart} in={6} duration={1} />
      </Track>
    </Composition>
  );
}
`;

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "s-"));
  file = join(dir, "video.tsx");
  writeFileSync(file, video("start={3.1}"));
  writeFileSync(join(dir, "fixed.tsx"), video('anchor="song" at="beat:6"'));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("checkSync", () => {
  it("prints the music, each start against its beat, the miss with its fix, and a summary", async () => {
    const { state } = await loadVideo(file);
    expect(
      formatSync("video.tsx", checkSync(state)),
    ).toBe(`music: song  120 BPM  a beat every 0.50 s  beat:0 to beat:15  0.00–8.00 s  (beats detected)
     1.00  start  first                     on    song@beat:2  (tied to the beat)
     3.10  start  late                      near  song@beat:6  100 ms after it
video.tsx: near-beat: "late" at 3.10 s is 100 ms after beat 6 of "song" (3.00 s): close enough to read as a miss
  fix: start it on the beat: anchor="song" at="beat:6"
1 of 2 cuts and starts on the beat, 1 just off it, 0 elsewhere; 1 tied to a beat. 1 sync issue.
`);
  });

  it("says so when no music with beats plays", async () => {
    const silent = join(dir, "silent.tsx");
    writeFileSync(
      silent,
      `import { Composition, Title } from "@uberscene/kit";
export const manifest = { assets: {} };
export default function Video() {
  return <Composition fps={30} width={640} height={360}><Title id="t" start={0} duration={2}>Hi</Title></Composition>;
}
`,
    );
    const { state } = await loadVideo(silent);
    expect(formatSync("silent.tsx", checkSync(state))).toContain("no music with beats plays");
  });
});

describe("inspect --events", () => {
  it("prints every moment on a line, and as JSON; a stretch and kinds narrow it", async () => {
    const { state } = await loadVideo(file);
    const text = inspect("video.tsx", state, { events: true, in: "2.9..3.6" });
    expect(text.errors).toEqual([]);
    expect(text.output).toBe(`   3.00  f90     beat     song 6
   3.10  f93     start    late  clip  100 ms after song@beat:6
   3.50  f105    beat     song 7
`);
    const json = JSON.parse(inspect("video.tsx", state, { events: true, kinds: "start", json: true }).output);
    expect(json.events.map((e: { of: string }) => e.of)).toEqual(["song", "first", "late"]);
    expect(json.events[2].nearestBeat).toEqual({ clip: "song", i: 6, time: 3, offsetMs: 100, offsetFrames: 3 });
  });

  it("refuses a kind it does not have, and --in without --events", async () => {
    const { state } = await loadVideo(file);
    expect(inspect("video.tsx", state, { events: true, kinds: "bar" }).errors[0]).toContain('"bar" is not one of');
    expect(inspect("video.tsx", state, { in: "2..3" }).errors).toEqual(["--in and --kinds go with --events"]);
  });

  it("shows the music in the timeline: the track's role, the tempo and the beats played", async () => {
    const { state } = await loadVideo(file);
    const { output } = inspect("video.tsx", state);
    expect(output).toContain("track music (free, music)");
    expect(output).toContain("audio       song  asset:song 0.30–8.30  120 BPM  beat:0–15");
    expect(output).toContain(
      "music: song  120 BPM  a beat every 0.50 s  beat:0 at 0.00 s to beat:15  (beats detected)",
    );
  });
});

describe("the CLI", () => {
  const env = { ...process.env, NO_COLOR: "1" };

  it("--check-sync exits 3 with an issue and prints JSON with --json; 0 once the start is tied to its beat", () => {
    const run = spawnSync("node", ["--import", "tsx", cli, file, "--check-sync", "--json"], { encoding: "utf8", env });
    expect(run.status).toBe(3);
    const report = JSON.parse(run.stdout);
    expect(report.summary).toEqual({ points: 2, on: 1, near: 1, off: 0, anchored: 1, outsideMusic: 0 });
    expect(report.issues[0]).toMatchObject({ rule: "near-beat", id: "late" });
    const fixed = spawnSync("node", ["--import", "tsx", cli, join(dir, "fixed.tsx"), "--check-sync"], {
      encoding: "utf8",
      env,
    });
    expect(fixed.status).toBe(0);
    expect(fixed.stdout).toContain("2 of 2 cuts and starts on the beat");
  });

  it("inspect --events --kinds cut,beat --in prints the events of a stretch", () => {
    const run = spawnSync(
      "node",
      ["--import", "tsx", cli, "inspect", file, "--events", "--kinds", "beat", "--in", "0..1", "--json"],
      { encoding: "utf8", env },
    );
    expect(run.status).toBe(0);
    expect(JSON.parse(run.stdout).events.map((e: { i: number }) => e.i)).toEqual([0, 1, 2]);
  });
});
