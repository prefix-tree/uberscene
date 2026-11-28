import { capabilitiesOf, MAIN_TRACK_ID } from "@uberscene/kit/schema";

import { lookupAsset } from "../../../manifest/types";
import type { ElementSite, SourceIndex } from "../../index";
import type { Diagnostic, LintOptions } from "../index";
import { boxPlacement } from "./box";
import { deprecatedProps, oldThemeVariables } from "./deprecated";
import { declaration } from "./fonts";
import { ntscFrameRate } from "./frame-rate";
import { freeCodeClock, strayHtml } from "./free-code";
import { notRendered } from "./not-rendered";
import { everythingIsAProp } from "./props";
import { cutNearShot, repeatedSource, shotChangeInsideCrop } from "./shots";
import { fontAvailable, themeLiterals, themeRefs } from "./theme";

export interface Rule {
  readonly name: string;
  check(index: SourceIndex, options: LintOptions): Diagnostic[];
}

const TIMING_PROPS = ["in", "out", "duration", "start", "offset", "anchor", "at"] as const;

const literalIds: Rule = {
  name: "literal-ids",
  check: (index) =>
    index.anonymous.map((a) => ({
      rule: "literal-ids",
      severity: "error",
      message: `<${a.kind}>: ${a.reason}; every element needs a literal id so the editor can address it`,
      range: a.range,
    })),
};

const uniqueIds: Rule = {
  name: "unique-ids",
  check: (index) => {
    // Vocabulary elements only: an HTML `id` in free code is the page's business.
    const seen = new Map<string, number>();
    const out: Diagnostic[] = [];
    for (const { id, range } of index.idSites) {
      const count = (seen.get(id) ?? 0) + 1;
      seen.set(id, count);
      if (count === 2)
        out.push({ rule: "unique-ids", severity: "error", message: `id "${id}" is used more than once`, range, id });
    }
    return out;
  },
};

const noStartOnSequence: Rule = {
  name: "no-start-on-sequence",
  check: (index) => {
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      const start = site.props.get("start");
      if (!start || !site.parent) continue;
      const parent = index.elements.get(site.parent);
      if (parent?.kind !== "track") continue;
      const layout = parent.props.get("layout")?.literal;
      if (layout === "free") continue;
      if (site.props.has("anchor")) continue;
      out.push({
        rule: "no-start-on-sequence",
        severity: "error",
        message: `"${site.id}" has start on a sequence track; order decides start there, or use layout="free"`,
        range: start.range,
        id: site.id,
        prop: "start",
      });
    }
    return out;
  },
};

/** The hooks a helper that makes elements may call: they read the player's clock, nothing else. */
const LAYER_HOOKS: ReadonlySet<string> = new Set(["useT", "useLayer"]);

/**
 * A helper that makes vocabulary elements is called by the resolver as a plain function, so it cannot use hooks.
 * Free code (a component inside a `<Layer>`, which makes HTML, canvas or WebGL) is mounted by React and may use any.
 */
const pureHelpers: Rule = {
  name: "pure-helpers",
  check: (index) =>
    [...index.helpers.values()]
      .filter((h) => h.producesElements && h.hooks.some((n) => !LAYER_HOOKS.has(n)))
      .map(
        (h) =>
          ({
            rule: "pure-helpers",
            severity: "error",
            message: `helper ${h.name} makes timeline elements and calls ${h.hooks.filter((n) => !LAYER_HOOKS.has(n)).join(", ")}; the resolver expands it as a plain function, so keep hooks in the free code inside a <Layer>`,
            range: h.range,
          }) satisfies Diagnostic,
      ),
};

const expressionLocked: Rule = {
  name: "expression-locked",
  check: (index) => {
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      for (const prop of TIMING_PROPS) {
        const p = site.props.get(prop);
        if (p?.isExpression && p.binding === undefined)
          out.push({
            rule: "expression-locked",
            severity: "warning",
            message: `"${site.id}.${prop}" is an expression; the timeline will show it locked`,
            range: p.range,
            id: site.id,
            prop,
          });
      }
    }
    return out;
  },
};

const oneCaptions: Rule = {
  name: "one-captions",
  check: (index) => {
    const sites = [...index.elements.values()].filter((s) => s.kind === "captions");
    return sites.slice(1).map(
      (s) =>
        ({
          rule: "one-captions",
          severity: "error",
          message: "a composition has one <Captions>",
          range: s.range,
          id: s.id,
        }) satisfies Diagnostic,
    );
  },
};

