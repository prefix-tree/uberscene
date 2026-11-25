// A camera moves the tracks written inside it, footage and overlays alike, and leaves the rest of the picture where
// it is. Needs Chrome 157: the cached Chrome for Testing, or UBERSCENE_CHROMIUM.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { manifest as mediaManifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { checkLayout, directoryResolver, loadVideo, renderStill } from "../../src";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "camera");
let dir = "";

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "t-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** A green card and a small red logo (footage) at the frame's centre, and a white mark in the top left corner. */
const body = (camera: string, markInside = false) => {
  const mark = `<Track id="marks" layout="free">
        <Shape id="mark" start={0} duration={1} type="rectangle" fill="#ffffff" width={20} height={20}
          box={{ x: 20, y: 20, origin: "center" }} />
      </Track>`;
  return `<Camera id="cam" ${camera}>
        <Track id="cards" layout="free">
          <Shape id="card" start={0} duration={1} type="rectangle" fill="#00ff00" width={80} height={60}
            box={{ x: 160, y: 90, origin: "center" }} />
        </Track>
        <Track id="cutout" layout="free">
          <Clip id="logo" src="asset:logo" start={0} duration={1}
            box={{ x: 160, y: 90, width: 20, height: 20, origin: "center" }} />
        </Track>
        ${markInside ? mark : ""}
      </Camera>
      ${markInside ? "" : mark}`;
};

async function load(name: string, inner: string) {
  const file = join(dir, `${name}.tsx`);
  writeFileSync(
    file,
    `import { Camera, Clip, Composition, Shape, Title, Track } from "@uberscene/kit";
export const manifest = ${JSON.stringify({ assets: mediaManifest.assets })};
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180} background={{ type: "color", color: "#000000" }}>
      ${inner}
    </Composition>
  );
}
`,
  );
  const loaded = await loadVideo(file);
  expect(loaded.state.errors).toEqual([]);
  return { loaded, file };
}

async function still(name: string, inner: string, time = 0.5) {
  const { loaded } = await load(name, inner);
  const out = join(dir, `${name}.png`);
  await renderStill({
    state: loaded.state,
    media: directoryResolver(mediaDir, loaded.manifest),
    out,
    time,
    source: loaded.source,
  });
  const img = readImage(out);
  return (x: number, y: number) =>
    [...img.rgba.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)] as [number, number, number];
}

type Rgb = [number, number, number];
const isCard = ([r, g, b]: Rgb) => g > 200 && r < 60 && b < 60;
const isRed = ([r, g, b]: Rgb) => r > 150 && g + b < 120;
const isWhite = ([r, g, b]: Rgb) => r > 200 && g > 200 && b > 200;
const isGround = ([r, g, b]: Rgb) => r + g + b < 60;

it("draws a file as written while the camera sits still", async () => {
  const at = await still("still", body("zoom={1}"));
  expect(isRed(at(160, 90))).toBe(true);
  expect(isCard(at(130, 90))).toBe(true);
  expect(isGround(at(110, 90))).toBe(true);
  expect(isWhite(at(20, 20))).toBe(true);
});

it("pans footage and overlays together, and leaves a track outside the camera where it is", async () => {
  // The view moves 60 px right, so the card and the logo sit 60 px to the left.
  const at = await still("pan", body("x={60}"));
  expect(isRed(at(100, 90))).toBe(true);
  expect(isCard(at(70, 90))).toBe(true);
  expect(isCard(at(130, 90))).toBe(true);
  expect(isGround(at(160, 90))).toBe(true);
  expect(isWhite(at(20, 20))).toBe(true);
});

it("zooms about the frame's centre", async () => {
  // Twice the size: the 80 px card is 160 px wide, the 20 px logo 40 px.
  const at = await still("zoom", body("zoom={2}"));
  expect(isRed(at(160 + 15, 90))).toBe(true);
  expect(isCard(at(160 + 30, 90))).toBe(true);
  expect(isCard(at(160 - 70, 90))).toBe(true);
  expect(isGround(at(160 - 90, 90))).toBe(true);
  expect(isWhite(at(20, 20))).toBe(true);
});

