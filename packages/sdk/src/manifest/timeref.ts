import { parseRef, refPattern } from "@uberscene/kit/schema";

import type { ResolveError } from "../resolve/errors";
import type { AssetEntry } from "./types";

export type TimeRef =
  | number
  | `word:${number}`
  | `word:${number}.end`
  | `shot:${number}`
  | `shot:${number}.end`
  | `silence:${number}`
  | `silence:${number}.end`
  | `beat:${number}`
  | `beat:${number}.end`
  | `marker:${string}`;

export type ParsedTimeRef =
  | { readonly kind: "seconds"; readonly value: number }
  | { readonly kind: "word" | "shot" | "silence" | "beat"; readonly index: number; readonly edge: "start" | "end" }
  | { readonly kind: "marker"; readonly id: string }
  | { readonly kind: "invalid"; readonly reason: string };

/** The forms a time reference takes, of the one reference grammar. */
const FORMS = ["moment", "marker"] as const;
const PATTERN = refPattern(FORMS);

export function isTimeRefString(value: unknown): value is string {
  return typeof value === "string" && PATTERN.test(value);
}

export function parseTimeRef(ref: unknown): ParsedTimeRef {
  if (typeof ref === "number") {
    return Number.isFinite(ref) && ref >= 0
      ? { kind: "seconds", value: ref }
      : { kind: "invalid", reason: "seconds must be a finite non-negative number" };
  }
  if (typeof ref !== "string") return { kind: "invalid", reason: "a time is a number or a reference string" };
  const target = parseRef(ref, FORMS);
  if (target.type === "moment") return { kind: target.unit, index: target.index, edge: target.edge };
  if (target.type === "marker") return { kind: "marker", id: target.id };
  return { kind: "invalid", reason: `unrecognised time reference "${ref}"` };
}

/**
 * Turn a reference into seconds. Word, shot, silence and beat references are source
 * times on the asset; marker references are composition times.
 */
export function resolveTimeRef(
  ref: unknown,
  asset: AssetEntry | null,
  markers: ReadonlyMap<string, number>,
  ctx: { readonly id: string; readonly prop: string },
): number | ResolveError {
  const parsed = parseTimeRef(ref);
  const fail = (message: string): ResolveError => ({ code: "UNKNOWN_REF", id: ctx.id, prop: ctx.prop, message });
  switch (parsed.kind) {
    case "seconds":
      return parsed.value;
    case "invalid":
      return fail(parsed.reason);
    case "marker": {
      const t = markers.get(parsed.id);
      return t === undefined ? fail(`marker "${parsed.id}" does not exist`) : t;
    }
    case "word":
    case "shot":
    case "silence":
    case "beat": {
      if (!asset) return fail(`"${String(ref)}" needs an asset with a manifest`);
      const list = entriesOf(asset, parsed.kind);
      const entry = list?.find((e) => e.i === parsed.index);
      if (!entry) return fail(`${parsed.kind} ${parsed.index} is not in the manifest of ${asset.id}`);
      return parsed.edge === "end" ? entry.end : entry.start;
    }
  }
}

/** An asset's list of words, shots, silences or beats: the entries a reference of that kind counts. */
export function entriesOf(
  asset: AssetEntry,
  kind: "word" | "shot" | "silence" | "beat",
): readonly { readonly i: number; readonly start: number; readonly end: number }[] | undefined {
  if (kind === "word") return asset.transcript?.words;
  if (kind === "shot") return asset.shots;
  if (kind === "beat") return asset.beats;
  return asset.silences;
}
