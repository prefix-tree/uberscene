import { isKind, kindsWhere } from "@uberscene/kit/schema";

import type { Json } from "../../patches/types";
import { define, onElement, placeNode, rawProp, setProps, validateTarget, writtenPaths } from "../handler-kit";
import { invalid, ok, type PlacementSpec } from "../types";

/** The kinds `element/create` and `element/update` take: whatever sits on a track and is not media or a transition. */
const ELEMENT_KINDS = kindsWhere((kind) => kind.elementActions);

define({
  type: "element/create",
  validate: (a, state) => {
    // Params come in as JSON: a kind that is none, or not one this action makes, is refused here.
    if (!isKind(a.params.kind) || !ELEMENT_KINDS.includes(a.params.kind))
      return invalid({
        code: "INVALID_PARAMS",
        message: `element/create makes ${ELEMENT_KINDS.join(", ")}; a clip or an audio is added with clip/add or audio/add`,
        path: "kind",
      });
    if (state.tree.byId.has(a.params.id)) return invalid({ code: "DUPLICATE_ID", message: `"${a.params.id}" exists` });
    const track = state.tracks.find((tr) => tr.id === a.params.trackId);
    if (!track)
      return invalid({
        code: "ELEMENT_NOT_FOUND",
        message: `track "${a.params.trackId}" does not exist`,
        path: "trackId",
      });
    if (track.locked) return invalid({ code: "TRACK_LOCKED", message: "track is locked" });
    const place: PlacementSpec = a.params.place;
    if ("start" in place && track.layout !== "free")
      return invalid({ code: "UNSUPPORTED_ON_LAYOUT", message: "start needs a free track" });
    if ("after" in place && track.layout !== "sequence")
      return invalid({ code: "UNSUPPORTED_ON_LAYOUT", message: "after needs a sequence track" });
    if ("anchor" in place && place.anchor !== "start" && !state.items.has(place.anchor.replace(/\.end$/, "")))
      return invalid({ code: "ELEMENT_NOT_FOUND", message: `anchor "${place.anchor}" does not exist` });
    return ok;
  },
  apply: (a, log, ctx) =>
    placeNode(
      log,
      ctx.before,
      a.params.trackId,
      a.params.place,
      {
        id: a.params.id,
        kind: a.params.kind,
        props: { ...a.params.props, id: a.params.id },
        ...(a.params.text !== undefined ? { text: a.params.text } : {}),
        children: a.params.children ?? [],
      },
      a.params.after,
    ),
  invert: (a) => ({ type: "element/remove", params: { id: a.params.id } }),
  fold: () => [],
});

define({
  type: "element/update",
  targets: onElement({ kinds: ELEMENT_KINDS }),
  validate: (a, state) => {
    const item = state.items.get(a.params.id);
    const paths = item
      ? writtenPaths(item, a.params.props, (prop) => rawProp(state, a.params.id, prop))
      : Object.keys(a.params.props);
    const base = validateTarget(state, a.params.id, paths);
    if (!base.valid) return base;
    const kind = state.items.get(a.params.id)!.kind;
    return ELEMENT_KINDS.includes(kind)
      ? ok
      : invalid({
          code: "INVALID_PARAMS",
          message: `"${a.params.id}" is a <${kind}>; element/update sets ${ELEMENT_KINDS.join(", ")}`,
        });
  },
  apply: (a, log) => setProps(log, a.params.id, a.params.props),
  invert: (a, before) => {
    const prior: Record<string, Json | undefined> = {};
    for (const prop of Object.keys(a.params.props)) prior[prop] = rawProp(before, a.params.id, prop);
    return { type: "source/setProps", params: { id: a.params.id, props: prior } };
  },
  fold: () => [],
});
