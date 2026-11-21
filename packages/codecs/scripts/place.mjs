// Puts a built `uberscene-codec` into its platform package's `bin/`, executable:
//   node packages/codecs/scripts/place.mjs                      this machine, from `pnpm native:build`
//   node packages/codecs/scripts/place.mjs --target darwin-x64 --from path/to/uberscene-codec
// The release workflow runs it once per platform, with the binaries its build jobs made.
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const here = fileURLToPath(new URL("..", import.meta.url));
const targets = JSON.parse(readFileSync(join(here, "targets.json"), "utf8"));
const { values } = parseArgs({ options: { target: { type: "string" }, from: { type: "string" } } });

const libc =
  process.platform === "linux" ? (process.report.getReport().header.glibcVersionRuntime ? "glibc" : "musl") : undefined;
const target = values.target
  ? targets.find((t) => t.dir === values.target)
  : targets.find(
      (t) => t.os === process.platform && t.cpu === process.arch && (t.libc === undefined || t.libc === libc),
    );
if (!target) {
  console.error(
    values.target
      ? `no target "${values.target}"; there are ${targets.map((t) => t.dir).join(", ")}`
      : `no package is published for ${process.platform} ${process.arch}${libc ? ` (${libc})` : ""}`,
  );
  process.exit(1);
}
const from = values.from ?? join(here, "..", "..", "native", "target", "release", target.binary);
if (!existsSync(from)) {
  console.error(`${from} does not exist: build it first (\`pnpm native:build\`)`);
  process.exit(1);
}
const bin = join(here, "platforms", target.dir, "bin");
mkdirSync(bin, { recursive: true });
copyFileSync(from, join(bin, target.binary));
chmodSync(join(bin, target.binary), 0o755);
console.log(`${target.package}: bin/${target.binary}`);
