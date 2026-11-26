// The footage of the orbit film: night timelapses from the International Space Station, from Wikimedia Commons, all
// public domain (NASA crew Earth observations and NASA's Scientific Visualization Studio). Each file is read from its
// original on Commons with ffmpeg, trimmed to the seconds the film can use, scaled and written as VP9 into media/,
// without sound. CREDITS.md is written from each file's page: its title, licence, author and address.
//
//   pnpm --filter @uberscene/example-orbit footage
//
// Needs ffmpeg with libvpx-vp9 and dav1d (the 4K aurora is AV1). It skips a file that is already there.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { addAsset } from "@uberscene/render";

const here = join(import.meta.dirname, "..");
const media = join(here, "media");
mkdirSync(media, { recursive: true });

/** Commons asks automated clients to say who they are. */
const UA = "uberscene-example/0.1 (https://github.com/prefix-tree/uberscene)";

interface Source {
  /** The asset id the film uses. */
  readonly id: string;
  /** The file's name on Commons. */
  readonly file: string;
  /** The seconds of it to keep. */
  readonly from: number;
  readonly to: number;
  /** The height to scale to: the vertical frame crops a third of the width, so more height keeps it sharp. */
  readonly height: number;
  readonly what: string;
}

const SOURCES: readonly Source[] = [
  {
    id: "stars",
    file: "Stars and the Milky Way over the Atlantic.ogv",
    from: 0,
    to: 17,
    height: 1080,
    what: "the Milky Way over the Atlantic, city lights on the horizon",
  },
  {
    id: "earth",
    file: "La Tierra de noche desde el espacio.ogv",
    from: 0,
    to: 61,
    height: 1080,
    what: "a night pass from the northwest United States to South America: moonlit clouds, cities, the sunrise",
  },
  {
    id: "storms",
    file: "Storms over Caribbean and South America.ogv",
    from: 0,
    to: 25,
    height: 1080,
    what: "thunderstorms over the Caribbean and South America, lightning flashing in the clouds",
  },
  {
    id: "aurora",
    file: "Aurora Australis as seen from ISS (SVS31281 - 1080p25).webm",
    from: 0,
    to: 50,
    height: 1080,
    what: "the aurora australis, green over the night side",
  },
  {
    id: "storm",
    file: "ISS views Aurora from the November 11-13, 2025 Geomagnetic Storm (SVS31375).webm",
    from: 28,
    to: 88,
    height: 1440,
    what: "red and green aurora from the November 2025 geomagnetic storm, in 4K",
  },
];

/** The address of a file's original on upload.wikimedia.org, from the md5 of its name. */
function original(file: string): string {
  const name = file.replaceAll(" ", "_");
  const h = createHash("md5").update(name).digest("hex");
  return `https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(name)}`;
}

for (const s of SOURCES) {
  const out = join(media, `${s.id}.webm`);
  if (existsSync(out)) continue;
  process.stdout.write(`${s.id}: ${s.file}, ${s.from}–${s.to} s\n`);
  // -ss before -i seeks by the file's index, so only the bytes of those seconds are read from Commons.
  execFileSync(
    "ffmpeg",
    [
      ...["-v", "error", "-y", "-user_agent", UA, "-ss", String(s.from), "-i", original(s.file)],
      ...["-t", String(s.to - s.from), "-an", "-vf", `scale=-2:${s.height}:flags=lanczos,fps=30`],
      ...["-c:v", "libvpx-vp9", "-crf", "28", "-b:v", "0", "-g", "30", "-deadline", "good", "-cpu-used", "4"],
      ...["-row-mt", "1", "-pix_fmt", "yuv420p", "-f", "webm", `${out}.part`],
    ],
    { stdio: "inherit" },
  );
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
    titles: SOURCES.map((s) => `File:${s.file}`).join("|"),
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
  const rows = SOURCES.map((s) => {
    const page = Object.values(pages).find((p) => p.title === `File:${s.file}`);
    const info = page?.imageinfo?.[0];
    const m = info?.extmetadata ?? {};
    return `| \`${s.id}\` | [${s.file}](${info?.descriptionurl ?? "https://commons.wikimedia.org/"}) | ${s.what} | ${plain(m.Artist?.value) || "NASA"} | ${plain(m.LicenseShortName?.value) || "?"} |`;
  });
  writeFileSync(
    credits,
    `# Credits\n\nThe footage, from Wikimedia Commons, written by \`scripts/fetch.ts\`. The music (\`scripts/music.ts\`) is synthesized here and shares the repository's licence.\n\n| Asset | File | What it shows | Author | Licence |\n|---|---|---|---|---|\n${rows.join("\n")}\n`,
  );
  process.stdout.write("CREDITS.md\n");
}