it("moves a track written inside it that it would leave alone outside", async () => {
  const at = await still("inside", body("x={-100}", true));
  // The mark was at 20; the view moved 100 px left, so it sits at 120.
  expect(isWhite(at(120, 20))).toBe(true);
  expect(isGround(at(20, 20))).toBe(true);
});

it("turns what it shows", async () => {
  // A quarter turn of the view: the card, 80 wide and 60 high, is now 60 wide and 80 high.
  const at = await still("turn", body("rotation={90}"));
  expect(isCard(at(160, 90 - 35))).toBe(true);
  expect(isGround(at(160 - 35, 90))).toBe(true);
});

it("follows its keys on the video's clock", async () => {
  const keyed = body("x={[{ at: 0, value: 0 }, { at: 1, value: 120 }]}");
  const early = await still("keys-early", keyed, 0);
  expect(isRed(early(160, 90))).toBe(true);
  const half = await still("keys-half", keyed, 0.5);
  expect(isRed(half(100, 90))).toBe(true);
  expect(isGround(half(160, 90))).toBe(true);
});

it("has the layout check measure after the camera, and give the fix in the element's own numbers", async () => {
  const { loaded, file } = await load(
    "check",
    `<Camera id="cam" zoom={2}>
        <Track id="titles" layout="free">
          <Shape id="edge" start={0} duration={1} type="rectangle" fill="#ff0000" width={20} height={20}
            box={{ x: 230, y: 90, origin: "center" }} />
        </Track>
      </Camera>`,
  );
  const { issues } = await checkLayout({
    state: loaded.state,
    media: directoryResolver(mediaDir, loaded.manifest),
    source: { ...loaded.source, file },
    safeZone: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  // At twice the size the shape, written from 220 to 240, is drawn from 280 to 320: just inside.
  expect(issues.find((i) => i.id === "edge")).toBeUndefined();

  const { loaded: over, file: overFile } = await load(
    "check-over",
    `<Camera id="cam" zoom={2}>
        <Track id="titles" layout="free">
          <Shape id="edge" start={0} duration={1} type="rectangle" fill="#ff0000" width={20} height={20}
            box={{ x: 240, y: 90, origin: "center" }} />
        </Track>
      </Camera>`,
  );
  const { issues: found } = await checkLayout({
    state: over.state,
    media: directoryResolver(mediaDir, over.manifest),
    source: { ...over.source, file: overFile },
    safeZone: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  const issue = found.find((i) => i.id === "edge");
  // Drawn from 300 to 340: 20 px past the right edge on screen, which is 10 px of its own box.
  expect(issue?.rule).toBe("frame-edge");
  expect(issue?.fix).toContain("left 20 px");
  expect(issue?.fix).toContain("box.x 230");
});

it("draws a pushed camera as it draws the keys the push makes", async () => {
  // The card starts at 0 off the right edge, so the camera has panned to it by 0.5 s.
  const scene = (camera: string) => `<Camera id="cam" ${camera}>
        <Track id="cards" layout="free">
          <Shape id="card" start={0} duration={1} type="rectangle" fill="#00ff00" width={80} height={60}
            box={{ x: 360, y: 90, origin: "center" }} />
        </Track>
      </Camera>`;
  const pushed = await still("pushed", scene(`push={{ on: ["card"], margin: 0, duration: 0.2 }}`));
  // The card spans 320 to 400; with no margin the view's right edge goes to 400: 80 px.
  const keyed = await still("keyed", scene('x={[{ at: 0, value: 0, easing: "snappy" }, { at: 0.2, value: 80 }]}'));
  for (const [x, y] of [
    [300, 90],
    [250, 90],
    [230, 90],
    [160, 90],
    [300, 50],
  ] as const)
    expect(pushed(x, y)).toEqual(keyed(x, y));
  expect(isCard(pushed(280, 90))).toBe(true);
  expect(isGround(pushed(230, 90))).toBe(true);
});
