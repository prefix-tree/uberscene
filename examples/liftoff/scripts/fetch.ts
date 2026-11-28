// The footage of the liftoff film, from Wikimedia Commons: NASA's launch films and videos, public domain. Each asset is
// a stretch of one original, read with ffmpeg (which seeks to it, so only those seconds are read), kept at its own
// height up to 4K and written as VP9 into media/, without sound. CREDITS.md is written from each file's page.
// The two vertical Starship clips (`local` in sources.ts) are not fetched: put them in media/ as catch.webm and
// return.webm.
//
//   pnpm --filter @uberscene/example-liftoff footage
//
// Needs ffmpeg with libvpx-vp9. It skips a file that is already there, and waits and tries again when Commons asks
// it to slow down.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { addAsset } from "@uberscene/render";

import { SOURCES } from "./sources";

const here = join(import.meta.dirname, "..");
const media = join(here, "media");
mkdirSync(media, { recursive: true });

/** Commons asks automated clients to say who they are. */
const UA = "uberscene-example/0.1 (https://github.com/prefix-tree/uberscene)";
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** The address of a file's original on upload.wikimedia.org, from the md5 of its name. */
function original(file: string): string {
  const name = file.replaceAll(" ", "_");
  const h = createHash("md5").update(name).digest("hex");
  return `https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(name)}`;
}

for (const s of SOURCES) {
  const out = join(media, `${s.id}.webm`);
  if (existsSync(out)) continue;
  if (s.file === "local") throw new Error(`${s.id}: put ${s.what} in media/${s.id}.webm (it is not fetched)`);
  process.stdout.write(`${s.id}: ${s.file}, ${s.from}–${s.to} s at ${s.height}p\n`);
  for (let attempt = 0; ; attempt++) {
    try {
      // -ss before -i seeks by the file's index, so only the bytes of those seconds are read from Commons. CRF 20
      // keeps the detail the vertical crop needs.
      execFileSync(
        "ffmpeg",
        [
          ...["-v", "error", "-y", "-user_agent", UA, "-ss", String(s.from), "-i", original(s.file)],
          ...["-t", String(s.to - s.from), "-an", "-vf", `scale=-2:${s.height}:flags=lanczos,fps=30`],
          ...["-c:v", "libvpx-vp9", "-crf", "20", "-b:v", "0", "-g", "30", "-deadline", "good", "-cpu-used", "4"],
          ...["-row-mt", "1", "-pix_fmt", "yuv420p", "-f", "webm", `${out}.part`],
        ],
        { stdio: "inherit" },
      );
      break;
    } catch (e) {
      if (attempt >= 5) throw e;
      // Commons answers 429 to clients that read too fast: wait longer each time.
      await sleep(60_000 * (attempt + 1));
    }
  }
  // Written under another name and moved, so a download cut off half way is made again next time.
  renameSync(`${out}.part`, out);
}
for (const s of SOURCES)
  await addAsset(join(media, `${s.id}.webm`), { id: s.id, manifest: join(here, "uberscene.json"), beats: false });

// The credits, from each file's page on Commons.
const credits = join(here, "CREDITS.md");
if (!existsSync(credits)) {
  const query = new URLSearchParams({
    action: "query",
    titles: [...new Set(SOURCES.filter((s) => s.file !== "local").map((s) => `File:${s.file}`))].join("|"),
    prop: "imageinfo",
    iiprop: "extmetadata|url",
    iiextmetadatafilter: "LicenseShortName|Artist|Credit",
    format: "json",
  });
  let pages: Record<
    string,
    { title: string; imageinfo?: { descriptionurl: string; extmetadata: Record<string, { value: string }> }[] }
  > = {};
  for (let attempt = 0; attempt < 5 && Object.keys(pages).length === 0; attempt++) {
    const r = await fetch(`https://commons.wikimedia.org/w/api.php?${query}`, { headers: { "User-Agent": UA } });
    if (r.ok) pages = ((await r.json()) as { query: { pages: typeof pages } }).query.pages;
    else await new Promise((done) => setTimeout(done, 15_000 * (attempt + 1)));
  }
  const plain = (html = ""): string =>
    html
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const rows = SOURCES.filter((s) => s.file !== "local").map((s) => {
    const page = Object.values(pages).find((p) => p.title === `File:${s.file}`);
    const info = page?.imageinfo?.[0];
    const m = info?.extmetadata ?? {};
    return `| \`${s.id}\` | [${s.file}](${info?.descriptionurl ?? "https://commons.wikimedia.org/"}) | ${s.what} | ${plain(m.Artist?.value) || "NASA"} | ${plain(m.LicenseShortName?.value) || "?"} |`;
  });
  writeFileSync(
    credits,
    `# Credits\n\nThe footage, from Wikimedia Commons, written by \`scripts/fetch.ts\`. The two vertical Starship clips (\`catch\`, \`return\`) are not from Commons and are not part of the repository: they are supplied by whoever builds the film. The music is a Strudel score (\`score.ts\`), written here and shared under the repository's licence; Strudel, which renders it, is fetched on first use and is not part of the repository.\n\n| Asset | File | What it shows | Author | Licence |\n|---|---|---|---|---|\n${rows.join("\n")}\n`,
  );
  process.stdout.write("CREDITS.md\n");
}
