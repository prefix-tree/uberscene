export type ResolveErrorCode =
  | "DANGLING_ANCHOR"
  /** `at` names a moment the anchor does not play: trimmed out, or the anchor is not footage. */
  | "INVALID_ANCHOR"
  /** `at` on an anchor the first version cannot map: reversed, or with speed keys or freezes. */
  | "UNSUPPORTED_ANCHOR"
  | "CYCLE"
  | "TRIM_PAST_SOURCE"
  | "UNKNOWN_REF"
  /** A reference names something of a kind it may not: a follow onto a clip, an SVG whose size is not known. */
  | "WRONG_KIND"
  /** A reference names something it may not from where it stands: across the camera's edge. */
  | "WRONG_SCOPE"
  | "NOT_ADJACENT"
  | "INSUFFICIENT_HANDLES"
  | "NO_VISUAL_PARENT"
  | "DUPLICATE_ID"
  | "MISSING_ASSET"
  | "START_ON_SEQUENCE"
  | "MISSING_START"
  | "AMBIGUOUS_DURATION"
  | "INVALID_CHILD"
  | "INVALID_TIME_RANGE"
  | "UNKNOWN_TOKEN"
  | "UNKNOWN_STYLE"
  /** `align="onset"` on a sound whose onset is not measured: `uberscene add` measures it. */
  | "NO_ONSET"
  | "SCHEMA";

export interface ResolveError {
  readonly code: ResolveErrorCode;
  readonly id: string;
  readonly prop?: string;
  readonly message: string;
}

export function isResolveError(value: unknown): value is ResolveError {
  return typeof value === "object" && value !== null && "code" in value && "message" in value && "id" in value;
}