const ambiguousDuration: Rule = {
  name: "ambiguous-duration",
  check: (index) => {
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      if (!capabilitiesOf(site.kind).trimSource) continue;
      const d = site.props.get("duration");
      if (d && site.props.has("out"))
        out.push({
          rule: "ambiguous-duration",
          severity: "error",
          message: `"${site.id}" gives both out and duration`,
          range: d.range,
          id: site.id,
          prop: "duration",
        });
    }
    return out;
  },
};

const fileShape: Rule = {
  name: "file-shape",
  check: (index) => {
    const out: Diagnostic[] = [];
    if (!index.hasDefaultExport)
      out.push({
        rule: "file-shape",
        severity: "error",
        message: "the file must default-export the video component",
        range: [0, 0],
      });
    if (index.hasSchema && !index.defaults)
      out.push({
        rule: "file-shape",
        severity: "error",
        message: "`export const schema` needs an `export const defaults = {…}` object literal",
        range: [0, 0],
      });
    if (!index.compositionId)
      out.push({ rule: "file-shape", severity: "error", message: "no <Composition> found", range: [0, 0] });
    return out;
  },
};

const missingAsset: Rule = {
  name: "missing-asset",
  check: (index, options) => {
    if (!options.manifest) return [];
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      const src = site.props.get("src");
      if (typeof src?.literal !== "string" || !src.literal.startsWith("asset:")) continue;
      if (!options.manifest.assets[src.literal.slice("asset:".length)]) {
        out.push({
          rule: "missing-asset",
          severity: "error",
          message: `${src.literal} is not in the manifest`,
          range: src.range,
          id: site.id,
          prop: "src",
        });
      }
    }
    return out;
  },
};

const sequenceGap: Rule = {
  name: "sequence-gap",
  check: (index) => {
    const main = firstSequenceTrack(index);
    if (!main) return [];
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      if (site.kind !== "gap" || site.parent !== main.id) continue;
      out.push({
        rule: "sequence-gap",
        severity: "warning",
        message: `"${site.id}" is a gap on the first sequence track "${main.id}"; nothing is under it, so those frames are black unless another track covers them`,
        range: site.range,
        id: site.id,
      });
    }
    return out;
  },
};

/**
 * Clips written straight in the composition are its bottom track wherever they stand, so one written after a
 * `<Track>` reads as if it drew over that track when it draws under it.
 */
const mainClipsFirst: Rule = {
  name: "main-clips-first",
  check: (index) => {
    const main = index.elements.get(MAIN_TRACK_ID);
    if (!main?.implicit) return [];
    let firstTrack = Number.POSITIVE_INFINITY;
    for (const site of index.elements.values())
      if (site.kind === "track" && !site.implicit && isTopTrack(index, site))
        firstTrack = Math.min(firstTrack, site.range[0]);
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      if (site.parent !== main.id || site.range[0] < firstTrack) continue;
      out.push({
        rule: "main-clips-first",
        severity: "warning",
        message: `"${site.id}" is written after a <Track> but plays on the main track, under every other: write the main clips first, or put them in <Track id="${MAIN_TRACK_ID}"> to place that track`,
        range: site.range,
        id: site.id,
      });
    }
    return out;
  },
};

const cutInsideWord: Rule = {
  name: "cut-inside-word",
  check: (index, options) => {
    if (!options.manifest) return [];
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      if (!capabilitiesOf(site.kind).playsAsset) continue;
      const src = site.props.get("src")?.literal;
      if (typeof src !== "string") continue;
      const words = lookupAsset(options.manifest, src)?.transcript?.words;
      if (!words || words.length === 0) continue;
      for (const prop of ["in", "out"] as const) {
        const p = site.props.get(prop);
        if (typeof p?.literal !== "number") continue;
        const t = p.literal;
        const word = words.find((w) => t > w.start && t < w.end);
        if (!word) continue;
        const ref = prop === "in" ? `word:${word.i}` : `word:${word.i}.end`;
        out.push({
          rule: "cut-inside-word",
          severity: "warning",
          message: `"${site.id}.${prop}" = ${t} cuts inside "${word.text}" (${word.start}–${word.end}); use ${ref} or a time outside the word`,
          range: p.range,
          id: site.id,
          prop,
        });
      }
    }
    return out;
  },
};

