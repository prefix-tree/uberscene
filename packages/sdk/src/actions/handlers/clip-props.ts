import { kindsWhere, kindTakes } from "@uberscene/kit/schema";

import type { Json } from "../../patches/types";
import { define, makePropHandler, rawProp } from "../handler-kit";
import { invalid, ok } from "../types";

// Each action here writes a prop, and applies to the kinds whose schema has it (`props`): the schema says which
// elements take a blend, a fade or a source range, so no list of kinds is kept here.

/** Kinds painted on the canvas: what `fit` is set on by `clip/setFit` (an SVG's fit is its own prop to write). */
const CANVAS_KINDS = kindsWhere((kind) => kind.plane === "canvas");
/** Kinds placed on a track. */
const TRACK_KINDS = kindsWhere((kind) => kind.placementScope === "track");

/** Speed always recomputes the timeline length; `out` stays, so nothing else changes in the file. */
define(makePropHandler({
  type: "clip/setSpeed",
  props: ["in", "out", "speed"],
  write: (p) => ({ speed: p.speed }),
  validate: (a) =>
    a.params.speed >= 0.1 && a.params.speed <= 20
      ? ok
      : invalid({ code: "OUT_OF_BOUNDS", message: "speed is 0.1..20" }),
}));
define(makePropHandler({
  type: "clip/setReverse",
  props: ["in", "out", "reverse"],
  write: (p) => ({ reverse: p.value }),
}));
define(makePropHandler({
  type: "clip/setBlend",
  props: ["blend"],
  write: (p) => ({
    ...(p.mode !== undefined ? { blend: p.mode } : {}),
    ...(p.opacity !== undefined ? { blendOpacity: p.opacity } : {}),
  }),
  validate: (a, state) => {
    const kind = state.items.get(a.params.id)?.kind;
    // A blend has a strength (`blendOpacity`) on what is drawn on the canvas.
    return a.params.opacity === undefined || (kind !== undefined && kindTakes(kind, "blendOpacity"))
      ? ok
      : invalid({
          code: "INVALID_PARAMS",
          message: `a blend opacity applies to a clip or a nested sequence; on <${kind}> set transform.opacity`,
          path: "opacity",
        });
  },
}));
define(makePropHandler({ type: "clip/setFit", kinds: CANVAS_KINDS, write: (p) => ({ fit: p.value }) }));
define(makePropHandler({
  type: "clip/setSource",
  // What shows or plays a file (`src`), on a track: not the captions' transcript nor a multicam's angle.
  kinds: TRACK_KINDS,
  props: ["src"],
  write: (p) => ({ src: p.src }),
}));
define(makePropHandler({
  type: "clip/setAnchor",
  // A word `at` names belongs to the anchor's footage: anchoring elsewhere drops it.
  write: (p, state) => ({
    anchor: p.anchor,
    offset: p.anchor === undefined ? undefined : (p.offset ?? 0),
    ...(p.anchor !== rawProp(state, p.id, "anchor") ? { at: undefined } : {}),
  }),
  validate: (a, state) =>
    a.params.anchor === undefined || a.params.anchor === "start" || state.items.has(a.params.anchor)
      ? ok
      : invalid({ code: "ELEMENT_NOT_FOUND", message: `anchor "${a.params.anchor}" does not exist`, path: "anchor" }),
}));

define(makePropHandler({
  type: "transform/update",
  props: ["transform"],
  write: (p, state) => ({
    transform: deepMerge((rawProp(state, p.id, "transform") ?? {}) as Record<string, Json>, p.transform),
  }),
}));

define(makePropHandler({
  type: "box/update",
  props: ["box"],
  write: (p, state) => {
    const box: Record<string, Json> = { ...((rawProp(state, p.id, "box") ?? {}) as Record<string, Json>) };
    for (const [k, v] of Object.entries(p.box)) {
      if (v === null) delete box[k];
      else box[k] = v;
    }
    return { box: Object.keys(box).length > 0 ? box : undefined };
  },
}));

define(makePropHandler({
  type: "audio/setVolume",
  props: ["volume"],
  write: (p) => ({ volume: p.volume }),
  validate: (a) =>
    a.params.volume >= 0 && a.params.volume <= 4 ? ok : invalid({ code: "OUT_OF_BOUNDS", message: "volume is 0..4" }),
}));
define(makePropHandler({
  type: "audio/setFade",
  props: ["fade"],
  write: (p, state) => {
    const prior = (rawProp(state, p.id, "fade") ?? {}) as Record<string, Json>;
    return {
      fade: { ...prior, ...(p.in !== undefined ? { in: p.in } : {}), ...(p.out !== undefined ? { out: p.out } : {}) },
    };
  },
}));
define(makePropHandler({
  type: "audio/setDuck",
  props: ["duck"],
  write: (p) => ({ duck: p.duck as Json | undefined }),
  validate: (a, state) =>
    // As in a file: the track to duck under by its id, or every track of a role.
    a.params.duck === undefined ||
    state.tracks.some((t) => t.id === a.params.duck?.under || t.role === a.params.duck?.under)
      ? ok
      : invalid({
          code: "ELEMENT_NOT_FOUND",
          message: `duck.under "${a.params.duck.under}" is neither a track id nor a track role`,
          path: "duck.under",
        }),
}));

function deepMerge(base: Record<string, Json>, patch: Readonly<Record<string, Json>>): Record<string, Json> {
  const out: Record<string, Json> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const prev = out[k];
    if (v && typeof v === "object" && !Array.isArray(v) && prev && typeof prev === "object" && !Array.isArray(prev)) {
      out[k] = deepMerge(prev as Record<string, Json>, v as Record<string, Json>);
    } else {
      out[k] = v;
    }
  }
  return out;
}
