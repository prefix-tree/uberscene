// What an `<Adjustment>` paints on the canvas: its effects over everything painted beneath it.
import { secondsSinceStart } from "@uberscene/sdk/resolver";

import { blendOf } from "../../model/blend";
import { postEffects } from "../../model/effects";
import { effectPipeline } from "../../model/shaders";
import { frameIndex } from "../../model/time";
import type { CanvasOpsOf } from "../element";

/** With nothing beneath, or switched off, it paints nothing. */
export const adjustmentOps: CanvasOpsOf<"adjustment"> = ({ state, t, ops }, item) => {
  const p = item.placement;
  const comp = state.composition;
  if (!p.props.enabled) return [];
  const { shaders, ...filters } = effectPipeline(state, item.children, p.id, secondsSinceStart(p, t), {
    shaders: true,
  });
  if (ops.length === 0) return [];
  // Vignette and grain darken and speckle everything beneath, before the adjustment's other effects.
  const post = postEffects(state.items, item.children, frameIndex(t, comp.rate), secondsSinceStart(p, t));
  return [
    {
      id: p.id,
      kind: "adjustment",
      rect: { x: 0, y: 0, w: comp.width, h: comp.height },
      matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      fit: "stretch",
      opacity: p.props.opacity,
      blend: blendOf(p.props.blend),
      ...filters,
      borderRadius: 0,
      ...(post ? { post } : {}),
      ...(shaders ? { shaders } : {}),
    },
  ];
};
