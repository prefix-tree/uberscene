// `<Mark>`: one title draws a word in its own colour, the same in a still and an export. Needs Chrome: the cached
// Chrome for Testing, or UBERSCENE_CHROMIUM.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { directoryResolver, loadVideo, renderStill, renderVideo } from "../../src";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "marks");
let dir = "";

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "t-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** A black frame with "RED BLUE" in red, "BLUE" marked blue, filling the frame's width. */
function write(): string {
  const file = join(dir, "marks.tsx");
  writeFileSync(
    file,
    `import { Composition, Mark, Title, Track } from "@uberscene/kit";
export const manifest = { assets: {} };
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180} background={{ type: "color", color: "#000000" }}>
      <Track id="t" layout="free">
        <Title id="words" start={0} duration={1} style={{ size: 64, color: "#ff0000", align: "center" }}
          box={{ x: 160, y: 90, width: 320, height: 180, origin: "center" }}>RED <Mark color="#0000ff">BLUE</Mark></Title>
      </Track>
    </Composition>
  );
}
`,
  );
  return file;
}

type Rgb = [number, number, number];
const red = ([r, g, b]: Rgb) => r > 150 && g < 80 && b < 80;
const blue = ([r, g, b]: Rgb) => b > 150 && r < 80 && g < 80;

/** Where the red and the blue ink is, across the frame: the left-most and right-most column of each. */
function inks(png: string) {
  const img = readImage(png);
  const cols = { red: [] as number[], blue: [] as number[] };
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const px = [img.rgba[i], img.rgba[i + 1], img.rgba[i + 2]] as Rgb;
      if (red(px)) cols.red.push(x);
      else if (blue(px)) cols.blue.push(x);
    }
  const span = (xs: number[]): [number, number] | null => (xs.length ? [Math.min(...xs), Math.max(...xs)] : null);
  return { red: span(cols.red), blue: span(cols.blue) };
}

it("draws the marked word in its colour, after the rest in the title's", async () => {
  const loaded = await loadVideo(write());
  expect(loaded.state.errors).toEqual([]);
  const out = join(dir, "still.png");
  await renderStill({
    state: loaded.state,
    media: directoryResolver(dir, loaded.manifest),
    out,
    time: 0.5,
    source: loaded.source,
  });
  const { red: r, blue: b } = inks(out);
  expect(r).not.toBeNull();
  expect(b).not.toBeNull();
  // "RED " then "BLUE": every red column is left of every blue one.
  expect(r![1]).toBeLessThan(b![0]);
});

it("draws the same in an export", async () => {
  const loaded = await loadVideo(write());
  const out = join(dir, "export.webm");
  await renderVideo({
    state: loaded.state,
    media: directoryResolver(dir, loaded.manifest),
    out,
    source: loaded.source,
    silent: true,
  });
  const frame = join(dir, "export-frame.png");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "0.5", "-i", out, "-frames:v", "1", frame]);
  const { red: r, blue: b } = inks(frame);
  expect(r).not.toBeNull();
  expect(b).not.toBeNull();
  expect(r![1]).toBeLessThan(b![0]);
});
