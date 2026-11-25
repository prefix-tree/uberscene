// A camera is a parent of the tracks it moves, so putting one in and taking it out are moves of tracks: they keep
// their place in the file, and with it what draws over what.

import type { Json } from "../../patches/types";
import type { ResolvedState } from "../../resolve/resolve";
import { define, insertNode, makePropHandler, rawNode, siblingAfter } from "../handler-kit";
import { type ActionInput, invalid, ok, type ValidationResult } from "../types";

const FIELDS = ["x", "y", "zoom", "rotation"] as const;

/** The composition's tracks in file order, without those inside a camera. */
function topTracks(state: ResolvedState): string[] {
  return state.tree.root.children.filter((c) => c.kind === "track").map((c) => c.id);
}

function checkTracks(state: ResolvedState, tracks: readonly string[]): ValidationResult {
  if (tracks.length === 0) return invalid({ code: "INVALID_PARAMS", message: "name the tracks the camera moves" });
  const top = topTracks(state);
  for (const id of tracks) {
    const node = rawNode(state, id);
    if (node?.kind !== "track")
      return invalid({ code: "ELEMENT_NOT_FOUND", message: `track "${id}" does not exist`, path: "tracks" });
    if (node.implicit)
      return invalid({
        code: "INVALID_PARAMS",
        message: `the clips written straight in the composition have no <Track> to move: write them inside <Track id="${id}"> first`,
        path: "tracks",
      });
    if (!top.includes(id))
      return invalid({ code: "INVALID_PARAMS", message: `track "${id}" is already in a camera`, path: "tracks" });
  }
  const places = tracks.map((id) => top.indexOf(id)).sort((a, b) => a - b);
  if (new Set(places).size !== places.length || (places.at(-1) as number) - (places[0] as number) !== places.length - 1)
    return invalid({
      code: "INVALID_PARAMS",
      message:
        "a camera holds tracks that are next to each other in the file: a track between them would change places with the ones around it",
      path: "tracks",
    });
  return ok;
}

define({
  type: "camera/add",
  validate: (a, state) => {
    if (state.tree.byId.has(a.params.cameraId))
      return invalid({ code: "DUPLICATE_ID", message: `"${a.params.cameraId}" exists` });
    const existing = state.tree.root.children.find((c) => c.kind === "camera");
    if (existing)
      return invalid({
        code: "INVALID_PARAMS",
        message: `the composition has a camera, "${existing.id}": move tracks into it with track/reorder`,
      });
    return checkTracks(state, a.params.tracks);
  },
  apply: (a, log, ctx) => {
    const top = topTracks(ctx.before);
    const tracks = [...a.params.tracks].sort((p, q) => top.indexOf(p) - top.indexOf(q));
    const props: Record<string, Json> = { id: a.params.cameraId };
    for (const f of FIELDS) {
      const v = a.params[f];
      if (v !== undefined) props[f] = v as Json;
    }
    // The camera stands where its lowest track stood, and the tracks go inside in the order they had.
    insertNode(log, ctx.before.tree.root.id, siblingAfter(ctx.before, tracks[0] as string), {
      id: a.params.cameraId,
      kind: "camera",
      props,
      children: [],
    });
    let after: string | null = null;
    for (const id of tracks) {
      log.append({ op: "move", id, parent: a.params.cameraId, after });
      after = id;
    }
  },
  invert: (a) => ({ type: "camera/remove", params: { cameraId: a.params.cameraId } }),
  fold: () => [],
});

define({
  type: "camera/remove",
  validate: (a, state) =>
    rawNode(state, a.params.cameraId)?.kind === "camera"
      ? ok
      : invalid({ code: "ELEMENT_NOT_FOUND", message: `camera "${a.params.cameraId}" does not exist` }),
  apply: (a, log, ctx) => {
    const camera = rawNode(ctx.before, a.params.cameraId)!;
    // Its tracks take its place, in their order, and stay where they were in the stack.
    let after = siblingAfter(ctx.before, camera.id);
    for (const track of camera.children) {
      if (track.kind !== "track") continue;
      log.append({ op: "move", id: track.id, parent: ctx.before.tree.root.id, after });
      after = track.id;
    }
    log.append({ op: "remove", id: camera.id });
  },
  invert: (a, before): ActionInput => {
    const camera = rawNode(before, a.params.cameraId)!;
    const values = Object.fromEntries(
      FIELDS.flatMap((f) => (camera.props[f] === undefined ? [] : [[f, camera.props[f]]])),
    );
    return {
      type: "camera/add",
      params: {
        cameraId: camera.id,
        tracks: camera.children.filter((c) => c.kind === "track").map((c) => c.id),
        ...values,
      },
    };
  },
  fold: () => [],
});

define(makePropHandler({
  type: "camera/update",
  target: (p) => p.cameraId,
  kinds: ["camera"],
  write: (p) => Object.fromEntries(FIELDS.flatMap((f) => (p[f] === undefined ? [] : [[f, p[f] as Json]]))),
}));
