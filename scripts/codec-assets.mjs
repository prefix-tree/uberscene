// The release's native codecs, made ready to publish: each platform's binary (downloaded from its build job into
// <builds>/codec-<target>/) is named as its GitHub release asset in <assets>, and their SHA-256s are written into the
// render package (packages/render/codecs.json), which ships them to npm. `uberscene codecs install` downloads a
// binary from the release and checks it against that hash.
//   node scripts/codec-assets.mjs <builds> <assets>
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url).pathname;

/** Every target the release builds, as `CODEC_TARGETS` in packages/render/src/native/codecs.ts names them. */
export const TARGETS = ["darwin-arm64", "darwin-x64", "linux-x64-gnu", "linux-arm64-gnu", "win32-x64"];

/** A target's binary in its build folder, and the name of its release asset. */
export const assetName = (target) => `uberscene-codec-${target}${target.startsWith("win32") ? ".exe" : ""}`;

function prepare(builds, assets) {
  const { version } = JSON.parse(readFileSync(join(root, "packages", "render", "package.json"), "utf8"));
  mkdirSync(assets, { recursive: true });
  const sha256 = {};
  for (const target of TARGETS) {
    const exe = target.startsWith("win32") ? "uberscene-codec.exe" : "uberscene-codec";
    const binary = join(builds, `codec-${target}`, exe);
    if (!existsSync(binary)) throw new Error(`no binary for ${target}: ${binary} is missing`);
    copyFileSync(binary, join(assets, assetName(target)));
    sha256[target] = createHash("sha256").update(readFileSync(binary)).digest("hex");
    console.log(`${assetName(target)}  ${sha256[target]}`);
  }
  writeFileSync(join(root, "packages", "render", "codecs.json"), `${JSON.stringify({ version, sha256 }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [builds, assets] = process.argv.slice(2);
  if (!builds || !assets) throw new Error("usage: node scripts/codec-assets.mjs <builds> <assets>");
  prepare(builds, assets);
}
