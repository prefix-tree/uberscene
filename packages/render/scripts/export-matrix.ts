// The weekly codec check's export: a simple edit (a cut from an HEVC file, joined to a ProRes file with a crossfade,
// three effects, a tone under it), exported through the CLI to the formats the export writes. The native decoder reads
// the footage every time; the encoding is native or the browser's. Each output is read back by the native binary. Prints a table, writes it to the GitHub job summary when there is one, and fails if any export or any
// check failed. `tsx scripts/export-matrix.ts --media <folder from codec-media.ts> [--out <folder>]`.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { codecBinary } from "../src/native/codecs";

const { values } = parseArgs({
  options: {
    media: { type: "string" },
    out: { type: "string" },
  },
});
if (!values.media) throw new Error("usage: tsx scripts/export-matrix.ts --media <folder> [--out <folder>]");
const media = values.media;
const here = join(import.meta.dirname, "..");
// Inside the workspace, so the file's `@uberscene/kit` import resolves.
const out = values.out ?? join(here, "test", ".tmp", "export-matrix");
mkdirSync(out, { recursive: true });

/** A cut of the HEVC clip, a crossfade into the ProRes clip, three effects: 1.5 + 2 − 0.5 = 3 s. */
const clip = (id: string) => ({ id, kind: "video", duration: 3, fps: 30, width: 640, height: 360 });
const VIDEO = `import { Audio, Clip, Composition, Track, Transition } from "@uberscene/kit";

export const manifest = ${JSON.stringify({
  assets: {
    phone: clip("phone"),
    master: clip("master"),
    tone: { id: "tone", kind: "audio", duration: 12, audio: { sampleRate: 48000, channels: 1, streams: 1 } },
  },
})};

export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Clip id="cut" src="asset:phone" in={0.5} out={2} effects={[{ type: "saturation", amount: 0.6 }]} />
      <Transition id="join" type="crossfade" duration={0.5} />
      <Clip
        id="next"
        src="asset:master"
        in={0}
        out={2}
        effects={[{ type: "vignette", amount: 0.6 }, { type: "grain", amount: 0.3 }]}
      />
      <Track id="sound" layout="free">
        <Audio id="bed" src="asset:tone" start={0} duration="fill" volume={0.5} />
      </Track>
    </Composition>
  );
}
`;
const video = join(out, "video.tsx");
writeFileSync(video, VIDEO);
const DURATION = 3;

type Check = { readonly codec: string } | { readonly magic: "RIFF" | "PNG" | "MP3" };
interface Case {
  readonly name: string;
  readonly codecs: string;
  readonly file: string;
  readonly args?: readonly string[];
  readonly check: Check;
}

const NATIVE: readonly Case[] = [
  { name: "H.264 in MP4", codecs: "native", file: "h264.mp4", check: { codec: "h264" } },
  {
    name: "ProRes in MOV",
    codecs: "native",
    file: "prores.mov",
    args: ["--codec", "prores", "--quality", "high"],
    check: { codec: "prores" },
  },
  { name: "Sound as WAV", codecs: "native", file: "sound.wav", check: { magic: "RIFF" } },
];
/** Native decoding, the browser's encoders. */
const BROWSER: readonly Case[] = [
  { name: "VP9 in WebM (browser encoder)", codecs: "native-decode", file: "vp9.webm", check: { codec: "vp9" } },
  {
    name: "AV1 in MP4 (browser encoder)",
    codecs: "native-decode",
    file: "av1.mp4",
    args: ["--codec", "av1"],
    check: { codec: "av1" },
  },
  { name: "Sound as MP3 (browser encoder)", codecs: "native-decode", file: "sound.mp3", check: { magic: "MP3" } },
  {
    name: "Still as PNG",
    codecs: "native-decode",
    file: "still.png",
    args: ["--still", "1.25"],
    check: { magic: "PNG" },
  },
];

