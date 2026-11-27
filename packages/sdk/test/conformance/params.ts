// What to run each action with on a kind's sample. The conformance suite runs every action an element is offered
// (`affordances`), so an action that a kind is offered and that has no entry here fails the suite: add one.
import type { ActionInput, ActionType } from "@uberscene/sdk";

import { SAMPLE as id, PEER } from "./sample";

export interface SampleAction {
  readonly input: ActionInput;
  /** Edits made first, so there is something for the action to work on: a key to move, an effect to remove. */
  readonly setup?: readonly ActionInput[];
  /** The code the action is refused with on a sample, where it cannot apply to one: it must then change nothing. */
  readonly refused?: string;
}

const path = "transform.opacity";
const keys: ActionInput = {
  type: "key/setAll",
  params: {
    id,
    path,
    keys: [
      { at: 0, value: 0 },
      { at: 1, value: 1 },
    ],
  },
};
const blur: ActionInput = { type: "effect/add", params: { id, effect: { type: "blur", radius: 4 } } };
const sepia: ActionInput = { type: "effect/add", params: { id, effect: { type: "sepia" } } };

export const SAMPLE_ACTIONS: Partial<Record<ActionType, SampleAction>> = {
  "box/update": { input: { type: "box/update", params: { id, box: { x: 400, y: 300 } } } },
  // Something stands before it once it starts later, so there is a gap to close.
  "clip/closeGapBefore": {
    input: { type: "clip/closeGapBefore", params: { id } },
    setup: [{ type: "clip/move", params: { id, place: { start: 2 } } }],
  },
  "clip/move": { input: { type: "clip/move", params: { id, place: { start: 1 } } } },
  "clip/rippleDelete": { input: { type: "clip/rippleDelete", params: { id } } },
  // An anchored element takes an offset in place of a start, and the action leaves the sample's `start` written, so
  // it is refused: an element takes an anchor where it has no start to begin with.
  "clip/setAnchor": {
    input: { type: "clip/setAnchor", params: { id, anchor: PEER, offset: 0.5 } },
    refused: "BREAKS_FILE",
  },
  "clip/setBlend": { input: { type: "clip/setBlend", params: { id, mode: "screen" } } },
  "clip/split": { input: { type: "clip/split", params: { id, at: 1, newId: `${id}_b` } } },
  "clip/trim": { input: { type: "clip/trim", params: { id, edge: "out", value: 2 } } },
  "clip/trimToPlayhead": { input: { type: "clip/trimToPlayhead", params: { id, at: 1, edge: "out" } } },
  "effect/add": { input: blur },
  "effect/remove": { input: { type: "effect/remove", params: { id, index: 0 } }, setup: [blur] },
  "effect/setOrder": { input: { type: "effect/setOrder", params: { id, order: [1, 0] } }, setup: [blur, sepia] },
  "effect/setStack": { input: { type: "effect/setStack", params: { id, effects: [{ type: "blur", radius: 2 }] } } },
  "effect/toggle": { input: { type: "effect/toggle", params: { id, index: 0, enabled: false } }, setup: [blur] },
  "effect/update": {
    input: { type: "effect/update", params: { id, index: 0, params: { radius: 9 } } },
    setup: [blur],
  },
  "element/remove": { input: { type: "element/remove", params: { id } } },
  "element/update": { input: { type: "element/update", params: { id, props: { duration: 2 } } } },
  "generator/set": {
    input: {
      type: "generator/set",
      params: { id, path: "transform.rotation", generator: { type: "wiggle", amount: 2 } },
    },
  },
  "key/add": { input: { type: "key/add", params: { id, path, at: 0.5, value: 0.5 } } },
  "key/move": { input: { type: "key/move", params: { id, path, at: 1, to: 1.5 } }, setup: [keys] },
  "key/remove": { input: { type: "key/remove", params: { id, path, at: 1 } }, setup: [keys] },
  "key/setAll": { input: keys },
  "key/update": { input: { type: "key/update", params: { id, path, at: 1, value: 0.5 } }, setup: [keys] },
  "mask/create": {
    input: {
      type: "mask/create",
      params: { id: `${id}-mask`, parentId: id, props: { shape: { ellipse: { cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.3 } } } },
    },
  },
  "source/setProp": { input: { type: "source/setProp", params: { id, prop: "duration", value: 2 } } },
  "source/setProps": { input: { type: "source/setProps", params: { id, props: { duration: 2 } } } },
  "text/setContent": { input: { type: "text/setContent", params: { id, text: "Changed words" } } },
  "transform/update": { input: { type: "transform/update", params: { id, transform: { rotation: 10 } } } },
};
