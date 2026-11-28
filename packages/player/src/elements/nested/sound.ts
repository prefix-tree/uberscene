// How a `<Nested>` is heard: its own tracks' sound, through its stretch of the outer timeline, under its own gain.
import { endSeconds, secondsSinceStart, startSeconds } from "@uberscene/sdk/resolver";

import {
  type AudioOccurrence,
  buildAudioPlan,
  buildGainEnvelope,
  multiplyEnvelopes,
  round,
} from "../../model/audio-plan";
import type { Sound, SoundInput } from "../element";

function occurrences({ state, placement: p, track, from, to, resolveNested }: SoundInput<"nested">): AudioOccurrence[] {
  const inner = resolveNested?.(p);
  const src = p.source;
  if (!inner || !src) return [];
  // shortcut: a nested placement plays at its constant speed, its own speed keys and freezes are ignored; map through rampInverse/freezeShift if nested ramps are wanted.
  const toInner = (t: number): number => src.in + secondsSinceStart(p, t) * src.speed;
  const toOuter = (t: number): number => startSeconds(p) + (t - src.in) / src.speed;
  const outerEnvelope = buildGainEnvelope(p, track, state, startSeconds(p), endSeconds(p));
  return buildAudioPlan(
    inner,
    toInner(Math.max(from, startSeconds(p))),
    toInner(Math.min(to, endSeconds(p))),
    resolveNested,
  )
    .map((o) => {
      const compStart = Math.max(startSeconds(p), toOuter(o.compStart));
      const compEnd = Math.min(endSeconds(p), toOuter(o.compEnd));
      const inner = o.gain.map(([t, v]) => [toOuter(t), v] as const);
      return {
        ...o,
        id: `${p.id}/${o.id}`,
        compStart,
        compEnd,
        speed: o.speed * src.speed,
        ...(o.rate ? { rate: o.rate.map(([t, v]) => [round(toOuter(t)), v * src.speed] as const) } : {}),
        gain: multiplyEnvelopes([inner, outerEnvelope], compStart, compEnd),
      };
    })
    .filter((o) => o.compEnd > o.compStart);
}

export const nestedSound: Sound<"nested"> = {
  occurrences,
  // What its own tracks hold is not looked into: a nested sequence is taken to make a sound.
  heard: () => true,
};
