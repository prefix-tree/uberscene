// What to run each action with on a kind's sample. The conformance suite runs every action an element is offered
// (`affordances`), so an action that a kind is offered and that has no entry here fails the suite: add one. An
// action that goes differently on one kind's sample (an inline SVG takes no file) is in `ONLY` under that kind.
import { capabilitiesOf, type MigratedKind } from "@uberscene/kit/schema";
import type { ActionInput, ActionType } from "@uberscene/sdk";

import { SAMPLE as id, PEER } from "./sample";

export interface SampleAction {
  readonly input: ActionInput;
  /** Edits made first, so there is something for the action to work on: a key to move, an effect to remove. */
  readonly setup?: readonly ActionInput[];
  /** The code the action is refused with on a sample, where it cannot apply to one: it must then change nothing. */
  readonly refused?: string;
}

/** What of a kind's sample the params depend on. */
export interface SampleOf {
  readonly kind: MigratedKind;
  /** The effects the sample writes: one the suite adds stands after them. */
  readonly effects: readonly string[];
}

type Actions = Partial<Record<ActionType, SampleAction>>;

/** The params for every action, on a sample of `kind`. */
export function sampleActions({ kind, effects }: SampleOf): Actions {
  // A value that keys go on: an element's own opacity, or, for one with no transform, a param of its first effect.
  const { transformable: own, audio } = capabilitiesOf(kind);
  // A sound with no picture keys its level.
  const path = own ? "transform.opacity" : audio ? "volume" : "effects.0.amount";
  const wiggled = own ? "transform.rotation" : audio ? "volume" : "effects.0.amount";
  // The effect the suite adds is the last one.
  const index = effects.length;
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
  // Not an effect a sample writes itself, so a changed order shows.
  const invert: ActionInput = { type: "effect/add", params: { id, effect: { type: "invert" } } };

  const all: Actions = {
    "audio/setDuck": { input: { type: "audio/setDuck", params: { id, duck: { under: "samples", to: 0.3 } } } },
    "audio/setFade": { input: { type: "audio/setFade", params: { id, in: 0.5, out: 0.5 } } },
    "audio/setVolume": { input: { type: "audio/setVolume", params: { id, volume: 0.5 } } },
    "clip/setFit": { input: { type: "clip/setFit", params: { id, value: "cover" } } },
    "clip/setReverse": { input: { type: "clip/setReverse", params: { id, value: true } } },
    "clip/setSpeed": { input: { type: "clip/setSpeed", params: { id, speed: 2 } } },
    "clip/slip": { input: { type: "clip/slip", params: { id, delta: 0.5 } } },
    "freeze/setAll": {
      input: { type: "freeze/setAll", params: { id, freezes: [{ start: 0.5, duration: 0.5, source: 0.5 }] } },
    },
    "nested/extract": { input: { type: "nested/extract", params: { id } } },
    "box/update": { input: { type: "box/update", params: { id, box: { x: 400, y: 300 } } } },
    // Something stands before it once it starts later, so there is a gap to close.
    "clip/closeGapBefore": {
      input: { type: "clip/closeGapBefore", params: { id } },
      setup: [{ type: "clip/move", params: { id, place: { start: 2 } } }],
    },
    "clip/move": { input: { type: "clip/move", params: { id, place: { start: 1 } } } },
    "clip/rippleDelete": { input: { type: "clip/rippleDelete", params: { id } } },
    "clip/setAnchor": { input: { type: "clip/setAnchor", params: { id, anchor: PEER, offset: 0.5 } } },
    "clip/setSource": { input: { type: "clip/setSource", params: { id, src: "asset:other" } } },
    "clip/setBlend": { input: { type: "clip/setBlend", params: { id, mode: "screen" } } },
    "clip/split": { input: { type: "clip/split", params: { id, at: 1, newId: `${id}_b` } } },
    "clip/trim": { input: { type: "clip/trim", params: { id, edge: "out", value: 2 } } },
    "clip/trimToPlayhead": { input: { type: "clip/trimToPlayhead", params: { id, at: 1, edge: "out" } } },
    "effect/add": { input: blur },
    "effect/remove": { input: { type: "effect/remove", params: { id, index } }, setup: [blur] },
    // Every effect once, in the other order.
    "effect/setOrder": {
      input: { type: "effect/setOrder", params: { id, order: [...Array(index + 2).keys()].reverse() } },
      setup: [blur, invert],
    },
    "effect/setStack": { input: { type: "effect/setStack", params: { id, effects: [{ type: "blur", radius: 2 }] } } },
    "effect/toggle": { input: { type: "effect/toggle", params: { id, index, enabled: false } }, setup: [blur] },
    "effect/update": {
      input: { type: "effect/update", params: { id, index, params: { radius: 9 } } },
      setup: [blur],
    },
    "element/remove": { input: { type: "element/remove", params: { id } } },
    "element/update": { input: { type: "element/update", params: { id, props: { duration: 2 } } } },
    "generator/set": {
      input: {
        type: "generator/set",
        params: { id, path: wiggled, generator: { type: "wiggle", amount: own ? 2 : 0.1 } },
      },
    },
    "layer/setTiming": { input: { type: "layer/setTiming", params: { id, duration: 2 } } },
    "key/add": { input: { type: "key/add", params: { id, path, at: 0.5, value: 0.5 } } },
    "key/move": { input: { type: "key/move", params: { id, path, at: 1, to: 1.5 } }, setup: [keys] },
    "key/remove": { input: { type: "key/remove", params: { id, path, at: 1 } }, setup: [keys] },
    "key/setAll": { input: keys },
    "key/update": { input: { type: "key/update", params: { id, path, at: 1, value: 0.5 } }, setup: [keys] },
    "mask/create": {
      input: {
        type: "mask/create",
        params: {
          id: `${id}-mask`,
          parentId: id,
          props: { shape: { ellipse: { cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.3 } } },
        },
      },
    },
    "source/setProp": { input: { type: "source/setProp", params: { id, prop: "duration", value: 2 } } },
    "source/setProps": { input: { type: "source/setProps", params: { id, props: { duration: 2 } } } },
    "text/setContent": { input: { type: "text/setContent", params: { id, text: "Changed words" } } },
    "transform/update": { input: { type: "transform/update", params: { id, transform: { rotation: 10 } } } },
  };
  return { ...all, ...ONLY[kind] };
}

