// The crossing scene as media (examples/3d/crossing-clip.tsx) in the real Player in Chromium, as an editor previews
// it: a clip of a scene asset draws the same pixels after playing forward, scrubbing back and jumping, the export
// draws what the preview does, and a frame of the scene played by a <Clip> is the frame the <Three shot> tag draws
// at the same shot time.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { type Browser, chromium, type Page } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";

let server: ViteDevServer, browser: Browser, page: Page;
const W = 1920;
const H = 1080;

beforeAll(async () => {
  server = await createServer({ configFile: new URL("./vite.config.ts", import.meta.url).pathname });
  await server.listen();
  const address = server.httpServer!.address() as { port: number };
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://localhost:${address.port}/scene-clip.html`);
  await page
    .waitForFunction(() => window.__ready === true, null, { timeout: 60_000 })
    .catch((e: unknown) => {
      throw new Error(`page not ready: ${errors.join("; ") || String(e)}`);
    });
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const pixels = async (): Promise<Buffer> => Buffer.from(await page.evaluate(() => window.__pixels()), "base64");
const seek = (t: number) => page.evaluate((s) => window.__seek(s), t);

/** Seeks to `t` and reads the composition once the scene's frame is on it (the first open builds the scene). */
async function drawnAt(t: number): Promise<Buffer> {
  for (let i = 0; i < 40; i++) {
    await seek(t);
    const p = await pixels();
    if (walker(p, W).n > 0) return p;
  }
  throw new Error(`the scene drew nothing at ${t} s`);
}

/** Where the walker's orange is on screen: its centroid and pixel count. */
function walker(rgba: Buffer, width: number): { x: number; y: number; n: number } {
  let x = 0;
  let y = 0;
  let n = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i]!;
    const g = rgba[i + 1]!;
    const b = rgba[i + 2]!;
    if (r > 140 && r - g > 50 && g - b > 15) {
      const p = i / 4;
      x += p % width;
      y += Math.floor(p / width);
      n++;
    }
  }
  return { x: x / n, y: y / n, n };
}

const meanDiff = (a: Buffer, b: Buffer): number => {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i]! - b[i]!);
  return total / a.length;
};

/** Runs the export for a still of `file` at `t` and returns its RGBA, decoded in the page. */
async function exported(file: string, t: number): Promise<Buffer> {
  const dir = mkdtempSync(join(tmpdir(), "scene-"));
  try {
    const render = join(import.meta.dirname, "..", "..", "..", "render");
    const out = join(dir, "still.png");
    const r = spawnSync(
      join(render, "node_modules", ".bin", "tsx"),
      [
        join(render, "src", "cli.ts"),
        join(render, "..", "..", "examples", "3d", file),
        "--still",
        String(t),
        "--out",
        out,
        "--no-cache",
        "--quiet",
      ],
      { encoding: "utf8" },
    );
    expect(r.status, r.stderr).toBe(0);
    const url = `data:image/png;base64,${readFileSync(out).toString("base64")}`;
    return Buffer.from(await page.evaluate((u) => window.__decode(u), url), "base64");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("a scene asset played by <Clip>", () => {
  it("draws 3.2 s the same after playing forward, scrubbing back and jumping there", async () => {
    for (let t = 1.6; t < 3.2; t += 0.2) await seek(t);
    const forward = await drawnAt(3.2);
    for (let t = 4.8; t > 3.2; t -= 0.2) await seek(t);
    const back = await drawnAt(3.2);
    await seek(12);
    const jump = await drawnAt(3.2);
    expect(forward.length).toBe(W * H * 4);
    expect(back.equals(forward)).toBe(true);
    expect(jump.equals(forward)).toBe(true);
    // Past the title, the walker has crossed and is right of the table.
    expect(walker(jump, W).x).toBeGreaterThan(W * 0.6);
  });

  it("plays the clips' source times: half speed and reversed show the scene's own moments", async () => {
    // "slow" starts at 5 s with in 1.5 at half speed: 6 s of the edit is the scene's 2 s, the reveal.
    const slow = walker(await drawnAt(6), W);
    // "back" starts at 8.4 s and plays 3.2 down to 0.5: 9.6 s of the edit is the scene's 2 s again.
    const back = walker(await drawnAt(9.6), W);
    expect(Math.abs(slow.x - back.x)).toBeLessThan(1);
    expect(Math.abs(slow.n - back.n) / slow.n).toBeLessThan(0.01);
  });

  it("exports what the preview draws", async () => {
    const preview = await drawnAt(3.2);
    const still = await exported("crossing-clip.tsx", 3.2);
    const a = walker(preview, W);
    const b = walker(still, W);
    expect(Math.abs(a.x - b.x)).toBeLessThan(1);
    expect(Math.abs(a.y - b.y)).toBeLessThan(1);
    expect(meanDiff(preview, still)).toBeLessThan(1);
  });

  it("is the frame the <Three shot> tag draws at the same shot time", async () => {
    // crossing.tsx places the shot at 2 s, so its shot time 3.2 is 5.2 s of that edit.
    const clip = await exported("crossing-clip.tsx", 3.2);
    const tag = await exported("crossing.tsx", 5.2);
    expect(meanDiff(clip, tag)).toBeLessThan(0.5);
  });
});
