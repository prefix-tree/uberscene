// The machine's music, as a Strudel score: 18 bars at 120 BPM and a last chord, a cycle a bar, so beat N is at N / 2
// seconds. The film draws one lane for each voice named here with `.voice("…")`, and drops a block for each of its
// notes. The score leans on what Strudel does in a few characters:
//
//   "x(5,8)"                        a euclidean rhythm: five hits spread as evenly as eight steps allow
//   .off(1/8, x => x.add(n(7)))     the lead answered by itself an eighth later and an octave up
//   .scale("F4:minor")              the lead written as steps of the scale, not as notes
//   .lpf(sine.range(…).slow(4))     the acid bass's filter opening and closing over four bars
//   .transpose("<0 12 …>*2")        the bass jumping an octave on some sixteenths
//   .ply("<1 1 1 [1 1 2 4]>")       the kick doubling into a roll at the end of the build
//   .degradeBy("<0 .3 .6 .9>")      notes dropping out at random, more each bar, as the machine powers down
//   .gain(perlin.range(…))          hats that are never twice the same loudness
//
//   bars 1–2    the drop    two bars of it first, so the film opens with every voice playing
//   bars 3–6    power up    the kick alone, then euclidean hats (bar 4), the bass (bar 5), the snare and a riser
//   bars 7–10   build       the chords come on, held; the lead and its echo from bar 9; the kick rolls into the drop
//   bars 11–14  drop        everything: chord stabs on a euclidean five, the acid bass on sixteenths, a sub
//   bars 15–18  power down  the lead stops, then notes fall out of every voice until the kick is alone again
//   bars 19–20  the end     one last hit, the first chord ringing out
//
// `scripts/music.ts` renders it with @uberscene/render's `renderStrudel` (Strudel is fetched on first use: it is
// AGPL-3.0-or-later and not part of UberScene), adds the WAV with that grid, and writes each voice's notes to
// notes.ts for the film. Synth voices only: no sample banks. Strudel's randomness is a function of time, so the same
// notes drop out on every render.

// F minor, a chord a bar: Fm, D♭, A♭, E♭. Each section names them where it plays them, `chord("<Fm Db Ab Eb>")`, and
// its bass the roots under them, `note("<f2 db2 ab1 eb2>")`, so the chord sounding can be read (and lit) in the code.
/** The chords' names, a bar each, for the blocks' names. */
export const CHORDS = ["Fm", "D♭", "A♭", "E♭"] as const;

/** The lead: each chord as steps of F minor, climbing twice a bar. */
const ARP = `"<[0 2 4 7]*2 [-2 0 2 5]*2 [2 4 6 9]*2 [-1 1 3 6]*2>"`;

/** The kick: a sine on F, its pitch falling three octaves in 40 ms. */
const kick = (steps: string, gain = 1): string =>
  `note("${steps}").s("sine").penv(36).pdecay(.04).decay(.32).sustain(0).gain(${gain}).voice("kick")`;
/** The snare: a burst of high noise and a short triangle body, in a room. */
const snare = (steps: string, room: number, gain = 1): string =>
  `stack(s("white").struct("${steps}").hpf(1800).decay(.12).sustain(0).gain(${0.5 * gain}),
         note("ab3").struct("${steps}").s("triangle").decay(.07).sustain(0).gain(${0.45 * gain})).room(${room}).voice("snare")`;
/** The hats: noise through a high filter, each a little louder or quieter than the last. */
const hats = (steps: string, loud: number): string =>
  `s("white").struct("${steps}").hpf(9000).decay(.025).sustain(0).gain(perlin.range(${(loud * 0.35).toFixed(2)}, ${loud}).fast(8)).pan(sine.range(.3, .7).fast(2)).voice("hats")`;
/** The acid bass: a saw through a resonant filter that opens and closes over four bars. */
const bass = (steps: string, gain: number): string =>
  `note("<f2 db2 ab1 eb2>").struct("${steps}").s("sawtooth").lpf(sine.range(350, 2200).slow(4)).lpq(12).lpenv(2).decay(.14).sustain(0).gain(${gain}).voice("bass")`;