/** Where an action goes its own way on one kind's sample. */
const ONLY: Partial<Record<MigratedKind, Actions>> = {
  gap: {
    // In a sequence an element moves by what it follows, and its stretch is where its neighbours put it.
    "clip/move": { input: { type: "clip/move", params: { id, place: { after: "after" } } } },
    "clip/slide": { input: { type: "clip/slide", params: { id, delta: 0.25 } } },
    // It stands from 1 s to 2 s.
    "clip/trim": { input: { type: "clip/trim", params: { id, edge: "out", value: 1.5 } } },
    "clip/trimToPlayhead": { input: { type: "clip/trimToPlayhead", params: { id, at: 1.5, edge: "out" } } },
  },
  transition: {
    "clip/move": { input: { type: "clip/move", params: { id, place: { after: "after" } } }, refused: "BREAKS_FILE" },
    // It overlaps the clips by its length, before the cut: from 1.5 s to 2 s.
    "clip/trimToPlayhead": { input: { type: "clip/trimToPlayhead", params: { id, at: 1.75, edge: "out" } } },
    "transition/remove": { input: { type: "transition/remove", params: { transitionId: id } } },
    "transition/update": { input: { type: "transition/update", params: { transitionId: id, duration: 0.25 } } },
  },
  audio: {
    // A sound's length is its trim: the sample writes `out`, and a `duration` beside it would say it twice.
    "source/setProp": { input: { type: "source/setProp", params: { id, prop: "out", value: 2 } } },
    "source/setProps": { input: { type: "source/setProps", params: { id, props: { out: 2 } } } },
    // Its level and pan take keys or a link, and no generator, as the mixer reads them; the action is offered on
    // anything with a value that changes over time, and refuses these paths.
    "generator/set": {
      input: { type: "generator/set", params: { id, path: "volume", generator: { type: "wiggle", amount: 0.1 } } },
      refused: "INVALID_PARAMS",
    },
  },
  svg: {
    // The sample's drawing is written inline, and an SVG takes its markup or a file, not both.
    "clip/setSource": {
      input: { type: "clip/setSource", params: { id, src: "asset:other" } },
      refused: "BREAKS_FILE",
    },
  },
};
