import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { probe } from "../helpers/output";

const root = join(import.meta.dirname, "..", "..");
// Inside the package so the file can import @uberscene/kit.
const scratch = join(root, "test", ".tmp", "cli");
const cli = join(root, "src", "cli.ts");
const composition = join(root, "..", "player", "e2e", "app", "composition.tsx");
let dir = "";

function run(...args: string[]) {
  return spawnSync(join(root, "node_modules", ".bin", "tsx"), [cli, ...args], { cwd: dir, encoding: "utf8" });
}

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "cli-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("uberscene", () => {
  it("renders a TSX file with its own manifest and the asset folder", () => {
    const out = join(dir, "one.webm");
    const r = run(composition, "--media", mediaDir, "--out", out, "--to", "1", "--quiet");
    expect(r.stderr).toMatch(/30 frames, 640x360 at 30 fps, with sound/);
    expect(r.status).toBe(0);
    expect(probe(out)).toMatchObject({ codec: "vp9", frames: 30, audioStreams: 1 });
  });

  it("takes a manifest file, a silent flag and an mp4 name", () => {
    const manifest = join(dir, "manifest.json");
    writeFileSync(
      manifest,
      JSON.stringify({
        assets: { bars: { id: "bars", kind: "video", duration: 10, fps: 30, width: 640, height: 360 } },
      }),
    );
    const file = join(dir, "tiny.tsx");
    writeFileSync(
      file,
      `import { Clip, Composition, Track } from "@uberscene/kit";\nexport default function Video() { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:bars" in={0} out={0.5} /></Track></Composition>; }\n`,
    );
    const out = join(dir, "tiny.mp4");
    const r = run(file, "--manifest", manifest, "--media", mediaDir, "--out", out, "--silent", "--quiet");
    expect(r.stderr).toContain("15 frames");
    expect(r.status).toBe(0);
    expect(probe(out)).toMatchObject({ codec: "h264", frames: 15, audioStreams: 0 });
  });

  it("writes a still, and refuses a quality preset alongside a bitrate", () => {
    const out = join(dir, "frame.jpg");
    const r = run(composition, "--media", mediaDir, "--still", "1", "--out", out);
    expect(r.stderr).toContain("frame 30, 640x360");
    expect(r.status).toBe(0);
    expect(readFileSync(out).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    const q = run(
      composition,
      "--media",
      mediaDir,
      "--out",
      join(dir, "q.webm"),
      "--quality",
      "high",
      "--bitrate",
      "1000000",
    );
    expect(q.status).toBe(1);
    expect(q.stderr).toContain("pass one");
  });

  it("checks the layout and prints the issues as JSON", () => {
    const r = run(
      composition,
      "--media",
      mediaDir,
      "--check-layout",
      "--safe-zone",
      "0.1,0.1,0.1,0.1",
      "--subject",
      "0.4,0.2,0.2,0.6",
      "--step",
      "0.5",
      "--json",
    );
    const result = JSON.parse(r.stdout) as {
      samples: number;
      issues: { rule: string; id: string; from: number; to: number }[];
    };
    expect(result.issues.length).toBeGreaterThan(0);
    expect(r.status).toBe(3);
    expect(result.samples).toBe(14);
    for (const i of result.issues) expect(i.to).toBeGreaterThanOrEqual(i.from);
    expect(run(composition, "--check-layout", "--safe-zone", "nowhere").stderr).toContain("--safe-zone wants tiktok");
    const text = run(composition, "--media", mediaDir, "--check-layout", "--safe-zone", "tiktok", "--step", "0.5");
    expect(text.stdout).toMatch(/composition\.tsx:\d+:\d+: safe-zone: layer "l1" sticks out of the tiktok safe zone/);
    expect(text.stdout).toMatch(/ {2}fix: move it /);
    expect(text.status).toBe(3);
    const clean = run(composition, "--media", mediaDir, "--check-layout", "--safe-zone", "0,0,0,0", "--step", "0.5");
    expect(clean.stdout).toMatch(/^No layout issues in 14 samples/);
    expect(clean.status).toBe(0);
  });

  it("explains a missing asset and exits non-zero", () => {
    const r = run(composition, "--media", join(dir, "nowhere"), "--out", join(dir, "x.webm"), "--to", "1", "--quiet");
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/error: .*no media file for asset "bars"/);
  });

  it("finds the project's manifest and media from a video in a subfolder", () => {
    const project = join(dir, "project");
    mkdirSync(join(project, "media"), { recursive: true });
    mkdirSync(join(project, "videos"));
    copyFileSync(join(mediaDir, "bars.webm"), join(project, "media", "bars.webm"));
    writeFileSync(
      join(project, "uberscene.json"),
      JSON.stringify({
        assets: { bars: { id: "bars", kind: "video", duration: 10, fps: 30, width: 640, height: 360 } },
      }),
    );
    const file = join(project, "videos", "tiny.tsx");
    writeFileSync(
      file,
      `import { Clip, Composition, Track } from "@uberscene/kit";\nexport default function Video() { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:bars" in={0} out={0.5} /></Track></Composition>; }\n`,
    );
    const out = join(project, "tiny.webm");
    const r = run(file, "--out", out, "--silent", "--quiet");
    expect(r.stderr).toContain("15 frames");
    expect(r.status).toBe(0);
    expect(probe(out)).toMatchObject({ codec: "vp9", frames: 15 });
  });

  describe("queue", () => {
    const manifest = `export const manifest = { assets: { bars: { id: "bars", kind: "video", duration: 10, fps: 30, width: 640, height: 360 }, gone: { id: "gone", kind: "video", duration: 10, fps: 30, width: 640, height: 360 } } };`;
    const cut = (asset: string) =>
      `import { Clip, Composition, Track } from "@uberscene/kit";\n${manifest}\nexport const defaults = { length: 0.5 };\nexport default function Video({ length }: { length: number }) { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:${asset}" in={0} out={length} /></Track></Composition>; }\n`;
    let folder = "";
    beforeAll(() => {
      folder = join(dir, "queue");
      mkdirSync(join(folder, "cuts"), { recursive: true });
      writeFileSync(join(folder, "cuts", "tiny.tsx"), cut("bars"));
      writeFileSync(join(folder, "cuts", "broken.tsx"), cut("gone"));
    });
    const queue = (name: string, jobs: unknown[]) => {
      const path = join(folder, name);
      writeFileSync(path, JSON.stringify({ jobs }));
      return path;
    };

    it("renders every job of a queue, paths from the queue file, and sums them up", () => {
      const path = queue("three.json", [
        { file: "cuts/tiny.tsx", out: "out/a.webm", silent: true },
        { file: "cuts/tiny.tsx", out: "out/b.mp4", silent: true, quality: "low" },
        { file: "cuts/tiny.tsx", out: "out/c.webm", silent: true, props: { length: 1 } },
      ]);
      const r = run("queue", path, "--media", mediaDir, "--quiet");
      expect(r.stderr).toContain("[1/3] cuts/tiny.tsx -> out/a.webm");
      expect(r.stderr).toContain("3 jobs: 3 done");
      expect(r.status).toBe(0);
      expect(probe(join(folder, "out", "a.webm"))).toMatchObject({ codec: "vp9", frames: 15 });
      expect(probe(join(folder, "out", "b.mp4"))).toMatchObject({ codec: "h264", frames: 15 });
      expect(probe(join(folder, "out", "c.webm"))).toMatchObject({ codec: "vp9", frames: 30 });
    });

    it("goes on past a failing job with --continue-on-error, and exits 1", () => {
      const path = queue("failing.json", [
        { file: "cuts/tiny.tsx", out: "keep/a.webm", silent: true },
        { file: "cuts/broken.tsx", out: "keep/b.webm", silent: true },
        { file: "cuts/tiny.tsx", out: "keep/c.webm", silent: true },
      ]);
      const r = run("queue", path, "--media", mediaDir, "--quiet", "--continue-on-error", "--json");
      expect(r.status).toBe(1);
      const report = JSON.parse(r.stdout) as { jobs: { status: string; error?: string }[]; failed: number };
      expect(report.jobs.map((j) => j.status)).toEqual(["done", "failed", "done"]);
      expect(report.jobs[1]?.error).toMatch(/no media file for asset "gone"/);
      expect(existsSync(join(folder, "keep", "a.webm"))).toBe(true);
      expect(existsSync(join(folder, "keep", "b.webm"))).toBe(false);
      expect(existsSync(join(folder, "keep", "c.webm"))).toBe(true);
    });

    it("stops at the first failing job without it", () => {
      const path = queue("stopping.json", [
        { file: "cuts/broken.tsx", out: "stop/a.webm", silent: true },
        { file: "cuts/tiny.tsx", out: "stop/b.webm", silent: true },
      ]);
      const r = run("queue", path, "--media", mediaDir, "--quiet");
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("2. stop/b.webm: skipped");
      expect(existsSync(join(folder, "stop", "b.webm"))).toBe(false);
    });

    it("checks every job before the first renders", () => {
      const path = queue("typo.json", [
        { file: "cuts/tiny.tsx", out: "typo/a.webm" },
        { file: "cuts/tiny.tsx", out: "typo/b.webm", codec: "h265" },
      ]);
      const r = run("queue", path, "--media", mediaDir, "--quiet");
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("job 2 (typo/b.webm): codec wants avc, vp9, av1, prores");
      expect(existsSync(join(folder, "typo", "a.webm"))).toBe(false);
    });
  });

  it("prints usage when there is nothing to render", () => {
    const r = run();
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("Usage: uberscene");
  });

  it("adds an asset to the manifest with its transcript", () => {
    const media = join(dir, "talk.webm");
    copyFileSync(join(mediaDir, "bars.webm"), media);
    writeFileSync(join(dir, "talk.srt"), "1\n00:00:01,000 --> 00:00:02,000\nHello there\n");
    const r = run("add", media);
    expect(r.stderr).toContain("talk: video, 10 s, 640x360 at 30 fps, with sound, 2 words estimated from talk.srt");
    expect(r.status).toBe(0);
    expect(JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")).assets.talk.transcript.words).toHaveLength(2);
    expect(run("add", media, join(dir, "x.webm"), "--id", "x").stderr).toContain(
      "--id and --transcript name one asset",
    );
  });

  it("writes the captions as SRT alone, or as WebVTT beside the export", () => {
    const file = join(dir, "captions.tsx");
    writeFileSync(
      file,
      `import { Caption, Captions, Composition, Track, Title } from "@uberscene/kit";
export const manifest = { assets: {} };
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180}>
      <Track id="t" layout="free"><Title id="x" start={0} duration={2}>x</Title></Track>
      <Captions id="cc"><Caption id="a" start={0.5} end={1.5} text="Hello there" /></Captions>
    </Composition>
  );
}
`,
    );
    const srt = join(dir, "c.srt");
    const alone = run(file, "--srt", srt);
    expect(alone.status).toBe(0);
    expect(readFileSync(srt, "utf8")).toBe("1\n00:00:00,500 --> 00:00:01,500\nHello there\n");
    const vtt = join(dir, "c.vtt");
    const both = run(file, "--out", join(dir, "c.webm"), "--vtt", vtt, "--from", "1", "--quiet");
    expect(both.status).toBe(0);
    expect(readFileSync(vtt, "utf8")).toBe("WEBVTT\n\n00:00:00.000 --> 00:00:00.500\nHello there\n");
    expect(probe(join(dir, "c.webm")).frames).toBe(30);
  });

  it("makes a matte with a model of the user's own, and stops for a licence not yet accepted", () => {
    const stub = join(root, "test", "fixtures", "matte", "stub.onnx");
    const bytes = readFileSync(stub);
    const registry = join(dir, "models.json");
    writeFileSync(
      registry,
      JSON.stringify({
        stub: {
          title: "a stand-in",
          source: `file://${stub}`,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          bytes: bytes.length,
          licence: "MIT",
          licenceUrl: "https://example.com",
          input: "src",
          output: "pha",
        },
      }),
    );
    copyFileSync(join(mediaDir, "solid.webm"), join(dir, "talk.webm"));
    writeFileSync(join(dir, "uberscene.json"), JSON.stringify({ assets: {} }));
    const env = { ...process.env, UBERSCENE_MODEL_REGISTRY: registry, UBERSCENE_MODEL_CACHE: join(dir, "models") };
    const matte = (...args: string[]) =>
      spawnSync(join(root, "node_modules", ".bin", "tsx"), [cli, "matte", ...args], {
        cwd: dir,
        encoding: "utf8",
        env,
      });
    const listed = matte("models", "--json");
    expect(listed.status).toBe(0);
    expect(JSON.parse(listed.stdout)).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "stub", licence: "MIT" })]),
    );
    const asked = matte("talk.webm", "--model", "stub");
    expect(asked.status).toBe(2);
    expect(asked.stderr).toMatch(/licensed MIT[\s\S]*--accept-licence/);
    const made = matte("talk.webm", "--model", "stub", "--accept-licence", "--quiet");
    expect(made.status).toBe(0);
    expect(made.stdout).toMatch(/talk\.matte\.webm: 60 frames, 640x360, matte of talk as talk\.matte/);
    expect(probe(join(dir, "talk.matte.webm")).frames).toBe(60);
  });
});
