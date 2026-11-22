// Downloading the native codecs from the GitHub release: the machine's target, the address, the cache, and the hash
// check against the hashes the published package carries. No network: `fetch` is a stand-in.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CODEC_TARGETS, codecHashes, codecTarget, codecUrl, installCodec } from "../src/native/codecs";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "codec-download-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** A package root with a version and, when given, the release's hashes. */
function packageAt(version: string, sha256?: Record<string, string>): string {
  const root = join(dir, "pkg");
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@uberscene/render", version }));
  if (sha256) writeFileSync(join(root, "codecs.json"), JSON.stringify({ version, sha256 }));
  return root;
}

const served = (bytes: Uint8Array, status = 200) =>
  (async () => new Response(status === 200 ? Buffer.from(bytes) : null, { status })) as unknown as typeof fetch;

describe("the native codecs' download", () => {
  it("knows a target for each machine the release builds for, and none for the others", () => {
    expect(codecTarget({ platform: "darwin", arch: "arm64" })?.name).toBe("darwin-arm64");
    expect(codecTarget({ platform: "linux", arch: "x64", libc: "glibc" })?.name).toBe("linux-x64-gnu");
    expect(codecTarget({ platform: "win32", arch: "x64" })?.name).toBe("win32-x64");
    expect(codecTarget({ platform: "linux", arch: "x64", libc: "musl" })).toBeNull();
    expect(codecTarget({ platform: "win32", arch: "arm64" })).toBeNull();
    expect(CODEC_TARGETS.map((t) => t.name)).toEqual([
      "darwin-arm64",
      "darwin-x64",
      "linux-x64-gnu",
      "linux-arm64-gnu",
      "win32-x64",
    ]);
  });

  it("names the same targets as the release's asset script", async () => {
    // @ts-expect-error: a script of the repository's, plain JavaScript with no types.
    const script = (await import("../../../scripts/codec-assets.mjs")) as {
      TARGETS: string[];
      assetName: (t: string) => string;
    };
    expect(script.TARGETS).toEqual(CODEC_TARGETS.map((t) => t.name));
    for (const target of CODEC_TARGETS)
      expect(codecUrl("1.0.0", target).endsWith(`/${script.assetName(target.name)}`)).toBe(true);
  });

  it("asks the release of its own version for its target's asset", () => {
    const [mac, , , , windows] = CODEC_TARGETS as [never, never, never, never, never];
    expect(codecUrl("0.6.0", mac)).toBe(
      "https://github.com/prefix-tree/uberscene/releases/download/v0.6.0/uberscene-codec-darwin-arm64",
    );
    expect(codecUrl("0.6.0", windows)).toBe(
      "https://github.com/prefix-tree/uberscene/releases/download/v0.6.0/uberscene-codec-win32-x64.exe",
    );
  });

  const target = codecTarget();
  const maybe = target ? it : it.skip;

  maybe("downloads into the cache, checked, executable, and keeps it there", async () => {
    const bytes = new TextEncoder().encode("a binary");
    const sha = createHash("sha256").update(bytes).digest("hex");
    const root = packageAt("9.9.9", { [target?.name as string]: sha });
    const env = { UBERSCENE_CODEC_CACHE: join(dir, "cache") };
    let asked = "";
    const fetchOnce = (async (url: string) => {
      asked = url;
      return new Response(Buffer.from(bytes));
    }) as unknown as typeof fetch;
    const path = await installCodec(() => undefined, { fetch: fetchOnce, env, root });
    expect(asked).toContain("/v9.9.9/uberscene-codec-");
    expect(path.startsWith(join(dir, "cache", "9.9.9"))).toBe(true);
    expect(readFileSync(path, "utf8")).toBe("a binary");
    if (process.platform !== "win32") expect(statSync(path).mode & 0o111).not.toBe(0);
    // A second install finds it in the cache and asks nothing.
    const never = (async () => {
      throw new Error("asked the network");
    }) as unknown as typeof fetch;
    expect(await installCodec(() => undefined, { fetch: never, env, root })).toBe(path);
  });

  maybe("refuses a binary whose hash is not the released one, and leaves nothing in the cache", async () => {
    const root = packageAt("9.9.9", { [target?.name as string]: "0".repeat(64) });
    const env = { UBERSCENE_CODEC_CACHE: join(dir, "cache") };
    await expect(
      installCodec(() => undefined, { fetch: served(new Uint8Array([1, 2, 3])), env, root }),
    ).rejects.toThrow(/not the released ones/);
    expect(existsSync(join(dir, "cache", "9.9.9"))).toBe(false);
  });

  maybe("says what went wrong when the release has no such asset", async () => {
    const root = packageAt("9.9.9", { [target?.name as string]: "0".repeat(64) });
    const env = { UBERSCENE_CODEC_CACHE: join(dir, "cache") };
    await expect(installCodec(() => undefined, { fetch: served(new Uint8Array(), 404), env, root })).rejects.toThrow(
      /answered 404/,
    );
  });

  maybe("downloads nothing without the release's hashes, as in a checkout of the repository", async () => {
    const root = packageAt("9.9.9");
    expect(codecHashes(root)).toBeNull();
    await expect(
      installCodec(() => undefined, { fetch: served(new Uint8Array()), env: { UBERSCENE_CODEC_CACHE: dir }, root }),
    ).rejects.toThrow(/no codec hashes/);
  });
});
