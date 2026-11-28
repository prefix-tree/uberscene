// Pixabay's videos (https://pixabay.com/api/docs/), under the Pixabay Content License: free to use in a video, with no
// credit asked, though the credits name the author anyway. The key is the person's own, read from PIXABAY_API_KEY;
// Pixabay takes it in the address, so it is never written down: not in the manifest, the cache or an error.
import { type Fetcher, patientFetch, type StockCandidate, type StockFile, type StockProvider } from "./types";

const API = "https://pixabay.com/api/videos/";
const LICENCE = "Pixabay Content License";
/** Pixabay's renditions, smallest first. */
const SIZES = ["tiny", "small", "medium", "large"] as const;

interface PixabayRendition {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly size: number;
  readonly thumbnail?: string;
}
export interface PixabayHit {
  readonly id: number;
  readonly pageURL: string;
  readonly tags: string;
  readonly duration: number;
  readonly videos: Partial<Record<(typeof SIZES)[number], PixabayRendition>>;
  readonly user: string;
  readonly name?: string;
}

/** The key, or what to do without one. */
function key(env: NodeJS.ProcessEnv): string {
  const k = env.PIXABAY_API_KEY?.trim();
  if (!k)
    throw new Error(
      "Pixabay needs an API key: get one free at https://pixabay.com/api/docs/ and set PIXABAY_API_KEY (an environment variable; Pixabay reads it from the address, not a header)",
    );
  return k;
}

/** A Pixabay hit as a candidate. Renditions Pixabay left empty (a url of "") are dropped. */
export function pixabayCandidate(hit: PixabayHit): StockCandidate {
  const files: StockFile[] = SIZES.flatMap((size) => {
    const v = hit.videos[size];
    return v?.url ? [{ url: v.url, width: v.width, height: v.height, bytes: v.size, mime: "video/mp4" }] : [];
  });
  const largest = files[files.length - 1];
  const tags = hit.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const thumb = hit.videos.medium?.thumbnail ?? hit.videos.small?.thumbnail ?? hit.videos.tiny?.thumbnail;
  return {
    ref: `pixabay:${hit.id}`,
    kind: "video",
    source: {
      provider: "pixabay",
      id: String(hit.id),
      title: hit.name?.trim() || tags.slice(0, 3).join(", "),
      page: hit.pageURL,
      author: hit.user,
      licence: LICENCE,
    },
    duration: hit.duration,
    ...(largest?.width ? { width: largest.width, height: largest.height } : {}),
    ...(thumb ? { thumbnail: thumb } : {}),
    tags,
    files,
  };
}

/** Pixabay's videos. `env` is where the key is read from. */
export function pixabay(env: NodeJS.ProcessEnv = process.env): StockProvider {
  const ask = async (params: Record<string, string>, fetcher: Fetcher): Promise<PixabayHit[]> => {
    const url = `${API}?${new URLSearchParams({ key: key(env), safesearch: "true", ...params })}`;
    try {
      const r = await patientFetch(fetcher, url);
      return ((await r.json()) as { hits: PixabayHit[] }).hits;
    } catch (e) {
      // The address holds the key: say what failed without it.
      throw new Error(String(e instanceof Error ? e.message : e).replaceAll(key(env), "…"));
    }
  };
  return {
    name: "pixabay",
    kinds: ["video"],
    async search(search, fetcher) {
      if (search.kind !== "video") throw new Error("Pixabay's API serves videos and pictures, not sounds");
      const limit = Math.min(200, Math.max(3, search.limit ?? 20));
      // Asked for more than wanted when filtering by shape or length, which Pixabay's API cannot do itself.
      const filtered = search.orientation !== undefined || search.minDuration !== undefined;
      const hits = await ask(
        { q: search.query.slice(0, 100), per_page: String(filtered ? 200 : limit), video_type: "film" },
        fetcher,
      );
      return hits
        .map(pixabayCandidate)
        .filter((c) => c.files.length > 0)
        .filter(
          (c) =>
            search.orientation === undefined ||
            ((c.height ?? 0) > (c.width ?? 0) ? "portrait" : "landscape") === search.orientation,
        )
        .filter((c) => search.minDuration === undefined || c.duration >= search.minDuration)
        .slice(0, limit);
    },
    async get(id, fetcher) {
      if (!/^\d+$/.test(id)) throw new Error(`a Pixabay id is a number, got "${id}"`);
      const [hit] = await ask({ id }, fetcher);
      if (!hit) throw new Error(`Pixabay has no video ${id}`);
      return pixabayCandidate(hit);
    },
  };
}
