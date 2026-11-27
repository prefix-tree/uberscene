// The actions that are a title's alone: its words.
import { moveRuns } from "@uberscene/kit/schema";

import { define, onElement, rawNode, validateTarget } from "../../actions/handler-kit";
import { invalid, ok } from "../../actions/types";

define({
  type: "text/setContent",
  targets: onElement({ kinds: ["title"] }),
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, []);
    if (!base.valid) return base;
    return state.items.get(a.params.id)!.kind === "title"
      ? ok
      : invalid({ code: "INVALID_PARAMS", message: "only titles have text content" });
  },
  apply: (a, log, ctx) => {
    const was = rawNode(ctx.before, a.params.id);
    const runs = a.params.runs ?? moveRuns(was?.text ?? "", was?.runs ?? [], a.params.text);
    log.append({ op: "text", id: a.params.id, text: a.params.text, runs });
  },
  invert: (a, before) => {
    const was = rawNode(before, a.params.id);
    return {
      type: "text/setContent",
      params: { id: a.params.id, text: was?.text ?? "", runs: (was?.runs ?? []).map((r) => ({ ...r })) },
    };
  },
  fold: () => [],
});
