// The actions that are a layer's alone: the handles of the component inside it, and its timing.
import { define, makePropHandler, rawNode, rawProp } from "../../actions/handler-kit";
import { invalid, ok } from "../../actions/types";
import { INTERIOR_PREFIX } from "../../resolve/tree";

/** The handles of a Layer: the literal or schema-bound props of the one component inside it. */
define(makePropHandler({
  type: "layer/setProps",
  kinds: ["layer"],
  targets: { when: (item, state) => rawNode(state, item.id)?.interior !== undefined },
  write: (p) => Object.fromEntries(Object.entries(p.props).map(([k, v]) => [`${INTERIOR_PREFIX}${k}`, v])),
  validate: (a, state) =>
    rawNode(state, a.params.id)?.interior
      ? ok
      : invalid({
          code: "INVALID_PARAMS",
          message: `"${a.params.id}" has no handles: a Layer gets them from the one component inside it`,
        }),
}));

define(makePropHandler({
  type: "layer/setTiming",
  kinds: ["layer"],
  write: (p, state) => ({
    ...("duration" in p ? { duration: p.duration } : {}),
    ...("anchor" in p ? { anchor: p.anchor } : {}),
    ...("offset" in p ? { offset: p.offset } : {}),
    ...("start" in p ? { start: p.start } : {}),
    ...("anchor" in p && p.anchor !== rawProp(state, p.id, "anchor") ? { at: undefined } : {}),
  }),
}));
