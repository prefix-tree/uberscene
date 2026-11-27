// A value linked to another element's is that value's keys by the time anything draws: the export of a file with a
// link is the export of the same file with those keys written out, to the byte, in a still and under motion blur.
// Needs Chrome 157: the cached Chrome for Testing, or UBERSCENE_CHROMIUM.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { directoryResolver, loadVideo, renderStill } from "../../src";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "links");
let dir = "";

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "t-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

async function still(name: string, inner: string, time: number, blur = false) {
  const file = join(dir, `${name}.tsx`);
  writeFileSync(
    file,
    `import { Composition, Shape, Track } from "@uberscene/kit";
export const manifest = { assets: [] };
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180} background={{ type: "color", color: "#000000" }}${blur ? " motionBlur={{ shutterAngle: 180, samples: 8 }}" : ""}>
      <Track id="shapes" layout="free">${inner}</Track>
    </Composition>
  );
}
`,
  );
  const loaded = await loadVideo(file);
  expect(loaded.state.errors).toEqual([]);
  const out = join(dir, `${name}-${time}${blur ? "-blur" : ""}.png`);
  await renderStill({
    state: loaded.state,
    media: directoryResolver(dir, loaded.manifest),
    out,
    time,
    source: loaded.source,
  });
  return { bytes: readFileSync(out), image: readImage(out) };
}

const dial = `<Shape id="dial" type="rectangle" start={0} duration={3} width={20} height={70} fill="#ff3b30"
  box={{ x: 100, y: 90, origin: "center" }}
  transform={{ rotation: [{ at: 0, value: 0, easing: "easeInOut" }, { at: 1, value: 90 }, { at: 2, value: 20 }] }} />`;
const needle = (
  rotation: string,
) => `<Shape id="needle" type="rectangle" start={0.5} duration={2.5} width={20} height={70} fill="#34c759"
  box={{ x: 220, y: 90, origin: "center" }} transform={{ rotation: ${rotation} }} />`;
// The needle starts half a second after the dial and runs a quarter of a second late: the dial's keys at 0, 1 and
// 2 s are at -0.25, 0.75 and 1.75 s of the needle's own time. Twice the turn, the other way.
const LINKED = `{ link: "dial.transform.rotation", scale: -2, delay: 0.25 }`;
const WRITTEN = `[{ at: 0, value: 0 }, { at: 0.75, value: -180 }, { at: 1.75, value: -40 }]`;

it("draws a linked value as the keys it stands for", async () => {
  // From the needle's first key on: a file cannot write the key that sits before its start.
  for (const time of [1.25, 1.7, 2.6]) {
    const linked = await still("linked", dial + needle(LINKED), time);
    const written = await still("written", dial + needle(WRITTEN), time);
    expect(linked.bytes.equals(written.bytes)).toBe(true);
  }
});

it("turns with what it names before its own first written key", async () => {
  // At 0.6 s the needle reads the dial at 0.35 s, part way through its eased turn from 0 to 90: the needle is turned
  // about twice that the other way, so its long side leans. A point 19 px to one side and 17 px above its centre is
  // on a leaning needle, and off an upright one, which is 20 px wide.
  const green = (image: { rgba: Uint8Array | Uint8ClampedArray | Buffer; width: number }, x: number, y: number) => {
    const [r = 0, g = 0, b = 0] = image.rgba.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 3);
    return g > 150 && r < 120 && b < 150;
  };
  const leaning = (await still("linked", dial + needle(LINKED), 0.6)).image;
  const upright = (await still("upright", dial + needle("0"), 0.6)).image;
  expect(green(leaning, 220, 90)).toBe(true);
  expect(green(leaning, 239, 73) || green(leaning, 201, 73)).toBe(true);
  expect(green(upright, 239, 73) || green(upright, 201, 73)).toBe(false);
});

it("blurs a linked move as it blurs the keys", async () => {
  const linked = await still("linked", dial + needle(LINKED), 1.5, true);
  const written = await still("written", dial + needle(WRITTEN), 1.5, true);
  expect(linked.bytes.equals(written.bytes)).toBe(true);
});
