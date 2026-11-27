// The liftoff film's music, as a Strudel score. One chord progression and one melody run through the whole film; each
// era plays them on the instruments of its time, so the music gets newer with the rockets:
//
//   bars 1–4    countdown  a low drone opening up, a tick on every beat, mission-control beeps from ten (beat 6) to
//                          one (beat 15), and a swell of noise into ignition
//   bars 5–8    1969       the ignition hit on beat 16, the engines' rumble, warm triangle chords with a tape wobble,
//                          a half-time beat
//   bars 9–12   the 80s    a hit for Atlantis's engines on beat 32, square-wave arpeggios through an echo, saw bass on
//                          the eighths, a big-room snare, a riser cut a sixteenth before the drop
//   bars 13–18  now        the drop on beat 48: supersaw chords pumping on the eighths, sub bass, sixteenth hats, the
//                          beep grown into a lead melody
//   bars 19–20  the end    a crash on the catch (beat 72), the first chord and the drone ringing out, the beeps again
//
// A cycle is a bar: 4 beats at 120 BPM is 0.5 cycles a second, so beat N is at N / 2 seconds, the grid the film cuts
// on. `scripts/music.ts` renders it with @uberscene/render's `renderStrudel` (Strudel is fetched on first use: it is
// AGPL-3.0-or-later and not part of UberScene) and adds the WAV with that grid. Synth voices only: no sample banks.

/** D minor, a chord a bar: Dm, B♭, F, C. */
const CHORDS = `"<[d3,f3,a3] [bb2,d3,f3] [f3,a3,c4] [c3,e3,g3]>"`;
const ROOTS = `"<d2 bb1 f2 c2>"`;
/** The countdown's beep, grown into a melody for the drop. */
const MOTIF = `"<[d5 ~ a4 ~ f5 ~ e5 d5] [d5 ~ f5 ~ bb4 ~ a4 ~] [c5 ~ f5 ~ a5 ~ g5 f5] [e5 ~ g5 ~ c5 ~ e5 ~]>"`;

/** A kick: a sine on D, its pitch falling three octaves in 40 ms. */
const kick = (steps: string, gain = 1): string =>
  `note("${steps}").s("sine").penv(36).pdecay(.04).decay(.32).sustain(0).gain(${gain})`;
/** A snare: a burst of high noise and a short triangle body, in a room. */
const snare = (steps: string, room: number, gain = 1): string =>
  `stack(s("white").struct("${steps}").hpf(1800).decay(.12).sustain(0).gain(${0.5 * gain}),
         note("g3").struct("${steps}").s("triangle").decay(.07).sustain(0).gain(${0.45 * gain})).room(${room})`;
const hats = (steps: string, gain: number): string =>
  `s("white").struct("${steps}").hpf(9000).decay(.025).sustain(0).gain(${gain}).pan(.62)`;
/** A hit on the first bar of a section: a sub drop and a crash. */
const hit = (sub: number, crash: number, first = "<1 0 0 0>"): string =>
  `stack(note("d1").s("sine").penv(24).pdecay(.3).decay(2.5).sustain(0).gain(${sub}),
         s("white").hpf(5000).decay(.9).sustain(0).room(.4).gain(${crash})).mask("${first}")`;

const countdown = `stack(
  note("[d1,d2]").s("sawtooth").lpf("<280 420 650 1000>").attack(.05).release(.1).gain(.22),
  s("white*4").hpf(5000).decay(.012).sustain(0).gain("[.45 .3 .3 .3]"),
  note("<[~ ~ ~ ~] [~ ~ a5 a5] [a5 a5 a5 a5] [a5 a5 a5 d6]>").s("sine").attack(.003).decay(.13).sustain(0).gain(.3).room(.3),
  s("pink").mask("<0 0 0 1>").attack(1.8).release(.02).lpf(2500).gain(.25)
)`;