/**
 * A numeric `in` or `out` that is a beat of the music it trims, to within 5 ms: the number was read off the beats,
 * and `beat:N` says the same and follows the music when the track is added again or swapped.
 */
const numericOnBeat: Rule = {
  name: "numeric-on-beat",
  check: (index, options) => {
    if (!options.manifest) return [];
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      if (!capabilitiesOf(site.kind).playsAsset) continue;
      const src = site.props.get("src")?.literal;
      if (typeof src !== "string") continue;
      const beats = lookupAsset(options.manifest, src)?.beats;
      if (!beats || beats.length === 0) continue;
      for (const prop of ["in", "out"] as const) {
        const p = site.props.get(prop);
        if (typeof p?.literal !== "number") continue;
        const t = p.literal;
        const starts = beats.find((b) => Math.abs(b.start - t) <= 0.005);
        const ends = prop === "out" ? beats.find((b) => Math.abs(b.end - t) <= 0.005) : undefined;
        const ref = ends ? `beat:${ends.i}.end` : starts ? `beat:${starts.i}` : undefined;
        if (!ref) continue;
        out.push({
          rule: "numeric-on-beat",
          severity: "warning",
          message: `"${site.id}.${prop}" = ${t} is ${ref} of the music; write ${prop}="${ref}" so it stays on the beat when the track changes`,
          range: p.range,
          id: site.id,
          prop,
        });
      }
    }
    return out;
  },
};

/** `cutout` on a clip whose asset names no matte, or names one the manifest does not have. */
const cutoutWithoutMatte: Rule = {
  name: "cutout-without-matte",
  check: (index, options) => {
    if (!options.manifest) return [];
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      const cutout = site.props.get("cutout");
      if (site.kind !== "clip" || !cutout || cutout.literal === false) continue;
      const src = site.props.get("src")?.literal;
      if (typeof src !== "string" || !src.startsWith("asset:")) continue;
      const id = src.slice("asset:".length);
      const asset = options.manifest.assets[id];
      if (!asset) continue; // missing-asset says so
      const message =
        asset.matte === undefined
          ? `cutout needs a matte for ${id}: add a greyscale video of the same frames (npx uberscene add ${id}.matte.webm) and set "matte": "${id}.matte" on ${id} in the manifest`
          : options.manifest.assets[asset.matte]
            ? null
            : `the matte of ${id}, asset ${asset.matte}, is not in the manifest`;
      if (message)
        out.push({
          rule: "cutout-without-matte",
          severity: "error",
          message,
          range: cutout.range,
          id: site.id,
          prop: "cutout",
        });
    }
    return out;
  },
};

export const rules: readonly Rule[] = [
  literalIds,
  uniqueIds,
  noStartOnSequence,
  pureHelpers,
  strayHtml,
  freeCodeClock,
  expressionLocked,
  oneCaptions,
  ambiguousDuration,
  fileShape,
  missingAsset,
  cutoutWithoutMatte,
  sequenceGap,
  cutInsideWord,
  numericOnBeat,
  cutNearShot,
  shotChangeInsideCrop,
  repeatedSource,
  themeRefs,
  themeLiterals,
  fontAvailable,
  declaration,
  notRendered,
  deprecatedProps,
  oldThemeVariables,
  boxPlacement,
  everythingIsAProp,
  ntscFrameRate,
  mainClipsFirst,
];

/** The composition's first track in document order that lays out as a sequence and is not hidden: the one under everything else. */
function firstSequenceTrack(index: SourceIndex): ElementSite | null {
  let first: ElementSite | null = null;
  for (const site of index.elements.values()) {
    if (site.kind !== "track" || !isTopTrack(index, site)) continue;
    if (site.props.get("layout")?.literal === "free" || site.props.get("hidden")?.literal === true) continue;
    // The implicit main track has no place of its own in the text and is always the bottom one.
    if (!first || site.implicit || (!first.implicit && site.range[0] < first.range[0])) first = site;
  }
  return first;
}

/** A track of the composition: written straight in it, or inside its camera. */
function isTopTrack(index: SourceIndex, site: ElementSite): boolean {
  if (site.parent === index.compositionId) return true;
  const parent = site.parent === null ? undefined : index.elements.get(site.parent);
  return parent?.kind === "camera" && parent.parent === index.compositionId;
}
