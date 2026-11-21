// A platform package's prepack: refuses to pack without its binary, so an empty package can't reach npm.
import { accessSync, constants, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = process.cwd();
const { name } = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
const targets = JSON.parse(readFileSync(new URL("../targets.json", import.meta.url), "utf8"));
const target = targets.find((t) => t.package === name);
if (!target) throw new Error(`${name} is not in packages/codecs/targets.json`);
const binary = join(dir, "bin", target.binary);
try {
  if (statSync(binary).size < 1_000_000) throw new Error("it is too small to be the codec");
  if (target.os !== "win32") accessSync(binary, constants.X_OK);
} catch (error) {
  console.error(
    `${name}: bin/${target.binary} is missing or not executable (${error.message}). Build it for ${target.rust} and run \`node packages/codecs/scripts/place.mjs --target ${target.dir} --from <binary>\`.`,
  );
  process.exit(1);
}
