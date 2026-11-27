// `cutout`: a clip keeps only what its matte shows, so what is under it comes through where the matte is black. The
// matte is solid.webm's, black on the left half and white on the right. Needs Chrome: the cached Chrome for Testing,
// or UBERSCENE_CHROMIUM.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { manifest as mediaManifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, loadVideo, renderStill, renderVideo } from "../../src";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "cutout");
let dir = "";

const assets = {
  ...mediaManifest.assets,
  solid: { ...mediaManifest.assets.solid, matte: "solid.matte" },
  "solid.matte": { id: "solid.matte", kind: "video", duration: 2, fps: 30, width: 640, height: 360 },
};

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "t-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** A file with a green card on the first track and the blue clip, cut out with `clip` as its props, above it. */
function write(name: string, clip: string): string {
  const file = join(dir, `${name}.tsx`);
  writeFileSync(
    file,
    `import { Clip, Composition, Shape, Track } from "@uberscene/kit";
export const manifest = ${JSON.stringify({ assets })};
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180} background={{ type: "color", color: "#000000" }}>
      <Track id="card" layout="free">
        <Shape id="green" start={0} duration={1} type="rectangle" fill="#00ff00" ground width={320} height={180}
          box={{ x: 160, y: 90, width: 320, height: 180, origin: "center" }} />
      </Track>
      <Track id="speaker" layout="free">
        <Clip id="solid" src="asset:solid" start={0} in={0} out={1} ${clip} />
      </Track>
    </Composition>
  );
}
`,
  );
  return file;
}

async function still(name: string, clip: string) {
  const loaded = await loadVideo(write(name, clip));
  expect(loaded.state.errors).toEqual([]);
  const out = join(dir, `${name}.png`);
  await renderStill({
    state: loaded.state,
    media: directoryResolver(mediaDir, loaded.manifest),
    out,
    time: 0.5,
    source: loaded.source,
  });
  const img = readImage(out);
  return (x: number, y: number) =>
    [...img.rgba.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)] as [number, number, number];
}

const isGreen = ([r, g, b]: [number, number, number]) => g > 200 && r < 60 && b < 60;
const isBlue = ([r, g, b]: [number, number, number]) => b > 150 && r < 80 && g < 80;
const isGrey = ([r, g, b]: [number, number, number]) => Math.max(r, g, b) - Math.min(r, g, b) < 12 && g < 200;

it("shows what is under the clip where its matte is black, and the clip where it is white", async () => {
  const at = await still("cut", "cutout");
  expect(isGreen(at(40, 90))).toBe(true);
  expect(isBlue(at(280, 90))).toBe(true);
});

it("covers the card where there is no cutout", async () => {
  const at = await still("whole", "");
  expect(isBlue(at(40, 90))).toBe(true);
});

it("applies the effects after the cut, so they change the subject and not what shows through", async () => {
  const at = await still("grey", `cutout effects={[{ type: "grayscale", amount: 1 }]}`);
  expect(isGreen(at(40, 90))).toBe(true);
  expect(isGrey(at(280, 90))).toBe(true);
});

it("pulls the edge in with shrink", async () => {
  // The matte's edge is at x 160 of the 320 frame; shrink 12 moves the cut a few pixels to the right.
  const plain = await still("edge", "cutout");
  const shrunk = await still("shrunk", "cutout={{ shrink: 12 }}");
  expect(isBlue(plain(164, 90))).toBe(true);
  expect(isGreen(shrunk(164, 90))).toBe(true);
  expect(isBlue(shrunk(200, 90))).toBe(true);
});

it("draws the same in an export as in a still", async () => {
  const file = write("export", "cutout");
  const loaded = await loadVideo(file);
  const out = join(dir, "export.webm");
  await renderVideo({
    state: loaded.state,
    media: directoryResolver(mediaDir, loaded.manifest),
    out,
    source: loaded.source,
    silent: true,
  });
  const frame = join(dir, "export-frame.png");
  const { execFileSync } = await import("node:child_process");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "0.5", "-i", out, "-frames:v", "1", frame]);
  const img = readImage(frame);
  const at = (x: number, y: number) =>
    [...img.rgba.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)] as [number, number, number];
  expect(isGreen(at(40, 90))).toBe(true);
  expect(isBlue(at(280, 90))).toBe(true);
});
