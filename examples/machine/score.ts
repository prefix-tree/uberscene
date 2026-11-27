// The machine's music, as a Strudel score: 16 bars at 120 BPM and a last chord, a cycle a bar, so beat N is at N / 2
// seconds. The film draws one part for each voice named here with `.voice("…")`, and moves it on that voice's notes:
//
//   bars 1–4    power up    the kick alone, then the hats (bar 2), the bass (bar 3), the snare and a riser (bar 4)
//   bars 5–8    build       the chords come on, a lamp each; the lead's pins start in bar 7; a riser into the drop
//   bars 9–12   drop        everything: the chords pumping on the eighths, sixteenth hats, a sub under the kick
//   bars 13–16  power down  the parts stop one by one: the lead, then the snare, the chords, the hats and the bass,
//                           until the kick is alone again
//   bars 17–18  the end     one last hit, the first chord ringing out
//
// `scripts/music.ts` renders it with @uberscene/render's `renderStrudel` (Strudel is fetched on first use: it is
// AGPL-3.0-or-later and not part of UberScene), adds the WAV with that grid, and writes each voice's notes to
// notes.ts for the film. Synth voices only: no sample banks.

// F minor, a chord a bar: Fm, D♭, A♭, E♭. Each section names them where it plays them, `chord("<Fm Db Ab Eb>")`, and
// its bass the roots under them, `note("<f2 db2 ab1 eb2>")`, so the chord sounding can be read (and lit) in the code.
/** The chords' names, a bar each, for the lamps' labels. */
export const CHORDS = ["Fm", "D♭", "A♭", "E♭"] as const;

/** The lead: the chord climbing in eighths to its top note. */
const LEAD = `"<[c5 f5 ab5 f5 c6 ~ ab5 ~] [db5 f5 ab5 f5 db6 ~ ab5 ~] [c5 eb5 ab5 eb5 c6 ~ bb5 ab5] [bb4 eb5 g5 eb5 bb5 ~ g5 ~]>"`;

/** The kick: a sine on F, its pitch falling three octaves in 40 ms. */
const kick = (steps: string, gain = 1): string =>
  `note("${steps}").s("sine").penv(36).pdecay(.04).decay(.32).sustain(0).gain(${gain}).voice("kick")`;
/** The snare: a burst of high noise and a short triangle body, in a room. */
const snare = (steps: string, room: number, gain = 1): string =>
  `stack(s("white").struct("${steps}").hpf(1800).decay(.12).sustain(0).gain(${0.5 * gain}),
         note("ab3").struct("${steps}").s("triangle").decay(.07).sustain(0).gain(${0.45 * gain})).room(${room}).voice("snare")`;
const hats = (steps: string, gain: string): string =>
  `s("white").struct("${steps}").hpf(9000).decay(.025).sustain(0).gain("${gain}").pan(.62).voice("hats")`;
const lead = (gain: number): string =>
  `note(${LEAD}).s("sawtooth").lpf(2600).decay(.2).sustain(.15).release(.1)
    .delay(.3).delaytime(.375).delayfeedback(.3).room(.3).gain(${gain}).voice("lead")`;
/** A hit on the first bar of a section: a sub drop and a crash. */
const hit = (sub: number, crash: number, first = "<1 0 0 0>"): string =>
  `stack(note("f1").s("sine").penv(24).pdecay(.3).decay(2.5).sustain(0).gain(${sub}),
         s("white").hpf(5000).decay(.9).sustain(0).room(.4).gain(${crash})).mask("${first}")`;
/** A swell of noise over the section's last bar, cut a sixteenth before the next. */
const RISER = `s("white").struct("<~ ~ ~ [x@15 ~]>").attack(1.8).release(.005).hpf(600).gain(.4)`;

