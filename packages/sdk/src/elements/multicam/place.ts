// How a multicam makes its clips, as its track is placed: the `makes` hook of its entry.
import { SCHEMAS_BY_KIND } from "@uberscene/kit/schema";

import { assetIdOf } from "../../manifest/types";
import type { Maker, Makes, Pending } from "../../resolve/resolve";
import type { CollectedNode } from "../../resolve/tree";
import { T } from "../../time";

let madeClipDefaults: Readonly<Record<string, unknown>> | undefined;
/** What the clip schema fills in for a clip that writes only its source: the props a clip the resolver makes takes. */
function clipDefaults(): Readonly<Record<string, unknown>> {
  if (!madeClipDefaults) {
    const {
      id: _id,
      src: _src,
      ...rest
    } = SCHEMAS_BY_KIND.clip.parse({ id: "made", src: "asset:made" }) as Record<string, unknown>;
    madeClipDefaults = rest;
  }
  return madeClipDefaults;
}

/**
 * A multicam's clips, one for each cut, from the angle it picks: from the cut to the next, the last filling to the
 * video's end. The multicam itself spans the video.
 */
function make(m: Maker, node: CollectedNode, p: Pending): void {
  const { errors } = m;
  const track = m.track!;
  const angles = new Map<string, Record<string, unknown>>();
  const cuts: { node: CollectedNode; at: number; angle: string }[] = [];
  for (const child of node.children) {
    const cp = m.parse(child);
    if (child.kind === "angle") angles.set(child.id, cp);
    else if (child.kind === "cut" && typeof cp.at === "number")
      cuts.push({ node: child, at: cp.at, angle: String(cp.angle) });
  }
  cuts.sort((a, b) => a.at - b.at);
  const sync = Number(p.props.sync ?? 0);
  p.start = T(cuts[0]?.at ?? 0);
  cuts.forEach((cut, i) => {
    const next = cuts[i + 1];
    const angle = angles.get(cut.angle);
    if (!angle) {
      errors.push({
        code: "DANGLING_ANCHOR",
        id: cut.node.id,
        prop: "angle",
        message: `angle "${cut.angle}" is not in this multicam`,
      });
      return;
    }
    const id = `${node.id}.${cut.node.id}`;
    const inSec = Math.max(0, cut.at - sync + Number(angle.offset ?? 0));
    // What a file would write for this clip, and what the clip schema parses that to: the placement holds the
    // second, defaults and all, so it reads as any other clip; a bake writes the first.
    const written = { id, src: angle.src, in: inSec };
    const parsed = { ...written, ...clipDefaults() };
    m.written(parsed, written);
    const generated: CollectedNode = {
      id,
      kind: "clip",
      parent: node.id,
      children: [],
      editable: "generated",
      lockedProps: [],
      boundProps: {},
      props: written,
      origin: { helper: "multicam", callerId: node.id, callIndex: 0 },
    };
    const gp = m.add(generated, track.id, node.id, parsed);
    gp.start = T(cut.at);
    gp.source = { in: inSec, out: inSec, speed: 1, asset: assetIdOf(String(angle.src)) };
    if (next) {
      gp.duration = T(next.at).minus(T(cut.at));
      gp.source = { ...gp.source, out: inSec + gp.duration.toSeconds() };
    } else {
      gp.durationDep = { kind: "fill" };
    }
  });
  p.durationDep = { kind: "fill" };
}

export const makesClips: Makes = { when: "placing", make };
