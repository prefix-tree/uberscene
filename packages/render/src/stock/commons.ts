// Wikimedia Commons (https://commons.wikimedia.org): videos and sound recordings under free licences, each file's own
// (CC0, CC BY, CC BY-SA, public domain…), read from its page and kept in the credits. No key. Commons answers 429 to
// clients that ask too fast; `patientFetch` waits and asks again.
import { type Fetcher, patientFetch, plain, type StockCandidate, type StockKind, type StockProvider } from "./types";

const API = "https://commons.wikimedia.org/w/api.php";
const FIELDS = "LicenseShortName|Artist|ObjectName|Credit";

export interface CommonsPage {
  readonly title: string;
  readonly imageinfo?: readonly {
    readonly url: string;
    readonly descriptionurl: string;
    readonly mime: string;
    readonly mediatype?: string;
    readonly size?: number;
    readonly width?: number;
    readonly height?: number;
    readonly duration?: number;
    readonly thumburl?: string;
    readonly extmetadata?: Record<string, { readonly value: string } | undefined>;
  }[];
}

/** The file's name without `File:`, as Commons spells it. */
const fileName = (title: string): string => title.replace(/^File:/, "");

/** A Commons file page as a candidate; null for one that is not a video or a sound, or has no licence on it. */
export function commonsCandidate(page: CommonsPage): StockCandidate | null {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const kind: StockKind | null = info.mediatype === "VIDEO" ? "video" : info.mediatype === "AUDIO" ? "audio" : null;
  // An Ogg file holding only sound is listed by Commons as AUDIO; a .ogg Commons calls VIDEO has a picture.
  if (!kind) return null;
  const m = info.extmetadata ?? {};
  const licence = plain(m.LicenseShortName?.value);
  if (!licence) return null;
  const name = fileName(page.title);
  // Commons adds tracking parameters to its addresses; the file is the same without them.
  const clean = (u: string) => u.replace(/\?utm_[^#]*$/, "");
  return {
    ref: `commons:${name}`,
    kind,
    source: {
      provider: "commons",
      id: name,
      title: plain(m.ObjectName?.value) || name.replace(/\.[^.]+$/, ""),
      page: clean(info.descriptionurl),
      author: plain(m.Artist?.value) || plain(m.Credit?.value) || "unknown",
      licence,
    },
    duration: Math.round((info.duration ?? 0) * 1000) / 1000,
    ...(kind === "video" && info.width ? { width: info.width, height: info.height ?? 0 } : {}),
    ...(info.thumburl ? { thumbnail: clean(info.thumburl) } : {}),
    tags: [],
    files: [
      {
        url: clean(info.url),
        mime: info.mime,
        ...(info.size ? { bytes: info.size } : {}),
        ...(kind === "video" && info.width ? { width: info.width, height: info.height ?? 0 } : {}),
      },
    ],
  };
}

const query = (params: Record<string, string>) =>
  `${API}?${new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "imageinfo",
    iiprop: "url|size|mime|mediatype|extmetadata",
    iiextmetadatafilter: FIELDS,
    iiurlwidth: "480",
    ...params,
  })}`;

async function pages(url: string, fetcher: Fetcher): Promise<CommonsPage[]> {
  const r = await patientFetch(fetcher, url);
  const body = (await r.json()) as { query?: { pages?: CommonsPage[] } };
  return body.query?.pages ?? [];
}

/** Wikimedia Commons' videos and sounds. */
export function commons(): StockProvider {
  return {
    name: "commons",
    kinds: ["video", "audio"],
    async search(search, fetcher) {
      const limit = Math.min(50, Math.max(1, search.limit ?? 20));
      const found = await pages(
        query({
          generator: "search",
          gsrnamespace: "6",
          gsrlimit: String(Math.min(50, limit * 2)),
          gsrsearch: `${search.query} filetype:${search.kind}`,
        }),
        fetcher,
      );
      return found
        .map(commonsCandidate)
        .filter((c): c is StockCandidate => c !== null && c.kind === search.kind)
        .filter(
          (c) =>
            search.orientation === undefined ||
            c.kind !== "video" ||
            ((c.height ?? 0) > (c.width ?? 0) ? "portrait" : "landscape") === search.orientation,
        )
        .filter((c) => search.minDuration === undefined || c.duration >= search.minDuration)
        .slice(0, limit);
    },
    async get(id, fetcher) {
      const [page] = await pages(query({ titles: `File:${fileName(id)}` }), fetcher);
      const c = page ? commonsCandidate(page) : null;
      if (!c) throw new Error(`Commons has no video or sound named "${fileName(id)}" with a licence on its page`);
      return c;
    },
  };
}
