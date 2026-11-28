// The stock libraries, on answers recorded from Pixabay and Commons (test/fixtures/stock): no network, no key.
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import generateMedia, { mediaDir } from "../../player/e2e/gen-media";
import { commons, commonsCandidate } from "../src/stock/commons";
import { freesound, freesoundCandidate, licenceFilter, licenceName } from "../src/stock/freesound";
import {
  conversion,
  fetchStock,
  ffmpegArgs,
  findStock,
  parseStockRef,
  pickFile,
  slug,
  stockCredits,
} from "../src/stock/index";
import { pixabay, pixabayCandidate } from "../src/stock/pixabay";
import { sheetHtml } from "../src/stock/sheet";
import { type Fetcher, patientFetch } from "../src/stock/types";

const fixture = (name: string) => readFileSync(join(import.meta.dirname, "fixtures", "stock", name), "utf8");
const scratch = join(import.meta.dirname, ".tmp", "stock");
const KEY = "test-key-123";
const env = { PIXABAY_API_KEY: KEY, UBERSCENE_STOCK_CACHE: "" };

/** Answers from recorded bodies, by a test on the address; records what was asked. */
function recorded(routes: [(url: string) => boolean, () => Response][]): Fetcher & { asked: string[] } {
  const asked: string[] = [];
  const f = (async (url: string) => {
    asked.push(url);
    const route = routes.find(([match]) => match(url));
    return route ? route[1]() : new Response("not found", { status: 404 });
  }) as Fetcher & { asked: string[] };
  f.asked = asked;
  return f;
}
const json = (body: string) => () => new Response(body, { headers: { "content-type": "application/json" } });

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("Pixabay", () => {
  const hit = JSON.parse(fixture("pixabay-id.json")).hits[0];

  it("reads a hit as a candidate: its renditions smallest first, its author and licence", () => {
    const c = pixabayCandidate(hit);
    expect(c.ref).toBe("pixabay:228847");
    expect(c.kind).toBe("video");
    expect(c.files.map((f) => f.height)).toEqual([1280, 1920, 2560, 3840]);
    expect(c).toMatchObject({ width: 2160, height: 3840, duration: 20 });
    expect(c.source).toMatchObject({
      provider: "pixabay",
      id: "228847",
      author: "Kanenori",
      licence: "Pixabay Content License",
      page: "https://pixabay.com/videos/id-228847/",
    });
  });

  it("filters by shape and length, which Pixabay's API cannot", async () => {
    const f = recorded([
      [(u) => u.startsWith("https://pixabay.com/api/videos/"), json(fixture("pixabay-search.json"))],
    ]);
    const all = await pixabay(env).search({ query: "waterfall", kind: "video" }, f);
    const portrait = await pixabay(env).search({ query: "waterfall", kind: "video", orientation: "portrait" }, f);
    expect(all.length).toBeGreaterThan(portrait.length);
    for (const c of portrait) expect(c.height).toBeGreaterThan(c.width ?? 0);
    expect(f.asked[0]).toContain("safesearch=true");
  });

  it("says how to get a key without one, and never repeats the key in an error", async () => {
    await expect(pixabay({}).search({ query: "x", kind: "video" }, recorded([]))).rejects.toThrow(/PIXABAY_API_KEY/);
    const refusing = recorded([[() => true, () => new Response("[ERROR 400] Invalid key.", { status: 400 })]]);
    const error = await pixabay(env)
      .get("1", refusing)
      .catch((e: Error) => e);
    expect(String(error)).toMatch(/400/);
    expect(String(error)).not.toContain(KEY);
  });

  it("has no sounds", async () => {
    await expect(pixabay(env).search({ query: "wind", kind: "audio" }, recorded([]))).rejects.toThrow(/not sounds/);
  });
});

describe("Commons", () => {
  const pages = JSON.parse(fixture("commons-video.json")).query.pages;

  it("reads a file page: its licence, its author as plain words, its address without tracking", () => {
    const c = commonsCandidate(pages[0]);
    expect(c?.ref).toBe("commons:Waterfall in Huascarán National Park - Peru.webm");
    expect(c?.source).toMatchObject({ licence: "CC0", author: "CorraleH", provider: "commons" });
    expect(c?.files[0]?.url).not.toContain("utm_");
    expect(c?.files[0]?.mime).toBe("video/webm");
    expect(c).toMatchObject({ width: 1080, height: 1920, duration: 31.8 });
  });

  it("leaves out a file with no licence on its page", () => {
    const page = structuredClone(pages[0]);
    delete page.imageinfo[0].extmetadata.LicenseShortName;
    expect(commonsCandidate(page)).toBeNull();
  });

  it("asks for the kind of file searched for", async () => {
    const f = recorded([[(u) => u.includes("generator=search"), json(fixture("commons-video.json"))]]);
    const found = await commons().search({ query: "waterfall", kind: "video", limit: 2 }, f);
    expect(found).toHaveLength(2);
    expect(new URL(f.asked[0] as string).searchParams.get("gsrsearch")).toBe("waterfall filetype:video");
  });
});

