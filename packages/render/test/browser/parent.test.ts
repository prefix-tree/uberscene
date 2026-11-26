// An overlay with a `parent` is placed in its parent's box and carried by its parent's transform, in the export as in
// the player. Needs Chrome 157: the cached Chrome for Testing, UBERSCENE_CHROMIUM, or UBERSCENE_ANY_CHROME=1.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { checkLayout, directoryResolver, loadVideo, renderStill } from "../../src";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "parent");
let dir = "";

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "t-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** A green arm 40 by 100 at (100, 40), turned a quarter clockwise about its top middle (120, 40): it points left. */
const arm = `<Shape id="arm" start={0} duration={1} type="rectangle" fill="#00ff00" width={40} height={100}
          box={{ x: 100, y: 40, width: 40, height: 100 }} transform={{ anchor: { x: 0.5, y: 0 }, rotation: 90 }} />`;

async function load(name: string, inner: string) {
  const file = join(dir, `${name}.tsx`);
  writeFileSync(
    file,
    `import { Composition, Shape, Track } from "@uberscene/kit";
export const manifest = { assets: {} };
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180} background={{ type: "color", color: "#000000" }}>
      <Track id="rig" layout="free">
        ${inner}
      </Track>
    </Composition>
  );
}
`,
  );
  const loaded = await loadVideo(file);
  expect(loaded.state.errors).toEqual([]);
  return { loaded, file };
}

type Rgb = [number, number, number];
const isGreen = ([r, g, b]: Rgb) => g > 200 && r < 60 && b < 60;
const isRed = ([r, g, b]: Rgb) => r > 200 && g < 60 && b < 60;
const isBlue = ([r, g, b]: Rgb) => b > 200 && r < 60 && g < 60;
const isGround = ([r, g, b]: Rgb) => r + g + b < 60;

it("draws a two-level chain where its parents carry it", async () => {
  const { loaded } = await load(
    "chain",
    `${arm}
        <Shape id="hand" parent="arm" start={0} duration={1} type="rectangle" fill="#ff0000" width={20} height={20}
          box={{ x: 20, y: 100, width: 20, height: 20, origin: "center" }} />
        <Shape id="nail" parent="hand" start={0} duration={1} type="rectangle" fill="#0000ff" width={6} height={6}
          box={{ x: 10, y: 0, width: 6, height: 6, origin: "center" }} />`,
  );
  const out = join(dir, "chain.png");
  await renderStill({
    state: loaded.state,
    media: directoryResolver(dir, loaded.manifest),
    out,
    time: 0.5,
    source: loaded.source,
  });
  const img = readImage(out);
  const px = (x: number, y: number) => [...img.rgba.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)] as Rgb;
  // The arm runs from x 20 to 120 at y 20..60; the hand, at the arm's bottom, is centred on (20, 40); the nail, on
  // the hand's top edge, which now faces right, at (30, 40).
  expect(isGreen(px(70, 40))).toBe(true);
  expect(isRed(px(15, 40))).toBe(true);
  expect(isBlue(px(30, 40))).toBe(true);
  // Nothing is where the hand would be read in the frame (its box at (20, 100)), nor where the arm stood unturned.
  expect(isGround(px(20, 110))).toBe(true);
  expect(isGround(px(120, 120))).toBe(true);
});

it("has the layout check measure after the parents, and give the fix in the child's own numbers", async () => {
  // The hand's box, 125 px down the arm, turns with it to sit across the frame's left edge, centred at x -5.
  const { loaded, file } = await load(
    "check",
    `${arm}
        <Shape id="hand" parent="arm" start={0} duration={1} type="rectangle" fill="#ff0000" width={20} height={20}
          box={{ x: 20, y: 125, width: 20, height: 20, origin: "center" }} />`,
  );
  const { issues } = await checkLayout({
    state: loaded.state,
    media: directoryResolver(dir, loaded.manifest),
    source: { ...loaded.source, file },
    safeZone: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  const issue = issues.find((i) => i.id === "hand");
  expect(issue?.rule).toBe("frame-edge");
  // Right 15 px on screen is 15 px up the turned arm: box.y 110.
  expect(issue?.fix).toContain("right 15 px");
  expect(issue?.fix).toContain("box.y 110");
});
