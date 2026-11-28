import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { directoryResolver, loadVideo } from "../src";
import { FrameKeys, readCached, trimCache, writeCached } from "../src/frame-cache";
import { blankPicture, decodePng, encodePng, paste } from "../src/png";

const scratch = join(import.meta.dirname, ".tmp", "frame-cache");
let dir = "";

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "k-"));
  for (const name of ["a.mp4", "b.mp4", "look.cube", "look.v2.cube"]) writeFileSync(join(dir, name), name);
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const MANIFEST = `export const manifest = { assets: {
  a: { id: "a", kind: "video", duration: 10, fps: 30, width: 640, height: 360 },
  b: { id: "b", kind: "video", duration: 10, fps: 30, width: 640, height: 360 },
  "look.v2": { id: "look.v2", kind: "lut" },
} };`;

/** A two-clip cut: a title over the first clip, an effect on the second, and whatever `more` adds to the text track. */
const video = (o: { title?: string; out?: number; stops?: number; more?: string; top?: string; fps?: number } = {}) => `
import { Clip, Composition, Layer, Title, Track, useLayer } from "@uberscene/kit";
${MANIFEST}
${o.top ?? ""}
export default function Video() {
  return (
    <Composition fps={${o.fps ?? 30}} width={640} height={360}>
      <Track id="main">
        <Clip id="first" src="asset:a" in={0} out={2} />
        <Clip id="second" src="asset:b" in={0} out={${o.out ?? 2}} effects={[{ type: "exposure", stops: ${o.stops ?? 0.5} }]} />
      </Track>
      <Track id="text" layout="free">
        <Title id="name" start={0.5} duration={1}>${o.title ?? "Hello"}</Title>
        ${o.more ?? ""}
      </Track>
    </Composition>
  );
}`;

let n = 0;
async function keysOf(
  source: string,
  frames: readonly number[],
  imports?: Readonly<Record<string, string>>,
): Promise<string[]> {
  const file = join(dir, `v${n++}.tsx`);
  writeFileSync(file, source);
  const loaded = await loadVideo(file, imports ? { imports } : {});
  expect(loaded.state.errors).toEqual([]);
  const keys = new FrameKeys({
    state: loaded.state,
    source: { ...loaded.source, executablePath: "/chrome" },
    media: directoryResolver(dir, loaded.manifest),
  });
  return Promise.all(frames.map((f) => keys.key(f)));
}

// Frame 6: the first clip alone. Frame 30: the first clip under the title. Frame 90: the second clip.
const FRAMES = [6, 30, 90];
const changed = async (a: string, b: string) => {
  const [x, y] = [await keysOf(a, FRAMES), await keysOf(b, FRAMES)];
  return FRAMES.filter((_, i) => x[i] !== y[i]);
};

