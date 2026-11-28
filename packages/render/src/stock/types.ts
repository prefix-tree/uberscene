// What a stock library offers, in one shape for every library: a candidate from a search, and the file a fetch reads.
import type { AssetSource } from "@uberscene/sdk";

export type StockKind = "video" | "audio";

/** One rendition of a candidate: a file at one size. A sound has one. */
export interface StockFile {
  readonly url: string;
  readonly width?: number;
  readonly height?: number;
  /** Bytes, when the library says. */
  readonly bytes?: number;
  /** The file's type, as the library names it: `video/mp4`, `video/webm`, `audio/ogg`… */
  readonly mime: string;
}

/** A search result: enough to choose it, credit it and fetch it. */
export interface StockCandidate {
  /** `provider:id`, what `uberscene fetch` takes. */
  readonly ref: string;
  readonly kind: StockKind;
  readonly source: AssetSource;
  /** Seconds. */
  readonly duration: number;
  /** The picture's size at its largest rendition; none for a sound. */
  readonly width?: number;
  readonly height?: number;
  /** A still to look at: a frame of a video. */
  readonly thumbnail?: string;
  /** Words the library files it under. */
  readonly tags: readonly string[];
  /** Its renditions, smallest first. */
  readonly files: readonly StockFile[];
}

export interface StockSearch {
  readonly query: string;
  readonly kind: StockKind;
  /** At most this many; default 20. */
  readonly limit?: number;
  /** Only pictures this way up. */
  readonly orientation?: "portrait" | "landscape";
  /** Only candidates at least this many seconds long. */
  readonly minDuration?: number;
  /** Also let in licences that ask for credit (CC BY), where the library has both. Default: free of conditions only. */
  readonly attribution?: boolean;
}

/** What talks to the network: `fetch`, replaced in tests by recorded answers. */
export type Fetcher = (url: string, init?: { headers?: Record<string, string> }) => Promise<Response>;

export interface StockProvider {
  readonly name: string;
  readonly kinds: readonly StockKind[];
  search(search: StockSearch, fetcher: Fetcher): Promise<StockCandidate[]>;
  /** One candidate by its id in the library (the part of the ref after `provider:`). */
  get(id: string, fetcher: Fetcher): Promise<StockCandidate>;
}

/** Libraries ask automated clients to say what they are. Generic: no person's details. */
export const USER_AGENT = "uberscene (https://github.com/prefix-tree/uberscene)";

/**
 * Fetches with patience: a library that answers 429 (too many requests) or 5xx is asked again after a wait that grows
 * each time; any other failure is thrown with the library's own words.
 */
export async function patientFetch(
  fetcher: Fetcher,
  url: string,
  init: { headers?: Record<string, string> } = {},
  {
    tries = 5,
    wait = 10_000,
    sleep = defaultSleep,
  }: { tries?: number; wait?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const r = await fetcher(url, { headers: { "User-Agent": USER_AGENT, ...init.headers } });
    if (r.ok) return r;
    const retry = r.status === 429 || r.status >= 500;
    if (!retry || attempt >= tries) {
      const body = (await r.text().catch(() => "")).slice(0, 200).trim();
      throw new Error(`${new URL(url).host} answered ${r.status}${body ? `: ${body}` : ""}`);
    }
    const after = Number(r.headers.get("retry-after"));
    await sleep(after > 0 ? after * 1000 : wait * attempt);
  }
}

const defaultSleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** Text from a library's HTML (an author's link, a licence's markup), as plain words. */
export function plain(html: string | undefined): string {
  return (html ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
