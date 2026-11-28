// Freesound (https://freesound.org/docs/api/): recorded sounds, each under the licence its author chose. CC0 only by
// default; `attribution` also lets in CC BY, whose authors the credits name. Sounds marked non-commercial (CC BY-NC)
// are never offered: a film posted anywhere may count as commercial.
//
// The key is the person's own: FREESOUND_API_KEY, sent as `Authorization: Token <key>`; or none, when the network
// adds that header itself (a network secret for freesound.org). With a plain key Freesound serves its high-quality
// previews (MP3), not the original files, which need each user to sign in.
import { type Fetcher, patientFetch, type StockCandidate, type StockProvider } from "./types";

const API = "https://freesound.org/apiv2";
const FIELDS = "id,name,username,license,duration,previews,url,tags,images";

export interface FreesoundSound {
  readonly id: number;
  readonly name: string;
  readonly username: string;
  readonly license: string;
  readonly duration: number;
  readonly url: string;
  readonly tags?: readonly string[];
  readonly previews?: Partial<
    Record<"preview-hq-mp3" | "preview-hq-ogg" | "preview-lq-mp3" | "preview-lq-ogg", string>
  >;
  readonly images?: Partial<Record<"waveform_m" | "waveform_l" | "spectral_m", string>>;
}

/** A Creative Commons licence's address as its short name: CC0, CC BY 4.0, CC BY-NC 3.0… */
export function licenceName(url: string): string {
  if (/publicdomain\/zero/.test(url)) return "CC0";
  const m = /licenses\/([a-z-]+)\/(\d\.\d)/.exec(url);
  if (m) return `CC ${(m[1] as string).toUpperCase()} ${m[2]}`;
  if (/sampling\+/.test(url)) return "Sampling+";
  return url;
}

/** A Freesound sound as a candidate. */
export function freesoundCandidate(sound: FreesoundSound): StockCandidate {
  const preview = sound.previews?.["preview-hq-mp3"] ?? sound.previews?.["preview-lq-mp3"];
  const wave = sound.images?.waveform_m ?? sound.images?.waveform_l;
  return {
    ref: `freesound:${sound.id}`,
    kind: "audio",
    source: {
      provider: "freesound",
      id: String(sound.id),
      title: sound.name.replace(/\.(wav|mp3|flac|aiff?|ogg)$/i, ""),
      page: sound.url,
      author: sound.username,
      licence: licenceName(sound.license),
    },
    duration: Math.round(sound.duration * 1000) / 1000,
    ...(wave ? { thumbnail: wave } : {}),
    tags: sound.tags ?? [],
    files: preview ? [{ url: preview, mime: "audio/mpeg" }] : [],
  };
}

/** The licences a search lets in: CC0, and CC BY with `attribution`; never a non-commercial one. */
export function licenceFilter(attribution: boolean): string {
  return attribution ? 'license:("Creative Commons 0" OR "Attribution")' : 'license:"Creative Commons 0"';
}

/** Freesound's sounds. `env` is where the key is read from. */
export function freesound(env: NodeJS.ProcessEnv = process.env): StockProvider {
  const headers = (): Record<string, string> => {
    const key = env.FREESOUND_API_KEY?.trim();
    return key ? { Authorization: `Token ${key}` } : {};
  };
  const ask = async (url: string, fetcher: Fetcher): Promise<Response> => {
    try {
      return await patientFetch(fetcher, url, { headers: headers() });
    } catch (e) {
      const message = String(e instanceof Error ? e.message : e);
      if (/answered 401/.test(message))
        throw new Error(
          "Freesound needs an API key: get one free at https://freesound.org/apiv2/apply and set FREESOUND_API_KEY (or a network secret for freesound.org: Authorization: Token <key>)",
        );
      throw e;
    }
  };
  return {
    name: "freesound",
    kinds: ["audio"],
    async search(search, fetcher) {
      if (search.kind !== "audio") throw new Error("Freesound has sounds, not videos");
      const limit = Math.min(150, Math.max(1, search.limit ?? 20));
      const filter = [
        licenceFilter(search.attribution ?? false),
        ...(search.minDuration !== undefined ? [`duration:[${search.minDuration} TO *]`] : []),
      ].join(" ");
      const params = new URLSearchParams({
        query: search.query,
        filter,
        fields: FIELDS,
        page_size: String(limit),
        sort: "score",
      });
      const r = await ask(`${API}/search/text/?${params}`, fetcher);
      const body = (await r.json()) as { results?: FreesoundSound[] };
      return (body.results ?? [])
        .map(freesoundCandidate)
        .filter((c) => c.files.length > 0 && !/NC/.test(c.source.licence))
        .slice(0, limit);
    },
    async get(id, fetcher) {
      if (!/^\d+$/.test(id)) throw new Error(`a Freesound id is a number, got "${id}"`);
      const r = await ask(`${API}/sounds/${id}/?fields=${FIELDS}`, fetcher);
      const c = freesoundCandidate((await r.json()) as FreesoundSound);
      if (/NC/.test(c.source.licence))
        throw new Error(`freesound:${id} is ${c.source.licence}, non-commercial: not offered for a film`);
      if (c.files.length === 0) throw new Error(`freesound:${id} has no preview to fetch`);
      return c;
    },
  };
}