describe("Freesound", () => {
  const sound = JSON.parse(fixture("freesound-sound.json"));

  it("reads a sound as a candidate: its preview, its author, its licence by name", () => {
    const c = freesoundCandidate(sound);
    expect(c).toMatchObject({ ref: "freesound:510762", kind: "audio" });
    expect(c.source).toMatchObject({
      provider: "freesound",
      author: "Keleti",
      licence: "CC0",
      title: "fire_crackling_2",
    });
    expect(c.files[0]).toMatchObject({ mime: "audio/mpeg" });
    expect(c.files[0]?.url).toMatch(/-hq\.mp3$/);
    expect(c.thumbnail).toMatch(/^https:/);
  });

  it("names licences, and lets in CC BY only when asked", () => {
    expect(licenceName("http://creativecommons.org/publicdomain/zero/1.0/")).toBe("CC0");
    expect(licenceName("https://creativecommons.org/licenses/by/4.0/")).toBe("CC BY 4.0");
    expect(licenceName("http://creativecommons.org/licenses/by-nc/3.0/")).toBe("CC BY-NC 3.0");
    expect(licenceFilter(false)).toBe('license:"Creative Commons 0"');
    expect(licenceFilter(true)).toContain("Attribution");
  });

  it("searches CC0 sounds with the key as a token, and never offers a non-commercial one", async () => {
    const f = recorded([[(u) => u.includes("/search/text/"), json(fixture("freesound-search.json"))]]);
    const asked: Record<string, string>[] = [];
    const spy = (async (url: string, init?: { headers?: Record<string, string> }) => {
      asked.push(init?.headers ?? {});
      return f(url, init);
    }) as Fetcher;
    const found = await freesound({ FREESOUND_API_KEY: "k" }).search({ query: "waterfall", kind: "audio" }, spy);
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((c) => c.source.licence === "CC0")).toBe(true);
    expect(new URL(f.asked[0] as string).searchParams.get("filter")).toBe('license:"Creative Commons 0"');
    expect(asked[0]?.Authorization).toBe("Token k");
    const nc = { ...sound, license: "http://creativecommons.org/licenses/by-nc/4.0/" };
    const g = recorded([[() => true, json(JSON.stringify(nc))]]);
    await expect(freesound({}).get("510762", g)).rejects.toThrow(/non-commercial/);
  });

  it("says how to get a key when Freesound refuses", async () => {
    const refusing = recorded([[() => true, () => new Response('{"detail":"no"}', { status: 401 })]]);
    await expect(freesound({}).search({ query: "x", kind: "audio" }, refusing)).rejects.toThrow(/FREESOUND_API_KEY/);
  });
});

describe("asking patiently", () => {
  it("waits and asks again on 429, then fails with the library's words", async () => {
    let n = 0;
    const waits: number[] = [];
    const f = (async () => (++n < 3 ? new Response("slow down", { status: 429 }) : new Response("ok"))) as Fetcher;
    const r = await patientFetch(f, "https://example.org/", {}, { wait: 5, sleep: async (ms) => void waits.push(ms) });
    expect(await r.text()).toBe("ok");
    expect(waits).toEqual([5, 10]);
    const never = (async () => new Response("slow down", { status: 429 })) as Fetcher;
    await expect(
      patientFetch(never, "https://example.org/", {}, { tries: 2, wait: 1, sleep: async () => {} }),
    ).rejects.toThrow(/answered 429: slow down/);
  });
});

