// The crossing edit (examples/3d) in the real Player in Chromium: a clip that plays a 3D scene is drawn like footage.
// Playing forward, scrubbing back and jumping to a moment draw the same pixels, and the export draws that frame with
// the walker where the preview has it. Needs Chrome 157 for the export: the cached Chrome for Testing, or
// UBERSCENE_CHROMIUM.
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
  await page.goto(`http://localhost:${address.port}/scene.html`);
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

/** Where the walker's orange is: its centroid and pixel count. */
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

/** Seeks to `t` and reads the frame once the scene has drawn it (the walker is in it). */
async function drawnAt(t: number): Promise<Buffer> {
  let last: Buffer = Buffer.alloc(0);
  for (let i = 0; i < 20; i++) {
    await seek(t);
    last = await pixels();
    if (walker(last, W).n > 2000) return last;
  }
  return last;
}

describe("a clip that plays a 3D scene, in the Player", () => {
  it("draws 5.2 s the same after playing forward, scrubbing back and jumping there", async () => {
    for (let t = 2; t < 5.2; t += 0.2) await seek(t);
    const forward = await drawnAt(5.2);
    for (let t = 6.9; t > 5.2; t -= 0.2) await seek(t);
    const back = await drawnAt(5.2);
    await seek(0.5);
    const jump = await drawnAt(5.2);
    expect(forward.length).toBe(W * H * 4);
    expect(walker(jump, W).n).toBeGreaterThan(2000);
    expect(back.equals(forward)).toBe(true);
    expect(jump.equals(forward)).toBe(true);
  });

  it("exports that frame with the walker where the preview has it", async () => {
    const dir = mkdtempSync(join(tmpdir(), "scene-"));
    try {
      const render = join(import.meta.dirname, "..", "..", "..", "render");
      const out = join(dir, "still.png");
      const r = spawnSync(
        join(render, "node_modules", ".bin", "tsx"),
        [
          join(render, "src", "cli.ts"),
          join(render, "..", "..", "examples", "3d", "crossing.tsx"),
          "--still",
          "5.2",
          "--out",
          out,
          "--no-cache",
          "--quiet",
        ],
        { encoding: "utf8" },
      );
      expect(r.status, r.stderr).toBe(0);
      const url = `data:image/png;base64,${readFileSync(out).toString("base64")}`;
      const exported = Buffer.from(await page.evaluate((u) => window.__decode(u), url), "base64");
      const preview = await drawnAt(5.2);
      const a = walker(preview, W);
      const b = walker(exported, W);
      expect(Math.abs(a.x - b.x)).toBeLessThan(1);
      expect(Math.abs(a.y - b.y)).toBeLessThan(1);
      expect(Math.abs(a.n - b.n) / a.n).toBeLessThan(0.01);
      let total = 0;
      for (let i = 0; i < preview.length; i++) total += Math.abs(preview[i]! - exported[i]!);
      expect(total / preview.length).toBeLessThan(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