const binary = codecBinary();
const cli = join(here, "src", "cli.ts");

/** What one case came to: the export's time and what the check found, or why it failed. */
interface Result {
  readonly name: string;
  readonly ok: boolean;
  readonly seconds: number;
  readonly detail: string;
}

function run(c: Case): Result {
  const file = join(out, c.file);
  const started = performance.now();
  const seconds = () => Math.round((performance.now() - started) / 100) / 10;
  try {
    execFileSync(
      process.execPath,
      ["--import", "tsx", cli, video, "--out", file, "--media", media, ...(c.args ?? [])],
      { cwd: here, env: { ...process.env, UBERSCENE_CODECS: c.codecs }, stdio: ["ignore", "ignore", "pipe"] },
    );
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString().trim().split("\n").slice(-3).join(" ") ?? "";
    return { name: c.name, ok: false, seconds: seconds(), detail: `export failed: ${stderr || String(error)}` };
  }
  const took = seconds();
  if (!existsSync(file) || statSync(file).size === 0)
    return { name: c.name, ok: false, seconds: took, detail: "no file written" };
  const size = `${Math.round(statSync(file).size / 1024)} KB`;
  if ("magic" in c.check) {
    const head = readFileSync(file).subarray(0, 4);
    const ok =
      c.check.magic === "RIFF"
        ? head.toString("latin1") === "RIFF"
        : c.check.magic === "PNG"
          ? head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
          : head.toString("latin1").startsWith("ID3") || (head[0] === 0xff && ((head[1] ?? 0) & 0xe0) === 0xe0);
    return {
      name: c.name,
      ok,
      seconds: took,
      detail: ok ? `${c.check.magic}, ${size}` : `not a ${c.check.magic} file`,
    };
  }
  // A video: the native binary reads it back, with its codec, its size and its length.
  let probe: {
    codec?: string;
    decodable?: boolean;
    duration?: number;
    width?: number;
    height?: number;
    reason?: string;
  };
  try {
    probe = JSON.parse(execFileSync(binary, ["probe", file], { encoding: "utf8" }));
  } catch (error) {
    return { name: c.name, ok: false, seconds: took, detail: `probe failed: ${String(error)}` };
  }
  const problems = [
    probe.decodable === true ? null : `not decodable (${probe.reason ?? "no reason"})`,
    probe.codec === c.check.codec ? null : `codec ${probe.codec}, expected ${c.check.codec}`,
    probe.width === 640 && probe.height === 360 ? null : `size ${probe.width}x${probe.height}`,
    Math.abs((probe.duration ?? 0) - DURATION) <= 0.1 ? null : `length ${probe.duration} s, expected ${DURATION}`,
  ].filter((p): p is string => p !== null);
  return problems.length === 0
    ? { name: c.name, ok: true, seconds: took, detail: `${probe.codec} 640x360, ${probe.duration} s, ${size}` }
    : { name: c.name, ok: false, seconds: took, detail: problems.join("; ") };
}

const cases = [...NATIVE, ...BROWSER];
const results: Result[] = [];
for (const c of cases) {
  const r = run(c);
  results.push(r);
  process.stdout.write(`${r.ok ? "ok  " : "FAIL"}  ${r.name}  (${r.seconds} s)  ${r.detail}\n`);
}

const platform = `${process.platform} ${process.arch}`;
const table = [
  `### Export check on ${platform}`,
  "",
  "| | Export | Time | Read back |",
  "|---|---|---|---|",
  ...results.map((r) => `| ${r.ok ? "✅" : "❌"} | ${r.name} | ${r.seconds} s | ${r.detail.replaceAll("|", "\\|")} |`),
  "",
].join("\n");
writeFileSync(join(out, "results.md"), table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
const failed = results.filter((r) => !r.ok).length;
process.stdout.write(`\n${results.length - failed} of ${results.length} passed\n`);
process.exit(failed === 0 ? 0 : 1);
