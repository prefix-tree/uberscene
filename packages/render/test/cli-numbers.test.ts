// The CLI's number flags: a value that is not a number in range stops the command with a message naming the flag,
// before anything renders, instead of reaching the export as NaN.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
const dir = mkdtempSync(join(tmpdir(), "uberscene-cli-numbers-"));
const video = join(dir, "video.tsx");
writeFileSync(
  video,
  `import { Composition, Title, Track } from "@uberscene/kit";
export const manifest = { assets: {} };
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180}>
      <Track id="t" layout="free"><Title id="a" start={0} duration={2}>A</Title></Track>
    </Composition>
  );
}
`,
);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const run = (...args: string[]) =>
  spawnSync(join(root, "node_modules", ".bin", "tsx"), [join(root, "src", "cli.ts"), ...args], {
    cwd: dir,
    encoding: "utf8",
    timeout: 60_000,
  });

describe("a number flag", () => {
  it.each([
    ["--from", "1:30", "seconds"],
    ["--to", "abc", "seconds above 0"],
    ["--to", "0", "seconds above 0"],
    ["--bitrate", "4M", "bits per second above 0"],
    ["--keyframe", "-1", "seconds above 0"],
  ])("%s %s stops the export with a message", (flag, value, wants) => {
    const res = run(video, "--out", join(dir, "out.mp4"), `${flag}=${value}`);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain(`${flag} wants ${wants}, got "${value}"`);
  });

  it.each([
    ["--step", "fast", "seconds above 0"],
    ["--columns", "2.5", "a whole number of columns"],
    ["--cell", "NaN", "pixels above 0"],
  ])("%s %s stops look with a message", (flag, value, wants) => {
    const res = run("look", video, `${flag}=${value}`);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain(`${flag} wants ${wants}, got "${value}"`);
  });

  it("still writes subtitles for a range given in numbers", () => {
    const res = run(video, "--srt", join(dir, "a.srt"), "--from", "0", "--to", "1");
    expect(res.stderr).not.toMatch(/wants/);
  });
});
