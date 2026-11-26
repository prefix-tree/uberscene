// `uberscene matte`: footage in, its matte beside it and in the manifest, then `cutout` with no other tool. The model is
// a stand-in (fixtures/matte/stub.onnx: alpha is the blue channel), registered as the user's own. Needs Chrome and
// onnxruntime-web.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { directoryResolver, loadVideo, renderStill } from "../../src";
import { makeMatte } from "../../src/matte/run";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "matte");
const fixtures = join(import.meta.dirname, "..", "fixtures", "matte");
let dir = "";
const saved = { ...process.env };

/** A registry of the two stand-ins, each with its real checksum. */
function registry(): string {
  const entry = (file: string, extra: object) => {
    const bytes = readFileSync(join(fixtures, file));
    return {
      title: `stand-in ${file}`,
      source: pathToFileURL(join(fixtures, file)).href,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
      licence: "MIT",
      licenceUrl: "https://example.com",
      input: "src",
      output: "pha",
      ...extra,
    };
  };
  const path = join(dir, "models.json");
  writeFileSync(
    path,
    JSON.stringify({
      stub: entry("stub.onnx", {}),
      "stub-recurrent": entry("stub-recurrent.onnx", { recurrent: { inputs: ["r1i"], outputs: ["r1o"], warmup: 0 } }),
    }),
  );
  return path;
}

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "t-"));
  process.env.UBERSCENE_MODEL_REGISTRY = registry();
  process.env.UBERSCENE_MODEL_CACHE = join(dir, "cache");
  process.env.UBERSCENE_ACCEPT_LICENCE = "stub,stub-recurrent";
});
afterAll(() => {
  process.env = saved;
  rmSync(scratch, { recursive: true, force: true });
});

/** 2 s at 10 fps, 160x90: black on the left half, pure blue on the right. */
function footage(name: string): string {
  const file = join(dir, `${name}.webm`);
  execFileSync("ffmpeg", [
    ...["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=160x90:r=10:d=2"],
    ...["-vf", "drawbox=x=80:y=0:w=80:h=90:color=0x0000ff:t=fill", "-c:v", "libvpx-vp9", "-b:v", "1M", file],
  ]);
  return file;
}

const frames = (file: string) =>
  Number(
    execFileSync("ffprobe", [
      ...["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames"],
      ...["-of", "csv=p=0", file],
    ])
      .toString()
      .trim(),
  );

/** The grey of a matte frame at (x, y), 0 to 255. */
function greyAt(file: string, frame: number, x: number, y: number): number {
  const png = join(dir, `frame-${frame}-${Math.random().toString(36).slice(2)}.png`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-vf", `select=eq(n\\,${frame})`, "-frames:v", "1", png]);
  const img = readImage(png);
  return img.rgba[(y * img.width + x) * 4] as number;
}

it("writes a matte of the same frames, puts it in the manifest, and cutout cuts with it", async () => {
  const talk = footage("talk");
  const manifest = join(dir, "uberscene.json");
  writeFileSync(manifest, JSON.stringify({ assets: {} }));
  const r = await makeMatte(talk, { model: "stub", manifest });
  expect(r).toMatchObject({ frames: 20, width: 160, height: 90, id: "talk.matte", footage: "talk" });
  expect(frames(r.file)).toBe(frames(talk));
  expect(greyAt(r.file, 10, 40, 45)).toBeLessThan(30);
  expect(greyAt(r.file, 10, 120, 45)).toBeGreaterThan(225);
  // Half the picture is the "subject", with almost no soft edge, and it never moves.
  expect(r.coverage).toBeCloseTo(0.5, 1);
  expect(r.change.mean).toBeLessThan(0.01);

  const assets = (JSON.parse(readFileSync(manifest, "utf8")) as { assets: Record<string, Record<string, unknown>> })
    .assets;
  expect(assets["talk.matte"]).toMatchObject({ kind: "video", width: 160, height: 90 });
  expect(assets.talk).toMatchObject({ matte: "talk.matte", matteModel: { name: "stub" } });
  const subjects = assets.talk!.subjects as { x: number; w: number }[];
  expect(subjects.length).toBeGreaterThan(2);
  expect(subjects[0]!.x).toBeCloseTo(0.5, 1);
  expect(subjects[0]!.w).toBeCloseTo(0.5, 1);

  // The footage over a green card: green where the matte is black, the footage where it is white.
  const file = join(dir, "cut.tsx");
  writeFileSync(
    file,
    `import { Clip, Composition, Shape, Track } from "@uberscene/kit";
export const manifest = ${JSON.stringify({ assets })};
export default function Video() {
  return (
    <Composition fps={10} width={160} height={90} background={{ type: "color", color: "#000000" }}>
      <Track id="card" layout="free">
        <Shape id="green" start={0} duration={1} type="rectangle" fill="#00ff00" ground width={160} height={90}
          box={{ x: 80, y: 45, origin: "center" }} />
      </Track>
      <Track id="speaker" layout="free">
        <Clip id="talk" src="asset:talk" start={0} in={0} out={1} cutout />
      </Track>
    </Composition>
  );
}
`,
  );
  const loaded = await loadVideo(file);
  expect(loaded.state.errors).toEqual([]);
  const still = join(dir, "cut.png");
  await renderStill({
    state: loaded.state,
    media: directoryResolver(dir, loaded.manifest),
    out: still,
    time: 0.5,
    source: loaded.source,
  });
  const img = readImage(still);
  const at = (x: number, y: number) => [...img.rgba.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)];
  expect(at(40, 45)).toEqual([expect.any(Number), expect.any(Number), expect.any(Number)]);
  const [lr, lg, lb] = at(40, 45) as [number, number, number];
  const [rr, rg, rb] = at(120, 45) as [number, number, number];
  expect(lg > 200 && lr < 60 && lb < 60).toBe(true);
  expect(rb > 150 && rr < 80 && rg < 80).toBe(true);
});

it("carries a model's state from frame to frame", async () => {
  const talk = footage("state");
  const manifest = join(dir, "state.json");
  writeFileSync(manifest, JSON.stringify({ assets: {} }));
  const r = await makeMatte(talk, { model: "stub-recurrent", manifest });
  // The stand-in counts its frames: black at the first, a quarter at the second, whole from the fifth.
  expect(greyAt(r.file, 0, 120, 45)).toBeLessThan(30);
  expect(greyAt(r.file, 1, 120, 45)).toBeGreaterThan(40);
  expect(greyAt(r.file, 1, 120, 45)).toBeLessThan(100);
  expect(greyAt(r.file, 6, 120, 45)).toBeGreaterThan(225);
});

it("refuses to replace a matte without --force, and says so", async () => {
  const talk = footage("again");
  const manifest = join(dir, "again.json");
  writeFileSync(manifest, JSON.stringify({ assets: {} }));
  await makeMatte(talk, { model: "stub", manifest });
  await expect(makeMatte(talk, { model: "stub", manifest })).rejects.toThrow(/already there: pass --force/);
  await expect(makeMatte(talk, { model: "stub", manifest, force: true })).resolves.toMatchObject({ frames: 20 });
});
