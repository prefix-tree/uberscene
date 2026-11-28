// The nature film's music: punctuation, not a bed. The film's own sounds carry it; the music comes in at its few
// points of sync and leaves room between them. 120 BPM, a cycle a bar, so beat N is at N / 2 seconds; 13 bars.
//
//   bars 0–1    nothing but the fire
//   bars 1–4    a clock ticks in eighths from the first strip (beat 6), and a low pulse joins as the strips land
//   bars 4–7    the strips rotate: the clock goes to sixteenths, a line climbs a half step at a time, octaves apart
//   bar 7       everything stops a quarter beat before the merge (14.75 s), then the braam on beat 30 (15 s)
//   bars 8–10   a low pedal under the full-frame cuts
//   bars 11–12  the last low chord on the fire pit, ringing out
//
// `scripts/prepare.ts` renders it with renderStrudel and adds it on its grid. Strudel is AGPL-3.0-or-later and not part
// of UberScene; it is fetched on first use.

/** The clock: a short high sine, a tick. */
const tick = (steps: string, gain: string) =>
  `note("a6").struct("${steps}").s("sine").decay(.025).sustain(0).gain("${gain}").pan(.6)`;

const clock = tick(
  "<~ [~ ~ x x] [x x x x] [x x x x] [x*4 x*4] [x*4 x*4] [x*4 x*4] [x*4 [x x ~ ~] ~ ~] ~ ~ ~ ~ ~>",
  "<0 .18 .2 .22 .2 .24 .28 .3 0 0 0 0 0>",
);

/** The pulse: low strings in eighths on D, one voice more each bar as the strips land. */
const pulse = `stack(
  note("d2").struct("<~ ~ [x x x x x x x x] [x x x x x x x x] [x*8] [x*8] [x*8] [x*4 [x x ~ ~] ~ ~] ~ ~ ~ ~ ~>")
    .s("sawtooth").lpf("<0 0 500 700 900 1100 1400 1600 0 0 0 0 0>").decay(.18).sustain(0).gain(.32),
  note("a2").struct("<~ ~ ~ [~ x ~ x ~ x ~ x] [~ x]*4 [~ x]*4 [x*8] [x*4 [x x ~ ~] ~ ~] ~ ~ ~ ~ ~>")
    .s("sawtooth").lpf(1200).decay(.15).sustain(0).gain(.18)
)`;

/** The climb: a half step every sixteenth, an octave doubled, opening up into the silence before the merge. */
const climb = `note("<~ ~ ~ ~ [d3 eb3 e3 f3 gb3 g3 ab3 a3] [bb3 b3 c4 db4 d4 eb4 e4 f4] [gb4 g4 ab4 a4 bb4 b4 c5 db5] [d5 eb5 e5 f5 ~ ~ ~ ~] ~ ~ ~ ~ ~>")
  .add(note("[0,-12]")).s("sawtooth").lpf("<0 0 0 0 900 1600 2600 3600 0 0 0 0 0>").attack(.01).decay(.2).sustain(.3)
  .release(.05).gain("<0 0 0 0 .1 .13 .16 .18 0 0 0 0 0>")`;

/** The braam: detuned low saws and a fifth, the filter closing over four seconds, on beat 30. */
const braam = `note("[d1,d2,a2,d3]").struct("<~ ~ ~ ~ ~ ~ ~ [~ ~ x ~] ~ ~ ~ ~ ~>").s("supersaw").unison(5).spread(.4).detune(.3)
  .lpf(sine.range(300, 2400).slow(16)).attack(.02).decay(3.5).sustain(0).release(1).gain(.35).room(.4)`;

/** The pedal under the cuts, and the last chord on the fire. */
const pedal = `stack(
  note("d1").struct("<~ ~ ~ ~ ~ ~ ~ ~ x x x ~ ~>").s("sine").attack(.3).release(.4).gain(.45),
  note("[d2,a2,f3]").struct("<~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ x ~>").slow(1).s("sawtooth").lpf(700).attack(.4).release(2.5).room(.6).gain(.2)
)`;

export const SCORE = {
  code: `stack(${clock}, ${pulse}, ${climb}, ${braam}, ${pedal})`,
  cps: 0.5,
  /** 12 bars and the last chord's tail. */
  seconds: 26,
  bpm: 120,
} as const;