const powerUp = `stack(
  note("[f1,f2]").s("sawtooth").lpf("<200 260 340 480>").attack(.05).release(.1).gain(.16),
  ${kick("f1*4")},
  ${hats("[~ x]*4", "[.12 .2]*2")}.mask("<0 1 1 1>"),
  note("<f2 db2 ab1 eb2>").struct("x ~ [~ x] x").s("sawtooth").lpf(520).decay(.2).sustain(0).gain(.4).voice("bass").mask("<0 0 1 1>"),
  ${snare("~ x ~ [x x]", 0.6, 0.8)}.mask("<0 0 0 1>"),
  ${RISER}
)`;

const build = `stack(
  ${hit(0.8, 0.2)},
  ${kick("<[f1*4] [f1*4] [f1*4] [f1 f1 f1 ~]>")},
  ${snare("~ x ~ x", 0.6)},
  ${hats("[~ x]*4", "[.12 .2]*2")},
  chord("<Fm Db Ab Eb>").voicing().s("triangle").vib(5).vibmod(.1).lpf(1300).attack(.05).release(.5).room(.6).gain(.16).voice("chords"),
  note("<f2 db2 ab1 eb2>").struct("x*8").s("sawtooth").lpf(520).decay(.18).sustain(0).gain(.38).voice("bass"),
  ${lead(0.26)}.mask("<0 0 1 1>"),
  ${RISER},
  s("white").struct("<~ ~ ~ [~ ~ x*4 [x*6 ~]]>").hpf(1500).decay(.08).sustain(0).gain(.3)
)`;

const drop = `stack(
  ${hit(1.2, 0.25)},
  ${kick("f1*4")},
  ${snare("~ x ~ x", 0.35)},
  ${hats("x*16", "[.16 .08 .22 .08]*4")},
  chord("<Fm Db Ab Eb>").voicing().struct("x*8").s("supersaw").unison(7).spread(.8).detune(.25)
    .lpf(3600).decay(.22).sustain(.35).release(.1).gain("[.2 .5]*4").voice("chords"),
  note("<f1 db1 ab0 eb1>").struct("[~ x]*4").s("sine").decay(.3).sustain(0).gain(1),
  note("<f2 db2 ab1 eb2>").struct("x*8").s("sawtooth").lpf(700).decay(.15).sustain(0).gain(.3).voice("bass"),
  ${lead(0.34)}
)`;

const powerDown = `stack(
  ${hit(0.8, 0.2)},
  ${kick("f1*4")},
  ${snare("~ x ~ x", 0.6)}.mask("<1 0 0 0>"),
  chord("<Fm Db Ab Eb>").voicing().s("triangle").vib(5).vibmod(.1).lpf(1300).attack(.05).release(.5).room(.6).gain(.16).voice("chords").mask("<1 1 0 0>"),
  ${hats("[~ x]*4", "[.12 .2]*2")}.mask("<1 1 1 0>"),
  note("<f2 db2 ab1 eb2>").struct("x ~ [~ x] x").s("sawtooth").lpf(520).decay(.2).sustain(0).gain(.4).voice("bass").mask("<1 1 1 0>"),
  note("[f1,f2]").s("sawtooth").lpf("<480 340 260 200>").attack(.05).release(.1).gain(.16)
)`;

const end = `stack(
  ${hit(1, 0.25, "<1 0>")},
  ${kick("<[f1 ~ ~ ~] ~>")},
  note("[f3,ab3,c4,f4]").slow(2).s("supersaw").unison(5).spread(.6).lpf(1500).attack(.05).release(3).room(.8).gain(.3),
  note("[f1,f2]").slow(2).s("sawtooth").lpf(300).release(3).gain(.2)
)`;

export const SCORE = {
  code: `arrange([4, ${powerUp}], [4, ${build}], [4, ${drop}], [4, ${powerDown}], [2, ${end}], [2, silence])`,
  cps: 0.5,
  /** 18 bars and the last chord's tail. */
  seconds: 39,
  bpm: 120,
} as const;
