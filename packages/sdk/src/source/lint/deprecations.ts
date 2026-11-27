import {
  BLEND_MODES,
  CAPTION_ANIMATIONS,
  EASINGS,
  ENTRANCE_ANIMATIONS,
  RENAMED_EFFECT_PARAMS,
  RENAMED_TRANSITION_PARAMS,
} from "@uberscene/kit/schema";

import { SDK_ELEMENTS } from "../../elements";
import { type Deprecation, oldOf, rename, respelled } from "./deprecation";

export type { Deprecation };

const OLD_BLENDS = oldOf(BLEND_MODES);
const OLD_EASINGS = oldOf(EASINGS);
const OLD_ENTRANCES = oldOf(ENTRANCE_ANIMATIONS);
const OLD_CAPTION_ANIMATIONS = oldOf(CAPTION_ANIMATIONS);

/** The diagram parts, which take a `When`: `start` (the `at` before 0.6), `after`, `over` and `easing`. */
const DIAGRAM_PARTS = ["DrawnLine", "Label", "CountUp"] as const;

/** One naming rule (0.6): a kind is `type`, a line's thickness `thickness`, a start `start`, enum values camelCase. */
const NAMING: readonly Deprecation[] = [
  rename("Captions", "style.stroke.width", "thickness"),
  rename("LowerThird", "variant", "type"),
  rename("Composition", "background.mode", "type"),
  rename("Svg", "color.mode", "type"),
  rename("Marker", "at", "start"),
  ...DIAGRAM_PARTS.map((part) => rename(part, "at", "start")),
  rename("Label", "lineWidth", "lineThickness"),
  rename("HundredCells", "fill.at", "start"),
  rename("HundredCells", "next.at", "start"),
  // Seconds since the layer started, which is what `after` means everywhere else.
  rename("BarRace", "start", "after"),
  rename("QuoteBuild", "start", "after"),
  ...Object.entries(RENAMED_EFFECT_PARAMS).flatMap(([type, params]) =>
    Object.entries(params).flatMap(([from, to]) => [
      rename("Effect", `params.${from}`, to, { type }),
      // A keyframe of the param names it in its own `param`.
      {
        element: "Keyframe",
        prop: "param",
        to: { value: { from, to } },
        since: "0.6.0",
        when: { type, in: "Effect" },
      } satisfies Deprecation,
    ]),
  ),
  ...respelled("*", ["blend"], OLD_BLENDS),
  ...respelled("*", ["enter.type", "exit.type"], OLD_ENTRANCES),
  ...respelled("*", ["enter.easing", "exit.easing", "easing"], OLD_EASINGS),
  ...DIAGRAM_PARTS.flatMap((part) => respelled(part, ["easing"], OLD_EASINGS)),
  ...respelled("Composition", ["theme.motion.enter.type", "theme.motion.exit.type"], OLD_ENTRANCES),
  ...respelled("Composition", ["theme.motion.enter.easing", "theme.motion.exit.easing"], OLD_EASINGS),
  ...respelled("Captions", ["animation"], OLD_CAPTION_ANIMATIONS),
  ...Object.entries(RENAMED_TRANSITION_PARAMS).flatMap(([type, params]) =>
    Object.entries(params).map(([from, to]) => rename("Transition", `params.${from}`, to, { type })),
  ),
  ...respelled("Transition", ["params.curve"], OLD_EASINGS, { type: "crossfade" }),
];

/** Every respelling the kit knows how to move a file across. */
export const DEPRECATIONS: readonly Deprecation[] = [
  // A kind with a folder of its own says its old spellings there.
  ...Object.values(SDK_ELEMENTS).flatMap((element) => element.deprecations ?? []),
  { element: "Captions", prop: "align", to: { into: "style", wrap: "preset" }, since: "0.6.0" },
  ...NAMING,
];
