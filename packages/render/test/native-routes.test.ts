// The export server starts one uberscene-codec per clip it decodes and per piece it encodes. A process that cannot
// start (the binary missing, too many open files) answers that request or fails that session; unheard, its 'error'
// event would end the whole Node process.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { nativeRoutes } from "../src/native/routes";

const dir = mkdtempSync(join(tmpdir(), "uberscene-native-routes-"));
const clip = join(dir, "clip.mp4");
writeFileSync(clip, "not really a video");
const routes = nativeRoutes(
  join(dir, "no-such-uberscene-codec"),
  { decode: "native", encode: "native" },
  { resolve: () => Promise.resolve({ kind: "path", path: clip }) },
);
let server: Server;
let base = "";

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    routes.handle(req, res, path).catch((error: unknown) => {
      if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain" });
      res.end(error instanceof Error ? error.message : String(error));
    });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  routes.close();
  await new Promise<void>((ok) => server.close(() => ok()));
  rmSync(dir, { recursive: true, force: true });
});

describe("a codec process that cannot start", () => {
  it("answers a frames request with the reason, and the server goes on", async () => {
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${base}/native/frames/clip?from=0&to=1`);
      expect(res.status).toBe(500);
      expect(await res.text()).toMatch(/could not start: .*ENOENT/);
    }
  });

  it("fails its encode session when it is ended, and the server goes on", async () => {
    const open = await fetch(`${base}/native/encode`, {
      method: "POST",
      body: JSON.stringify({ codec: "h264", width: 16, height: 16, fpsNum: 30, fpsDen: 1, keyint: 30 }),
    });
    expect(open.status).toBe(200);
    const { session } = (await open.json()) as { session: string };
    const end = await fetch(`${base}/native/encode/${session}/end`, { method: "POST" });
    expect(end.status).toBe(500);
    expect(await end.text()).toMatch(/could not start/);
    expect((await fetch(`${base}/native/frames/clip?at=0`)).status).toBe(500);
  });

  it("refuses a picture whose index is not a whole number just ahead of the next, instead of holding it forever", async () => {
    const open = await fetch(`${base}/native/encode`, {
      method: "POST",
      body: JSON.stringify({ codec: "h264", width: 2, height: 2, fpsNum: 30, fpsDen: 1, keyint: 30 }),
    });
    const { session } = (await open.json()) as { session: string };
    for (const n of ["abc", "-1", "1.5", "64", "100000"]) {
      const res = await fetch(`${base}/native/encode/${session}?n=${n}`, {
        method: "POST",
        body: new Uint8Array(2 * 2 * 4),
        signal: AbortSignal.timeout(5000),
      });
      expect(res.status).toBe(500);
      expect(await res.text()).toMatch(/cannot be encoded now: the encoder takes 0 to 63/);
    }
  });
});
