// What a `<Nested>` paints on the canvas: its own composition, resolved and drawn at its source time.
import { nestedSourceTime } from "../../model/time";
import { layoutRect } from "../../model/transform";
import { footageOps } from "../footage/canvas";

export const nestedOps = footageOps<"nested">(({ ctx, item, common, transform, box, shift }) => {
  const { state, resolveNested, warnings } = ctx;
  const comp = state.composition;
  const p = item.placement;
  const nested = resolveNested?.(p) ?? null;
  if (!nested) {
    warnings.push(`nested ${p.id}: no resolver`);
    const layout = layoutRect(comp, comp, common.fit, transform, box);
    return { ...common, kind: "error", rect: layout.rect, matrix: shift(layout.matrix) };
  }
  const layout = layoutRect(comp, nested.composition, common.fit, transform, box);
  return {
    ...common,
    kind: "nested",
    nested: { state: nested, time: nestedSourceTime(p, ctx.t) },
    rect: layout.rect,
    matrix: shift(layout.matrix),
    ...(layout.crop ? { crop: layout.crop } : {}),
  };
});