describe("frame keys", () => {
  it("are the same for the same file, and differ from frame to frame", async () => {
    const [a, b] = [await keysOf(video(), FRAMES), await keysOf(video(), FRAMES)];
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(3);
    expect(a[0]).toMatch(/^[0-9a-f]{40}$/);
  });

  it("an edit changes the keys of the frames it draws, and no others", async () => {
    // The title's words: only the frame under the title.
    expect(await changed(video(), video({ title: "Goodbye" }))).toEqual([30]);
    // An effect on the second clip: only the second clip's frame.
    expect(await changed(video(), video({ stops: 1 }))).toEqual([90]);
    // The second clip's length: its own frames (its range changed), not the first clip's.
    expect(await changed(video(), video({ out: 3 }))).toEqual([90]);
    // A new overlay later on: no frame before it.
    expect(await changed(video(), video({ more: `<Title id="late" start={3.5} duration={0.4}>Late</Title>` }))).toEqual(
      [],
    );
    // The composition's settings: every frame.
    expect(await changed(video(), video({ fps: 25 }))).toEqual(FRAMES);
  });

  it("a camera's values and keys change every frame it is over", async () => {
    const under = (camera: string) =>
      video()
        .replace("import { Clip,", "import { Camera, Clip,")
        .replace(/(<Composition [^>]*>)/, `$1\n<Camera id="cam" ${camera}>`)
        .replace("</Composition>", "</Camera>\n</Composition>");
    expect(await changed(under("zoom={1.2}"), under("zoom={1.2}"))).toEqual([]);
    expect(await changed(under("zoom={1.2}"), under("zoom={1.5}"))).toEqual(FRAMES);
    const keyed = (to: number) => under(`x={[{ at: 0, value: 0 }, { at: 3, value: ${to} }]}`);
    expect(await changed(keyed(100), keyed(200))).toEqual(FRAMES);
    // Putting a camera in is an edit to every frame, though it shows them as written.
    expect(await changed(video(), under("zoom={1}"))).toEqual(FRAMES);
  });

  it("a pushed camera's frames change when the element it makes room for moves", async () => {
    // A title that starts at 0.5 s, placed off the frame's right edge: the push pans to it from then on.
    const pushed = (x: number) =>
      video({
        more: `<Title id="late" start={0.5} duration={3} box={{ x: ${x}, y: 180, origin: "center" }}>Late</Title>`,
      })
        .replace("import { Clip,", "import { Camera, Clip,")
        .replace(/(<Composition [^>]*>)/, `$1\n<Camera id="cam" push={{ on: ["late"] }}>`)
        .replace("</Composition>", "</Camera>\n</Composition>");
    expect(await changed(pushed(700), pushed(700))).toEqual([]);
    expect(await changed(pushed(700), pushed(800))).toEqual(FRAMES);
  });

  it("an edit to a followed element changes the frames its follower is on, though it is not on screen then", async () => {
    // The arm shows only before frame 30 (0.9 s); the hand that moves with it shows only at frame 90.
    const rig = (x: number) =>
      video({
        more: `<Title id="arm" start={0} duration={0.9} box={{ x: ${x}, y: 100, width: 100, height: 40 }}>Arm</Title>
        <Title id="hand" follow="arm" start={2.5} duration={1} box={{ x: 0, y: 40, width: 100, height: 40 }}>Hand</Title>`,
      });
    expect(await changed(rig(100), rig(100))).toEqual([]);
    expect(await changed(rig(100), rig(200))).toEqual([6, 90]);
  });

  it("a generator's params change the frames its element is on, and no others", async () => {
    const wobbly = (amount: number) =>
      video({
        more: `<Title id="late" start={2.5} duration={1} transform={{ rotation: { type: "wiggle", amount: ${amount} } }}>Late</Title>`,
      });
    expect(await changed(wobbly(2), wobbly(2))).toEqual([]);
    // The title is on screen at frame 90 only.
    expect(await changed(wobbly(2), wobbly(5))).toEqual([90]);
  });

  it("a comment or a helper nobody draws changes nothing, until free code is on screen", async () => {
    const helper = "const unused = 1;";
    expect(await changed(video(), video({ top: helper }))).toEqual([]);
    // With a layer up at frame 30, the file's text decides that frame: its code can read anything in the file.
    const layer = `<Layer id="count" start={0.9} duration={0.3}><Count /></Layer>`;
    const count = (label: string) =>
      `function Count() { const { elapsed } = useLayer(); return <div>${label} {elapsed}</div>; }`;
    expect(await changed(video({ more: layer, top: count("a") }), video({ more: layer, top: count("b") }))).toEqual([
      30,
    ]);
    expect(
      await changed(video({ more: layer, top: count("a") }), video({ more: layer, top: `${count("a")}\n${helper}` })),
    ).toEqual([30]);
  });

  it("a frame free code draws changes with the file's own modules", async () => {
    mkdirSync(join(dir, "blocks"), { recursive: true });
    const layer = `<Layer id="count" start={0.9} duration={0.3}><Count /></Layer>`;
    const top = `import { Count } from "./blocks/count";`;
    const write = (label: string) =>
      writeFileSync(
        join(dir, "blocks", "count.tsx"),
        `import { useLayer } from "@uberscene/kit";\nexport function Count() { const { elapsed } = useLayer(); return <div>${label} {elapsed}</div>; }`,
      );
    write("a");
    const before = await keysOf(video({ more: layer, top }), FRAMES);
    write("b");
    const after = await keysOf(video({ more: layer, top }), FRAMES);
    expect(FRAMES.filter((_, i) => before[i] !== after[i])).toEqual([30]);
  });

  it("a local helper module the video imports: a changed helper changes the keys, the same one keeps them", async () => {
    const top = `import { label } from "./helper";`;
    const write = (body: string) => writeFileSync(join(dir, "helper.ts"), `export const label = () => ${body};`);
    const layer = `<Layer id="count" start={0.9} duration={0.3}><div>{label()}</div></Layer>`;
    write(`"a"`);
    const first = await keysOf(video({ more: layer, top }), FRAMES);
    expect(await keysOf(video({ more: layer, top }), FRAMES)).toEqual(first);
    write(`"b"`);
    const second = await keysOf(video({ more: layer, top }), FRAMES);
    expect(FRAMES.filter((_, i) => first[i] !== second[i])).toEqual([30]);
  });

  it("a package linked from a checkout counts by its source; one installed, by its version", async () => {
    // A workspace package: node_modules links to a folder outside it, as pnpm links @uberscene/kit in this repo.
    const linked = join(dir, "packages", "helper");
    mkdirSync(join(linked, "src"), { recursive: true });
    writeFileSync(
      join(linked, "package.json"),
      JSON.stringify({ name: "linked-helper", version: "1.0.0", main: "src/index.js" }),
    );
    mkdirSync(join(dir, "node_modules"), { recursive: true });
    symlinkSync(linked, join(dir, "node_modules", "linked-helper"), "dir");
    // An installed package: a real folder in node_modules.
    const installed = join(dir, "node_modules", "installed-helper");
    mkdirSync(installed, { recursive: true });
    const install = (version: string, body: string) => {
      writeFileSync(
        join(installed, "package.json"),
        JSON.stringify({ name: "installed-helper", version, main: "index.js" }),
      );
      writeFileSync(join(installed, "index.js"), `export const shade = () => ${body};`);
    };
    const writeLinked = (body: string) =>
      writeFileSync(join(linked, "src", "index.js"), `export const shade = () => ${body};`);
    writeLinked(`"red"`);
    install("1.0.0", `"red"`);
    const imports = { "linked-helper": "linked-helper", "installed-helper": "installed-helper" };
    const cut = video({
      top: `import { shade } from "linked-helper";\nimport { shade as other } from "installed-helper";`,
      more: `<Layer id="count" start={0.9} duration={0.3}><div style={{ color: shade(), background: other() }} /></Layer>`,
    });
    const first = await keysOf(cut, FRAMES, imports);
    expect(await keysOf(cut, FRAMES, imports)).toEqual(first);
    // The linked package's text: new keys, though its version is the same.
    writeLinked(`"blue"`);
    const second = await keysOf(cut, FRAMES, imports);
    expect(second).not.toEqual(first);
    // The installed package's text alone: its version still says what it is.
    install("1.0.0", `"blue"`);
    expect(await keysOf(cut, FRAMES, imports)).toEqual(second);
    install("1.0.1", `"blue"`);
    expect(await keysOf(cut, FRAMES, imports)).not.toEqual(second);
  });

  it("a media file that was replaced changes the frames that read it", async () => {
    const before = await keysOf(video(), FRAMES);
    utimesSync(join(dir, "b.mp4"), new Date(), new Date(Date.now() + 5000));
    const after = await keysOf(video(), FRAMES);
    expect(FRAMES.filter((_, i) => before[i] !== after[i])).toEqual([90]);
  });

  it("a replaced file whose asset id has a dot changes the frames that read it", async () => {
    // An id may hold a dot (asset:look.v2): the key reads look.v2.cube, not a file named look.
    const graded = video().replace(
      'effects={[{ type: "exposure"',
      'effects={[{ type: "lut", src: "asset:look.v2" }, { type: "exposure"',
    );
    const before = await keysOf(graded, FRAMES);
    utimesSync(join(dir, "look.v2.cube"), new Date(), new Date(Date.now() + 9000));
    const after = await keysOf(graded, FRAMES);
    expect(FRAMES.filter((_, i) => before[i] !== after[i])).toEqual([90]);
  });

  it("what is stored under a key is part of it", async () => {
    const file = join(dir, "extra.tsx");
    writeFileSync(file, video());
    const loaded = await loadVideo(file);
    const keys = new FrameKeys({
      state: loaded.state,
      source: loaded.source,
      media: directoryResolver(dir, loaded.manifest),
    });
    const [plain, tile, wider] = await Promise.all([
      keys.key(6),
      keys.key(6, { tile: 480 }),
      keys.key(6, { tile: 640 }),
    ]);
    expect(new Set([plain, tile, wider]).size).toBe(3);
  });
});

