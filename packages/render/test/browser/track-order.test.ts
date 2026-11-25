// Tracks draw in the order the file writes them, footage included: a card written between two footage tracks is over
// the lower footage and under the upper (a cut-out speaker on a card). Needs Chrome 157: the cached Chrome for
// Testing, or UBERSCENE_CHROMIUM.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { manifest as mediaManifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, loadVideo, renderStill } from "../../src";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "track-order");
let dir = "";

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "t-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const CARD = `<Track id="cards" layout="free">
        <Shape id="card" start={0} duration={1} type="rectangle" fill="#00ff00"
          box={{ x: 160, y: 90, width: 200, height: 120, origin: "center" }} />
      </Track>`;
const LOGO = `<Track id="cutout" layout="free">
        <Clip id="logo" src="asset:logo" start={0} duration={1}
          box={{ x: 160, y: 90, width: 64, height: 64, origin: "center" }} />
      </Track>`;

/** A still at 0.5 s of a file with the bars on the main track and `tracks` above it, bottom first. */
async function still(name: string, tracks: readonly string[], extra = "") {
  const file = join(dir, `${name}.tsx`);
  writeFileSync(
    file,
    `import { Adjustment, Clip, Composition, Shape, Track } from "@uberscene/kit";
export const manifest = ${JSON.stringify({ assets: mediaManifest.assets })};
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180} background={{ type: "color", color: "#000000" }}>
      <Track id="main">
        <Clip id="bars" src="asset:solid" in={0} out={1} />
      </Track>
      ${tracks.join("\n      ")}
      ${extra}
    </Composition>
  );
}
`,
  );
  const loaded = await loadVideo(file);
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

/** The card: green. */
const isCard = ([r, g, b]: [number, number, number]) => g > 200 && r < 60 && b < 60;
/** The main footage: solid blue. */
const isFootage = ([r, g, b]: [number, number, number]) => b > 150 && r < 80 && g < 80;
const isRed = ([r, g, b]: [number, number, number]) => r > 150 && g + b < 120;

it("draws footage written above a card over the card, and the card over the footage beneath", async () => {
  const at = await still("card-under", [CARD, LOGO]);
  // The logo (a red square) in the middle, the green card around it, the main footage around the card.
  expect(isRed(at(160, 90))).toBe(true);
  expect(isCard(at(160 - 80, 90))).toBe(true);
  expect(isCard(at(160, 90 - 50))).toBe(true);
  expect(isFootage(at(20, 20))).toBe(true);
});

it("draws the card over both when the file writes it last", async () => {
  const at = await still("card-over", [LOGO, CARD]);
  expect(isCard(at(160, 90))).toBe(true);
  expect(isCard(at(160 - 80, 90))).toBe(true);
  expect(isFootage(at(20, 20))).toBe(true);
});

it("an adjustment written on top changes the footage of both runs and leaves the card", async () => {
  const plain = await still("plain", [CARD, LOGO]);
  const graded = await still(
    "graded",
    [CARD, LOGO],
    `<Track id="grade" layout="free">
        <Adjustment id="adj" start={0} duration={1} effects={[{ type: "invert" }]} />
      </Track>`,
  );
  // Overlays stay as they are under an adjustment, as in a file with one run of footage.
  expect(isCard(graded(160 - 80, 90))).toBe(true);
  // The logo, inverted: red becomes cyan.
  const [r, g, b] = graded(160, 90);
  expect(r).toBeLessThan(100);
  expect(g + b).toBeGreaterThan(300);
  // The main footage, inverted too.
  const before = plain(20, 20);
  const after = graded(20, 20);
  expect(
    Math.abs(before[0] + after[0] - 255) + Math.abs(before[1] + after[1] - 255) + Math.abs(before[2] + after[2] - 255),
  ).toBeLessThan(30);
});
