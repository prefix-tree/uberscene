// The nature film's music: dark synth-pop techno in D minor, 120 BPM, a cycle a bar, so beat N is at N / 2 seconds. A
// driving sixteenth bass on the root and its octave, four on the floor, a minor pad (Dm, B♭, F, C); it follows the
// film's shape, and the film's own recorded sounds stay on top of it.
//
//   bars 0–1  beats 0–8    the collage: kick and off-beat hats, the bass behind a closed filter that opens, a riser
//                          into the squash, cut a sixteenth before the title
//   bar 2     beats 8–12   the title card: nothing but a low D, a tick for each letter of the word as it settles, a stab
//                          as it settles
//   bars 3–4  beats 12–20  the band: kick and bass back, the pad, claps from bar 4, the kick rolling into the drop
//   bars 5–6  beats 20–28  the drop on the full frame: everything, sixteenth hats, stabs
//   bar 7     beats 28–32  the fire pit: one last hit and the chord ringing out
//
// `scripts/prepare.ts` renders it with renderStrudel and adds it on its grid. Strudel is AGPL-3.0-or-later and not part
// of UberScene; it is fetched on first use. Every voice is named (`.voice`), so the breakdown can show it.

/** The kick: a sine on D, its pitch falling three octaves in 40 ms. */
const kick = (steps: string, gain = 1): string =>
  `note("${steps}").s("sine").penv(36).pdecay(.04).decay(.3).sustain(0).gain(${gain}).voice("kick")`;
/** The clap: a short burst of band-passed noise, three times close together, in a room. */
const clap = (steps: string, gain: number): string =>
  `s("white").struct("${steps}").ply(3).fast(1).bpf(1400).bpq(1.5).decay(.06).sustain(0).room(.35).gain(${gain}).voice("clap")`;
/** The hats: an open one on each off-beat, closed sixteenths from the drop. */
const openHat = (gain: number): string =>
  `s("white").struct("~ x ~ x ~ x ~ x").hpf(7000).decay(.11).sustain(0).gain(${gain}).pan(.6).voice("hats")`;
const closedHats = (gain: number): string =>
  `s("white").struct("x*16").hpf(10000).decay(.02).sustain(0).gain(perlin.range(${(gain * 0.4).toFixed(2)}, ${gain}).fast(8)).pan(.4).voice("hats")`;
/** The bass: two detuned saws in sixteenths on the bar's root, an octave up on every fourth, through a low-pass. */
const bass = (cutoff: string, gain: number): string =>
  `note("<d2 bb1 f2 c2>").struct("x*16").add(note("[0 0 12 0]*4")).s("supersaw").unison(2).detune(.15)
    .lpf(${cutoff}).lpq(6).lpenv(1.5).decay(.12).sustain(.2).release(.04).gain(${gain}).voice("bass")`;
/** The pad: the minor chords held, slow in and out, wide. */
const pad = (cutoff: number, gain: number): string =>
  `chord("<Dm Bb F C>").voicing().s("sawtooth").lpf(${cutoff}).attack(.4).release(.9).room(.7).gain(${gain}).voice("pad")`;
/** The stabs: the chord short and bright, pushed off the beat. */
const stabs = (steps: string, gain: number): string =>
  `chord("<Dm Bb F C>").voicing().add(note(12)).struct("${steps}").s("supersaw").unison(5).spread(.7).detune(.2)
    .lpf(3200).decay(.16).sustain(0).room(.4).gain(${gain}).voice("stabs")`;
/** A swell of noise over the last half bar, cut a sixteenth before the next. */
const riser = (gain: number): string =>
  `s("white").struct("[~ ~ ~ ~ ~ ~ ~ ~ x@7 ~]").attack(1).release(.005).hpf(sine.range(400, 4000).slow(.5)).gain(${gain}).voice("riser")`;
/** A hit at the top of a bar: a sub drop and a crash. */
const hit = (sub: number, crash: number): string =>
  `stack(note("d1").s("sine").penv(24).pdecay(.3).decay(2.2).sustain(0).gain(${sub}),
         s("white").hpf(5000).decay(.9).sustain(0).room(.4).gain(${crash})).struct("<x ~>").voice("hit")`;

const collage = `stack(
  ${kick("d1*4", 0.75)},
  ${openHat(0.16)}.mask("<0 1>"),
  ${bass('"<300 700>"', 0.22)},
  ${riser(0.35)}.mask("<0 1>")
).mask("<1 [1@15 0]>")`;

const title = `stack(
  note("d1").s("sine").attack(.05).release(1.2).gain(.4).struct("x ~ ~ ~").voice("low"),
  note("a6").s("sine").struct("[~ ~ ~ ~ ~ ~ ~ ~ x x x x x x x x]").decay(.02).sustain(0).gain(.12).pan(.65).voice("ticks"),
  ${stabs("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ x", 0.22)}
)`;

const band = `stack(
  ${kick("d1*4", 0.85)}.ply("<1 [1 1 1 [2 4]]>"),
  ${openHat(0.16)},
  ${bass("sine.range(500, 1800).slow(2)", 0.26)},
  ${pad(900, 0.1)},
  ${clap("~ x ~ x", 0.4)}.mask("<0 1>"),
  ${riser(0.4)}.mask("<0 1>")
)`;

const drop = `stack(
  ${hit(1.1, 0.22)},
  ${kick("d1*4")},
  ${clap("~ x ~ x", 0.45)},
  ${openHat(0.18)},
  ${closedHats(0.12)},
  ${bass("2600", 0.36)},
  ${pad(1600, 0.15)},
  ${stabs("~ ~ ~ x ~ ~ x ~ ~ ~ x ~ ~ ~ ~ ~", 0.36)}
)`;

const end = `stack(
  ${hit(1.1, 0.25)},
  ${kick("[d1 ~ ~ ~]")},
  note("[d3,f3,a3,d4]").s("supersaw").unison(5).spread(.6).lpf(1500).attack(.02).release(2.5).room(.8).gain(.26).struct("x ~ ~ ~").voice("pad"),
  note("[d1,d2]").s("sawtooth").lpf(300).release(2.5).gain(.22).struct("x ~ ~ ~").voice("low")
)`;

export const SCORE = {
  code: `arrange([2, ${collage}], [1, ${title}], [2, ${band}], [2, ${drop}], [1, ${end}], [1, silence])`,
  cps: 0.5,
  /** Eight bars and the last chord's tail. */
  seconds: 18,
  bpm: 120,
} as const;