const apollo = `stack(
  ${hit(1, 0.22)},
  s("brown").mask("<1 0 0 0>").decay(2).sustain(0).lpf(1200).gain(4).room(.3),
  s("brown").attack(.2).release(.3).lpf(200).gain("<3 2.2 1.6 1.2>"),
  note(${CHORDS}).s("triangle").vib(5).vibmod(.12).lpf(1100).attack(.25).release(.6).room(.7).gain(.14),
  note(${CHORDS}).add(note(-12)).s("sawtooth").lpf(600).attack(.3).release(.6).gain(.12),
  note(${ROOTS}).s("triangle").lpf(400).gain(.55),
  ${kick("d1 ~ [~ d1] ~")},
  ${snare("~ ~ x ~", 0.6, 0.8)},
  ${hats("[~ x]*4", 0.1)}
)`;

const shuttle = `stack(
  ${hit(0.7, 0.2)},
  ${kick("<[d1*4] [d1*4] [d1*4] [d1 d1 d1 ~]>")},
  ${snare("~ x ~ x", 0.9)},
  ${hats("[~ x]*4", 0.14)},
  note("<[d4 f4 a4 f4]*4 [bb3 d4 f4 d4]*4 [f4 a4 c5 a4]*4 [c4 e4 g4 e4]*4>").s("square")
    .lpf("<1200 1700 2300 3200>").decay(.12).sustain(0).delay(.3).delaytime(.375).delayfeedback(.3).gain(.2),
  note(${ROOTS}).struct("x*8").s("sawtooth").lpf(520).decay(.18).sustain(0).gain(.38),
  note(${CHORDS}).s("square").lpf(900).attack(.05).release(.3).room(.5).gain(.1),
  s("white").struct("<~ ~ ~ [x@15 ~]>").attack(1.8).release(.005).hpf(600).gain(.45),
  s("white").struct("<~ ~ ~ [~ ~ x*4 [x*6 ~]]>").hpf(1500).decay(.08).sustain(0).gain(.3)
)`;

const now = `stack(
  ${hit(1.2, 0.25, "<1 0 0 0 0 0>")},
  ${kick("d1*4")},
  ${snare("~ x ~ x", 0.35)},
  ${hats("x*16", 0.1)}.gain("[.08 .05 .14 .05]*4"),
  s("white").struct("[~ x]*4").hpf(7000).decay(.12).sustain(0).gain(.1),
  note(${CHORDS}).struct("x*8").s("supersaw").unison(7).spread(.8).detune(.25)
    .lpf(3600).decay(.22).sustain(.35).release(.1).gain("[.2 .5]*4"),
  note("<d1 bb0 f1 c1>").struct("[~ x]*4").s("sine").decay(.3).sustain(0).gain(1),
  note(${ROOTS}).struct("x*8").s("sawtooth").lpf(700).decay(.15).sustain(0).gain(.3),
  note(${MOTIF}).s("sawtooth").lpf(2800).decay(.2).sustain(.2).release(.1)
    .delay(.3).delaytime(.375).delayfeedback(.35).room(.3).gain(.34)
)`;

const end = `stack(
  ${hit(1, 0.25, "<1 0>")},
  ${kick("<[d1 ~ ~ ~] ~>")},
  note("[d3,f3,a3,d4]").slow(2).s("supersaw").unison(5).spread(.6).lpf(1500).attack(.05).release(3).room(.8).gain(.3),
  note("[d1,d2]").slow(2).s("sawtooth").lpf(300).release(3).gain(.22),
  note("<[a5 ~ ~ ~] [d6 ~ ~ ~]>").s("sine").decay(.6).sustain(0).room(.8).gain(.25)
)`;

export const SCORE = {
  code: `arrange([4, ${countdown}], [4, ${apollo}], [4, ${shuttle}], [6, ${now}], [2, ${end}], [2, silence])`,
  cps: 0.5,
  /** 20 bars and the last chord's tail. */
  seconds: 43,
  bpm: 120,
} as const;
