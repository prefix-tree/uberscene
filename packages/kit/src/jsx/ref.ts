// The one grammar for a reference: text in a prop that names something else in the file (an element, one of its
// edges, a moment of its footage, a marker, a track, an asset, one of an element's props). Every schema pattern and
// every parser of such text is made from the forms here, so two places cannot read the same text two ways.

/** The edges of an element a reference may name. */
export type RefPoint = "start" | "mid" | "end";

/** What a reference names. */
export type RefTarget =
  /** `hook`, `hook.end`: an element, or one of its edges. */
  | { readonly type: "element"; readonly id: string; readonly edge?: RefPoint }
  /** `word:14`, `shot:3.end`, and `hook@word:14` (the word as `hook` plays it): an entry of a source's analyses. */
  | {
      readonly type: "moment";
      readonly unit: "word" | "shot" | "silence" | "beat";
      readonly index: number;
      readonly edge: "start" | "end";
      readonly of?: string;
    }
  /** `marker:intro`: a `<Marker>`. */
  | { readonly type: "marker"; readonly id: string }
  /** `track:music`: a track by its id. */
  | { readonly type: "track"; readonly id: string }
  /** `role:dialogue`: every track with that role. */
  | { readonly type: "role"; readonly role: string }
  /** `asset:talk`: an asset of the manifest. */
  | { readonly type: "asset"; readonly id: string }
  /** `tracked:talk.face`: a point, box or plane an analysis of an asset follows over time. */
  | { readonly type: "tracked"; readonly asset: string; readonly name: string }
  /** `logo.transform.rotation`: one prop of an element. */
  | { readonly type: "prop"; readonly id: string; readonly path: string }
  /** `start`: the start of the video. */
  | { readonly type: "start" };

/** The name of a form, for saying which ones a prop takes. */
export type RefForm = RefTarget["type"];

/** A reference that reads as none of the forms asked for. */
export interface InvalidRef {
  readonly type: "invalid";
  readonly reason: string;
}

const ID = "[A-Za-z_][A-Za-z0-9_-]*";
const ASSET_ID = "[A-Za-z0-9_.-]+";
/** One step of a path into an element's props: a name, or a place in a list (`effects.0.radius`). */
const STEP = `(?:${ID}|\\d+)`;
const MOMENT = "(word|shot|silence|beat):(\\d+)(\\.end)?";
const ALL_EDGES: readonly RefPoint[] = ["start", "mid", "end"];

/** The pattern of one form, without anchors. Capturing groups are numbered by `parseRef`, not read from here. */
function source(form: RefForm, accept: readonly RefForm[], edges: readonly RefPoint[]): string {
  switch (form) {
    case "start":
      return "start";
    case "element":
      return edges.length > 0 ? `${ID}(?:\\.(?:${edges.join("|")}))?` : ID;
    case "moment":
      return accept.includes("element") ? `(?:${ID}@)?${MOMENT}` : MOMENT;
    case "marker":
      return `marker:${ID}`;
    case "track":
      return `track:${ID}`;
    case "role":
      return `role:${ID}`;
    case "asset":
      return `asset:${ASSET_ID}`;
    case "tracked":
      return `tracked:${ID}\\.${ID}`;
    case "prop":
      return `${ID}(?:\\.${STEP})+`;
  }
}

/**
 * The pattern a schema checks a reference with: the forms in `accept`, and for an element the edges it may name
 * (all three when left out; none for a bare id).
 */
export function refPattern(accept: readonly RefForm[], edges: readonly RefPoint[] = ALL_EDGES): RegExp {
  return new RegExp(accept.map((form) => `^${source(form, accept, edges).replace(/\((?!\?)/g, "(?:")}$`).join("|"));
}

const MOMENT_RE = new RegExp(`^(?:(${ID})@)?${MOMENT}$`);
const MARKER_RE = new RegExp(`^marker:(${ID})$`);
const TRACK_RE = new RegExp(`^track:(${ID})$`);
const ROLE_RE = new RegExp(`^role:(${ID})$`);
const ASSET_RE = new RegExp(`^asset:(${ASSET_ID})$`);
const TRACKED_RE = new RegExp(`^tracked:(${ID})\\.(${ID})$`);
const ELEMENT_RE = new RegExp(`^(${ID})(?:\\.(start|mid|end))?$`);
const PROP_RE = new RegExp(`^(${ID})\\.(${STEP}(?:\\.${STEP})*)$`);

/**
 * Reads a reference as one of the forms in `accept`. Where two forms could read the same text, the earlier ones here
 * win: the prefixed forms (`marker:`, `asset:`…), then an element with one of `edges`, then a prop. So `logo.end` is
 * the end of `logo` wherever an element may be named, and a prop only where it may not.
 */
export function parseRef(
  text: string,
  accept: readonly RefForm[],
  edges: readonly RefPoint[] = ALL_EDGES,
): RefTarget | InvalidRef {
  const takes = (form: RefForm): boolean => accept.includes(form);
  if (takes("start") && text === "start") return { type: "start" };
  if (takes("moment")) {
    const m = MOMENT_RE.exec(text);
    if (m && (m[1] === undefined || takes("element")))
      return {
        type: "moment",
        unit: m[2] as "word" | "shot" | "silence" | "beat",
        index: Number(m[3]),
        edge: m[4] ? "end" : "start",
        ...(m[1] === undefined ? {} : { of: m[1] }),
      };
  }
  if (takes("marker")) {
    const m = MARKER_RE.exec(text);
    if (m) return { type: "marker", id: m[1] as string };
  }
  if (takes("track")) {
    const m = TRACK_RE.exec(text);
    if (m) return { type: "track", id: m[1] as string };
  }
  if (takes("role")) {
    const m = ROLE_RE.exec(text);
    if (m) return { type: "role", role: m[1] as string };
  }
  if (takes("asset")) {
    const m = ASSET_RE.exec(text);
    if (m) return { type: "asset", id: m[1] as string };
  }
  if (takes("tracked")) {
    const m = TRACKED_RE.exec(text);
    if (m) return { type: "tracked", asset: m[1] as string, name: m[2] as string };
  }
  if (takes("element")) {
    const m = ELEMENT_RE.exec(text);
    if (m && (m[2] === undefined || edges.includes(m[2] as RefPoint)))
      return {
        type: "element",
        id: m[1] as string,
        ...(m[2] ? { edge: m[2] as RefPoint } : {}),
      };
  }
  if (takes("prop")) {
    const m = PROP_RE.exec(text);
    if (m) return { type: "prop", id: m[1] as string, path: m[2] as string };
  }
  return { type: "invalid", reason: `unrecognised reference "${text}"` };
}
