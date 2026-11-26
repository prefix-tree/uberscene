// A shape's own values take keys: the export draws its size, its colour (moved in OKLab) and its points where the keys
// put them, the same on every draw. Needs Chrome 157: the cached Chrome for Testing, or UBERSCENE_CHROMIUM.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { mixColor, parseColor } from "@uberscene/kit/schema";

import { loadVideo, renderStill } from "../../src";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "shape-keys");
let dir = "";

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "t-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

async function still(name: string, inner: string, time: number) {
  const file = join(dir, `${name}.tsx`);
  writeFileSync(
    file,
    `import { Composition, Shape, Track } from "@uberscene/kit";
export const manifest = { assets: [] };
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180} background={{ type: "color", color: "#000000" }}>
      <Track id="shapes" layout="free">${inner}</Track>
    </Composition>
  );
}
`,
  );
  const loaded = await loadVideo(file);
  expect(loaded.state.errors).toEqual([]);
  const out = join(dir, `${name}-${time}.png`);
  await renderStill({ state: loaded.state, out, time, source: loaded.source });
  const img = readImage(out);
  return {
    bytes: readFileSync(out),
    at: (x: number, y: number) =>
      [...img.rgba.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)] as [number, number, number],
  };
}

type Rgb = [number, number, number];
const near = (a: Rgb, b: Rgb, tolerance = 6) => a.every((v, i) => Math.abs(v - b[i]!) <= tolerance);

const grow = `<Shape id="sq" type="rectangle" start={0} duration={2} box={{ x: 160, y: 90, origin: "center" }}
  width={[{ at: 0, value: 40 }, { at: 1, value: 120 }]} height={60}
  fill={[{ at: 0, value: "#ff0000" }, { at: 1, value: "#0000ff" }]} />`;

it("grows a keyed width from the box's origin", async () => {
  const start = await still("grow", grow, 0);
  // 40 wide at the start: 20 px either side of the centre.
  expect(near(start.at(160 + 15, 90), [255, 0, 0])).toBe(true);
  expect(near(start.at(160 + 30, 90), [0, 0, 0])).toBe(true);
  // 80 wide half way: 40 px either side.
  const half = await still("grow", grow, 0.5);
  expect(half.at(160 + 35, 90).some((v) => v > 100)).toBe(true);
  expect(near(half.at(160 + 50, 90), [0, 0, 0])).toBe(true);
});

it("draws a keyed fill half way through OKLab, not a mix of the sRGB numbers", async () => {
  const half = await still("colour", grow, 0.5);
  const want = parseColor(mixColor("#ff0000", "#0000ff", 0.5)!)!;
  expect(near(half.at(160, 90), [want.r * 255, want.g * 255, want.b * 255].map(Math.round) as Rgb)).toBe(true);
  // A mix of the numbers would be a dark purple (128, 0, 128); OKLab's midpoint is lighter.
  expect(near(half.at(160, 90), [128, 0, 128], 20)).toBe(false);
});

it("draws the same still mid-morph every time", async () => {
  const morph = `<Shape id="m" type="polygon" start={0} duration={2} width={120} height={120} fill="#ffffff"
    box={{ x: 160, y: 90, origin: "center" }}
    points={[{ at: 0, value: [{ x: 0.5, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] },
             { at: 1, value: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }] }]} />`;
  const a = await still("morph-a", morph, 0.5);
  const b = await still("morph-b", morph, 0.5);
  expect(a.bytes.equals(b.bytes)).toBe(true);
  // Half way the triangle is (0.25, 0), (1, 0.5), (0.25, 1) of the box: near its top left it is filled (at the start
  // that spot was outside), near its top right it is empty.
  expect(near(a.at(100 + 36, 30 + 12), [255, 255, 255], 40)).toBe(true);
  expect(near(a.at(100 + 108, 30 + 12), [0, 0, 0])).toBe(true);
  const start = await still("morph-start", morph, 0);
  expect(near(start.at(100 + 36, 30 + 12), [0, 0, 0])).toBe(true);
});
