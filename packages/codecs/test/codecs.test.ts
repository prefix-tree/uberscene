import { readFileSync } from "node:fs";
import { join } from "node:path";

import { binaryPath, TARGETS, targetFor } from "../src";

const platforms = join(import.meta.dirname, "..", "platforms");
const manifest = (dir: string) =>
  JSON.parse(readFileSync(join(platforms, dir, "package.json"), "utf8")) as Record<string, unknown>;
const own = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8")) as {
  version: string;
  optionalDependencies: Record<string, string>;
};

describe("the codec targets", () => {
  it("each have a platform package that says the same machine, at this package's version", () => {
    for (const target of TARGETS) {
      const pkg = manifest(target.dir);
      expect(pkg.name).toBe(target.package);
      expect(pkg.version).toBe(own.version);
      expect(pkg.os).toEqual([target.os]);
      expect(pkg.cpu).toEqual([target.cpu]);
      expect(pkg.libc).toEqual(target.libc ? [target.libc] : undefined);
      expect(pkg.files).toEqual(["bin"]);
      expect(target.binary).toBe(target.os === "win32" ? "uberscene-codec.exe" : "uberscene-codec");
    }
  });

  it("are all optional dependencies of this package, and nothing else is", () => {
    expect(Object.keys(own.optionalDependencies).sort()).toEqual(TARGETS.map((t) => t.package).sort());
  });

  it("pick the package for a machine, and none for a machine without one", () => {
    expect(targetFor({ platform: "darwin", arch: "arm64" })?.package).toBe("@uberscene/codecs-darwin-arm64");
    expect(targetFor({ platform: "linux", arch: "x64", libc: "glibc" })?.package).toBe(
      "@uberscene/codecs-linux-x64-gnu",
    );
    expect(targetFor({ platform: "win32", arch: "x64" })?.package).toBe("@uberscene/codecs-win32-x64");
    expect(targetFor({ platform: "linux", arch: "x64", libc: "musl" })).toBeNull();
    expect(targetFor({ platform: "win32", arch: "arm64" })).toBeNull();
    expect(binaryPath({ platform: "freebsd", arch: "x64" })).toBeNull();
  });
});
