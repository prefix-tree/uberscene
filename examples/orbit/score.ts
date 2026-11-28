// The orbit film's music, as a Strudel score: 16 bars at 120 BPM, a cycle a bar, so beat N is at N / 2 seconds, the
// grid the film cuts on. Four sections of four bars, in A minor (Am, F, C, G, a chord a bar):
//
//   bars 1–4    intro   a slow pad and a soft low pulse on the beat, a heartbeat; the arpeggio from bar 3
//   bars 5–8    build   hats from bar 5, snares on 2 and 4 from bar 6 (beats 21, 23 … 31, the lightning), the kick
//                       from bar 7, a riser over bar 8 cut a sixteenth before the drop
//   bars 9–12   drop    the full beat, bass on the root, the pad and arpeggio brighter
//   bars 13–16  outro   the beat falls away to a kick on each downbeat; the last bar is the chord alone, ringing out
//
// `scripts/music.ts` renders it with @uberscene/render's `renderStrudel` (Strudel is fetched on first use: it is
// AGPL-3.0-or-later and not part of UberScene) and adds the WAV with that grid. Synth voices only.

const CHORDS = `"<[a3,c4,e4,g4] [f3,a3,c4,f4] [g3,c4,e4,g4] [g3,b3,d4,g4]>"`;
const ROOTS = `"<a1 f1 c2 g1>"`;
/** The chord's notes an octave up, an eighth each. */
const ARP = `"<[a4 e5 c5 g5 e5 c5 g5 e5] [f4 c5 a4 f5 c5 a4 f5 c5] [g4 e5 c5 g5 e5 c5 g5 e5] [g4 d5 b4 g5 d5 b4 g5 d5]>"`;

const kick = (steps: string, gain: string | number): string =>
  `note("${steps}").s("sine").penv(30).pdecay(.035).decay(.3).sustain(0).gain(${typeof gain === "number" ? gain : `"${gain}"`})`;
const snare = (steps: string, gain: number): string =>
  `stack(s("white").struct("${steps}").hpf(1500).decay(.1).sustain(0).gain(${0.5 * gain}),
         note("f#3").struct("${steps}").s("triangle").decay(.05).sustain(0).gain(${0.4 * gain})).room(.3)`;
const hats = (steps: string, gain: number): string =>
  `s("white").struct("${steps}").hpf(8000).decay(.02).sustain(0).gain(${gain}).pan(.6)`;
const pad = (gain: number, lpf: number): string =>
  `note(${CHORDS}).s("sawtooth").detune(.15).lpf(${lpf}).attack(.6).release(.5).room(.6).gain(${gain})`;
const arp = (gain: number): string =>
  `note(${ARP}).s("triangle").decay(.12).sustain(0).delay(.25).delaytime(.375).delayfeedback(.25).gain(${gain})`;

const intro = `stack(
  ${pad(0.12, 900)},
  ${kick("d1*4", 0.3)},
  ${arp(0.12)}.mask("<0 0 1 1>")
)`;

const build = `stack(
  ${pad(0.12, 1200)},
  ${arp(0.13)},
  ${hats("[~ x]*4", 0.12)},
  ${snare("<~ [~ x ~ x] [~ x ~ x] [~ x ~ x]>", 0.85)},
  ${kick("<~ ~ [d1*4] [d1 d1 d1 ~]>", 0.85)},
  s("white").struct("<~ ~ ~ [x@15 ~]>").attack(1.8).release(.005).lpf(4000).hpf(300).gain(.35)
)`;

const drop = `stack(
  ${pad(0.1, 2200)},
  ${arp(0.17)},
  ${kick("d1*4", 1)},
  ${snare("~ x ~ x", 1)},
  ${hats("[~ x]*4", 0.16)},
  ${hats("[~ x ~ x]*4", 0.06)},
  note(${ROOTS}).add(note(12)).struct("[x ~ x x]*4").s("sawtooth").lpf(600).decay(.2).sustain(0).gain(.4)
)`;

const outro = `stack(
  ${pad(0.13, 1000)}.mask("<1 1 1 0>"),
  note("[a3,c4,e4,g4]").s("sawtooth").detune(.15).lpf(900).attack(.6).release(2).room(.7).gain(.13).mask("<0 0 0 1>"),
  ${arp(0.1)}.mask("<1 1 1 0>"),
  ${kick("<[d1 ~ ~ ~] [d1 ~ ~ ~] [d1 ~ ~ ~] [d1 ~ ~ ~]>", "<.6 .6 .6 .9>")},
  ${hats("<[~ x]*4 [~ x]*4 ~ ~>", 0.1)}.gain("<.15 .08 0 0>")
)`;

export const SCORE = {
  code: `arrange([4, ${intro}], [4, ${build}], [4, ${drop}], [4, ${outro}], [2, silence])`,
  cps: 0.5,
  /** 16 bars and the last chord's tail. */
  seconds: 34,
  bpm: 120,
} as const;