/** The lead: an FM bell on the scale's steps, answered an eighth later and an octave up, half as loud. */
const lead = (gain: number): string =>
  `n(${ARP}).gain(${gain}).off(1/8, x => x.add(n(7)).gain(${(gain * 0.5).toFixed(2)})).scale("F4:minor")
    .s("sine").fm(3).fmh(2).decay(.22).sustain(0).delay(.25).delaytime(.375).delayfeedback(.3).room(.3).voice("lead")`;
/** A hit on the first bar of a section: a sub drop and a crash. */
const hit = (sub: number, crash: number, first = "<1 0 0 0>"): string =>
  `stack(note("f1").s("sine").penv(24).pdecay(.3).decay(2.5).sustain(0).gain(${sub}),
         s("white").hpf(5000).decay(.9).sustain(0).room(.4).gain(${crash})).mask("${first}")`;
/** A swell of noise over the section's last bar, cut a sixteenth before the next. */
const RISER = `s("white").struct("<~ ~ ~ [x@15 ~]>").attack(1.8).release(.005).hpf(600).gain(.4)`;

const powerUp = `stack(
  note("[f1,f2]").s("sawtooth").lpf("<200 260 340 480>").attack(.05).release(.1).gain(.16),
  ${kick("f1*4")},
  ${hats("x(5,8)", 0.2)}.mask("<0 1 1 1>"),
  ${bass("x(3,8)", 0.4)}.mask("<0 0 1 1>"),
  ${snare("~ x ~ [x x]", 0.6, 0.8)}.mask("<0 0 0 1>"),
  ${RISER}
)`;

const build = `stack(
  ${hit(0.8, 0.2)},
  ${kick("f1*4")}.ply("<1 1 1 [1 1 2 4]>"),
  ${snare("~ x ~ x", 0.6)},
  ${hats("x(11,16)", 0.2)},
  chord("<Fm Db Ab Eb>").voicing().s("sawtooth").lpf(perlin.range(500, 1600)).attack(.05).release(.5).room(.6).gain(.13).voice("chords"),
  ${bass("x(5,8)", 0.36)},
  ${lead(0.3)}.mask("<0 0 1 1>"),
  ${RISER}
)`;

const drop = `stack(
  ${hit(1.2, 0.25)},
  ${kick("f1*4")},
  ${snare("~ x ~ x", 0.35)},
  ${hats("x*16", 0.22)},
  chord("<Fm Db Ab Eb>").voicing().struct("x(5,8)").s("supersaw").unison(7).spread(.8).detune(.25)
    .lpf(3600).decay(.25).sustain(.3).release(.1).gain(.42).voice("chords"),
  note("<f1 db1 ab0 eb1>").struct("[~ x]*4").s("sine").decay(.3).sustain(0).gain(1),
  ${bass("x*16", 0.3)}.transpose("<0 0 12 0 0 12 0 12>*2"),
  ${lead(0.36)}
)`;

const powerDown = `stack(
  ${hit(0.8, 0.2)},
  ${kick("f1*4")},
  ${snare("~ x ~ x", 0.6)}.degradeBy("<0 .5 1 1>"),
  chord("<Fm Db Ab Eb>").voicing().s("sawtooth").lpf(perlin.range(500, 1600)).attack(.05).release(.5).room(.6).gain(.13).voice("chords").mask("<1 1 0 0>"),
  ${hats("x(11,16)", 0.2)}.degradeBy("<0 .3 .6 1>"),
  ${bass("x(5,8)", 0.4)}.degradeBy("<0 .3 .6 1>"),
  note("[f1,f2]").s("sawtooth").lpf("<480 340 260 200>").attack(.05).release(.1).gain(.16)
)`;

const end = `stack(
  ${hit(1, 0.25, "<1 0>")},
  ${kick("<[f1 ~ ~ ~] ~>")},
  note("[f3,ab3,c4,f4]").slow(2).s("supersaw").unison(5).spread(.6).lpf(1500).attack(.05).release(3).room(.8).gain(.3),
  note("[f1,f2]").slow(2).s("sawtooth").lpf(300).release(3).gain(.2)
)`;

export const SCORE = {
  code: `arrange([2, ${drop}], [4, ${powerUp}], [4, ${build}], [4, ${drop}], [4, ${powerDown}], [2, ${end}], [2, silence])`,
  cps: 0.5,
  /** 20 bars and the last chord's tail. */
  seconds: 43,
  bpm: 120,
} as const;