describe("fetching", () => {
  const candidate = pixabayCandidate(JSON.parse(fixture("pixabay-id.json")).hits[0]);

  it("picks the smallest rendition tall enough, or the largest", () => {
    expect(pickFile(candidate, 1920).height).toBe(1920);
    expect(pickFile(candidate, 2000).height).toBe(2560);
    expect(pickFile(candidate, 9999).height).toBe(3840);
  });

  it("converts only what the engine cannot play as it is, or a stretch", () => {
    const mp4 = pickFile(candidate, 1080);
    expect(conversion(candidate, mp4, {})).toBeUndefined();
    expect(conversion(candidate, mp4, { from: 2, to: 6 })).toMatch(/2–6/);
    const sound = { ...candidate, kind: "audio" as const };
    expect(conversion(sound, { url: "x", mime: "audio/ogg" }, {})).toMatch(/WAV/);
    expect(conversion(sound, { url: "x", mime: "audio/wav" }, {})).toBeUndefined();
    expect(conversion(candidate, { url: "x", mime: "video/ogg" }, {})).toMatch(/WebM/);
  });

  it("seeks before reading, so only the stretch is read", () => {
    const args = ffmpegArgs(candidate, pickFile(candidate, 1080), "out.webm", { from: 2, to: 6 });
    expect(args.indexOf("-ss")).toBeLessThan(args.indexOf("-i"));
    expect(args.slice(args.indexOf("-t"), args.indexOf("-t") + 2)).toEqual(["-t", "4"]);
    expect(args).toContain("libvpx-vp9");
    expect(args).toContain("libopus");
    const tall = ffmpegArgs(candidate, pickFile(candidate, 3000), "out.webm", { from: 2, to: 6, height: 1920 });
    expect(tall[tall.indexOf("-vf") + 1]).toBe("scale=-2:1920:flags=lanczos");
    // A rendition no taller than asked for is kept at its size.
    expect(ffmpegArgs(candidate, pickFile(candidate, 1080), "o.webm", { from: 2, to: 6, height: 1280 })).not.toContain(
      "-vf",
    );
    const sound = ffmpegArgs({ ...candidate, kind: "audio" }, { url: "u", mime: "audio/ogg" }, "o.wav", {});
    expect(sound).toEqual(expect.arrayContaining(["pcm_s16le", "48000"]));
  });

  it("downloads a playable file, adds it, and keeps where it came from on its entry", async () => {
    const dir = mkdtempSync(join(scratch, "f-"));
    const bytes = readFileSync(join(mediaDir, "bars.webm"));
    const page = JSON.parse(fixture("commons-video.json")).query.pages[0];
    const f = recorded([
      [(u) => u.includes("commons.wikimedia.org/w/api.php"), json(JSON.stringify({ query: { pages: [page] } }))],
      [(u) => u.startsWith("https://upload.wikimedia.org/"), () => new Response(bytes)],
    ]);
    const r = await fetchStock("commons:Waterfall in Huascarán National Park - Peru.webm", {
      fetcher: f,
      cwd: dir,
      env,
    });
    expect(r.converted).toBeUndefined();
    expect(r.file).toBe(join(dir, "media", "waterfall-in-huascaran-national-park.webm"));
    const manifest = JSON.parse(readFileSync(join(dir, "uberscene.json"), "utf8"));
    const entry = manifest.assets["waterfall-in-huascaran-national-park"];
    expect(entry.kind).toBe("video");
    expect(entry.source).toMatchObject({ provider: "commons", licence: "CC0", author: "CorraleH" });
    expect(stockCredits(manifest)).toContain("| CorraleH | CC0 | commons |");
  });

  it("converts a stretch with ffmpeg and records the seconds kept", async () => {
    const dir = mkdtempSync(join(scratch, "g-"));
    const f = recorded([[(u) => u.startsWith("https://pixabay.com/api/"), json(fixture("pixabay-id.json"))]]);
    const ran: string[][] = [];
    const r = await fetchStock("pixabay:228847", {
      fetcher: f,
      cwd: dir,
      env,
      id: "falls",
      from: 0,
      to: 1,
      ffmpeg: (args) => {
        ran.push([...args]);
        // Stands in for ffmpeg: writes a real WebM where it was asked to.
        const out = args[args.length - 1] as string;
        copyFileSync(join(mediaDir, "bars.webm"), out);
      },
    });
    expect(ran).toHaveLength(1);
    expect(r.file.endsWith("falls.webm")).toBe(true);
    expect(r.entry.source).toMatchObject({ provider: "pixabay", from: 0, to: 1 });
  });

  it("refuses a stretch without both ends, or one past the end", async () => {
    const f = recorded([[(u) => u.startsWith("https://pixabay.com/api/"), json(fixture("pixabay-id.json"))]]);
    await expect(fetchStock("pixabay:228847", { fetcher: f, env, from: 2 })).rejects.toThrow(/go together/);
    await expect(fetchStock("pixabay:228847", { fetcher: f, env, from: 30, to: 31 })).rejects.toThrow(/past its end/);
  });
});

describe("refs, ids, the cache and the sheet", () => {
  it("reads a ref as its library and id; the id may hold colons", () => {
    expect(parseStockRef("pixabay:287510")).toEqual({ library: "pixabay", id: "287510" });
    expect(parseStockRef("commons:A: B.webm")).toEqual({ library: "commons", id: "A: B.webm" });
    expect(() => parseStockRef("287510")).toThrow(/library:id/);
  });

  it("makes an asset id from a title", () => {
    expect(slug("Waterfall in Huascarán National Park - Peru")).toBe("waterfall-in-huascaran-national-park");
    expect(slug("!!!")).toBe("stock");
  });

  it("keeps a search for a day, keyed without the key", async () => {
    const cache = mkdtempSync(join(scratch, "c-"));
    const f = recorded([[() => true, json(fixture("pixabay-search.json"))]]);
    let now = 0;
    const options = { env: { ...env, UBERSCENE_STOCK_CACHE: cache }, fetcher: f, now: () => now };
    await findStock("pixabay", { query: "waterfall", kind: "video" }, options);
    await findStock("pixabay", { query: "waterfall", kind: "video" }, options);
    expect(f.asked).toHaveLength(1);
    now = 25 * 60 * 60 * 1000;
    await findStock("pixabay", { query: "waterfall", kind: "video" }, options);
    expect(f.asked).toHaveLength(2);
    for (const file of readdirSync(cache)) expect(readFileSync(join(cache, file), "utf8")).not.toContain(KEY);
  });

  it("numbers the sheet's cells as the search listed them", () => {
    const hits = JSON.parse(fixture("pixabay-search.json")).hits.map(pixabayCandidate);
    const html = sheetHtml(hits, 3);
    expect(html).toContain("<b>1</b> pixabay:");
    expect(html).toContain(`<b>${hits.length}</b>`);
  });
});