describe("the cache folder", () => {
  it("gives back what was kept, and nothing for what was not", () => {
    const cache = join(dir, "cache", "deep");
    expect(readCached(cache, "a.png")).toBeNull();
    writeCached(cache, "a.png", Uint8Array.from([1, 2, 3]));
    expect([...(readCached(cache, "a.png") ?? [])]).toEqual([1, 2, 3]);
  });

  it("is trimmed to its cap, the files used longest ago going first", () => {
    const cache = join(dir, "cache", "trimmed");
    mkdirSync(cache, { recursive: true });
    const kb = new Uint8Array(1024);
    // Ten files of 1 KB, each a second older than the next; f2 is read, which counts as a use.
    for (let i = 0; i < 10; i++) {
      writeFileSync(join(cache, `f${i}.png`), kb);
      const at = new Date(Date.now() - (10 - i) * 1000);
      utimesSync(join(cache, `f${i}.png`), at, at);
    }
    expect(readCached(cache, "f2.png")).not.toBeNull();
    trimCache(cache, 6 * 1024);
    const left = readdirSync(cache).sort();
    // A cap of 6 KB trims to 90% of it: five files stay, the newest four and the one just read.
    expect(left).toEqual(["f2.png", "f6.png", "f7.png", "f8.png", "f9.png"]);
  });

  it("leaves a folder under its cap alone", () => {
    const cache = join(dir, "cache", "small");
    writeCached(cache, "a.png", Uint8Array.from([1]));
    trimCache(cache, 1024);
    expect(readdirSync(cache)).toEqual(["a.png"]);
  });

  it("a folder that cannot be written is not an error", () => {
    writeFileSync(join(dir, "blocked"), "a file, not a folder");
    expect(() => writeCached(join(dir, "blocked", "cache"), "a.png", Uint8Array.from([1]))).not.toThrow();
  });
});

describe("the PNG reader and writer", () => {
  it("round-trips a picture, and pastes one into another", () => {
    const sheet = blankPicture(6, 4, [10, 20, 30]);
    const part = blankPicture(2, 2, [200, 100, 50]);
    paste(sheet, part, 3, 1);
    const back = decodePng(encodePng(sheet));
    expect([back.width, back.height]).toEqual([6, 4]);
    expect([...back.rgba]).toEqual([...sheet.rgba]);
    const at = (x: number, y: number) => [...back.rgba.subarray((y * 6 + x) * 4, (y * 6 + x) * 4 + 4)];
    expect(at(0, 0)).toEqual([10, 20, 30, 255]);
    expect(at(3, 1)).toEqual([200, 100, 50, 255]);
    expect(at(4, 2)).toEqual([200, 100, 50, 255]);
    expect(at(5, 1)).toEqual([10, 20, 30, 255]);
  });

  it("says what it does not read", () => {
    expect(() => decodePng(Uint8Array.from([1, 2, 3]))).toThrow("not a PNG");
  });
});
