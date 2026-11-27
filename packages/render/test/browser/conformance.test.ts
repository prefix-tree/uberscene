// The conformance suite's part in the export (the rest is `packages/sdk/test/conformance`): a still of every kind
// that has a folder of its own, from its sample, is not blank. Needs Chrome 157: the cached Chrome for Testing, or
// UBERSCENE_CHROMIUM.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { SAMPLE_KINDS, SAMPLE_MANIFEST, sampleFile } from "../../../sdk/test/conformance/sample";
import { directoryResolver, loadVideo, renderStill } from "../../src";
import { readImage } from "../helpers/output";
import { makePlaceholders } from "../helpers/placeholders";

const scratch = join(import.meta.dirname, "..", ".tmp", "conformance");
let dir = "";

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "t-"));
  // The picture a sample may show, as a file beside it.
  makePlaceholders(SAMPLE_MANIFEST, dir);
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

it.each(SAMPLE_KINDS)("a still of a %s is not blank", async (kind) => {
  const file = join(dir, `${kind}.tsx`);
  // The file says its own manifest, in place of one beside it.
  const sample = sampleFile(kind);
  writeFileSync(file, `${sample.text}\nexport const manifest = ${JSON.stringify(sample.manifest)};\n`);
  const loaded = await loadVideo(file);
  expect(loaded.state.errors).toEqual([]);
  const out = join(dir, `${kind}.png`);
  await renderStill({
    state: loaded.state,
    media: directoryResolver(dir, loaded.manifest),
    out,
    time: 1,
    source: loaded.source,
  });
  const img = readImage(out);
  // Something is drawn: some pixel is not the colour of the frame's first, which is the bare background.
  const first = [...img.rgba.slice(0, 3)];
  let drawn = 0;
  for (let i = 0; i < img.rgba.length; i += 4)
    if (img.rgba[i] !== first[0] || img.rgba[i + 1] !== first[1] || img.rgba[i + 2] !== first[2]) drawn++;
  expect(drawn).toBeGreaterThan(100);
});
