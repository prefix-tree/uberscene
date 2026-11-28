// The sound kit: cues and beds made in code, so they are the project's own to share, and the same bytes on every
// machine. A cue marks a moment (a tick, a hit, a whoosh); a bed runs under a scene (wind, rain, fire). Each takes a
// length and a seed: another seed is another take of the same sound, so a film can lay many whooshes that are not all
// the same one.
import { bandPass, brown, highPass, lowPass, movingBandPass, noise, RATE, render, wander } from "./synth";

export interface SoundSpec {
  /** What it is and what it is for. */
  readonly what: string;
  /** Its length in seconds when none is asked for. */
  readonly length: number;
  /** The take when none is asked for. */
  readonly seed: number;
  /** A bed: a texture to run under a scene, at a low volume, rather than a moment. */
  readonly bed?: true;
  /** Where its moment is, as a fraction of its length: a riser's is its end, a whoosh's its loudest point. */
  readonly moment: number;
  make(o: { readonly length: number; readonly seed: number }): Float32Array;
}

/** Noise swept through a band that rises and falls, swelling to its loudest at `peakAt` (0..1 of its length). */
function sweep(len: number, from: number, to: number, peakAt: number, seed: number): Float32Array {
  const n = noise(seed);
  const band = movingBandPass();
  return render(len, (t) => {
    const p = t / len;
    const rise = Math.min(1, p / peakAt);
    const f = from * (to / from) ** Math.sin((Math.PI / 2) * rise) * (p > peakAt ? 1 - 0.4 * (p - peakAt) : 1);
    const swell = p < peakAt ? Math.sin((Math.PI / 2) * rise) ** 2 : Math.exp(-(p - peakAt) / ((1 - peakAt) * 0.35));
    return swell * band(n.white(), f, 1.4);
  });
}

/**
 * Bursts at random moments, about `perSecond` of them, each from `start(t)`, mixed by `each(t, since, burst)`. For
 * a fire's crackle, rain's drops: what happens many times, never on a grid.
 */
function scattered(seed: number, perSecond: number) {
  const dice = noise(seed + 100);
  const chance = perSecond / RATE;
  let since = Number.POSITIVE_INFINITY;
  let size = 0;
  let pitch = 0;
  return () => {
    if ((dice.white() + 1) / 2 < chance) {
      since = 0;
      size = 0.3 + 0.7 * ((dice.white() + 1) / 2) ** 2;
      pitch = (dice.white() + 1) / 2;
    }
    since += 1 / RATE;
    return { since, size, pitch };
  };
}

export const SOUND_KIT: Readonly<Record<string, SoundSpec>> = {
  tick: {
    what: "a clock's tick, bright: a count, a step, a cell lighting up",
    length: 0.03,
    seed: 1,
    moment: 0,
    make: ({ length, seed }) =>
      render(
        length,
        (t, n) => {
          const body = Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t / 0.004);
          return body + 0.35 * n.white() * Math.exp(-t / 0.0015);
        },
        seed,
      ),
  },
  click: {
    what: "a mouse click, a tap of noise with a little body: a cursor, a button, a toggle",
    length: 0.045,
    seed: 2,
    moment: 0,
    make: ({ length, seed }) => {
      const n = noise(seed);
      const band = bandPass(3200, 1.2);
      return render(length, (t) => {
        const tap = band(n.white()) * Math.exp(-t / 0.006);
        return tap + 0.4 * Math.sin(2 * Math.PI * 1100 * t) * Math.exp(-t / 0.01);
      });
    },
  },
  pop: {
    what: "a pop, a pitch that drops: something appearing, a dot, a badge, a word",
    length: 0.13,
    seed: 1,
    moment: 0,
    make: ({ length }) => {
      let phase = 0;
      return render(length, (t) => {
        const f = 300 + 700 * Math.exp(-t / 0.018);
        phase += (2 * Math.PI * f) / RATE;
        return Math.sin(phase) * Math.min(1, t / 0.002) * Math.exp(-t / 0.035);
      });
    },
  },
  whoosh: {
    what: "air that swells and passes: a scene change, a big move",
    length: 0.7,
    seed: 3,
    moment: 0.62,
    make: ({ length, seed }) => sweep(length, 300, 2200, 0.62, seed),
  },
  swish: {
    what: "a quicker, higher whoosh: a slide, a wipe, a card flicked in",
    length: 0.3,
    seed: 4,
    moment: 0.55,
    make: ({ length, seed }) => sweep(length, 1200, 5200, 0.55, seed),
  },
  riser: {
    what: "a climb to a stop, ending on the moment it builds to: place it to end there",
    length: 2,
    seed: 5,
    moment: 1,
    make: ({ length, seed }) => {
      const n = noise(seed);
      let phase = 0;
      const band = movingBandPass();
      return render(length, (t) => {
        const p = t / length;
        const f = 180 * 2 ** (p * 2.6);
        phase += (2 * Math.PI * f) / RATE;
        const air = band(n.white(), 400 * 2 ** (p * 3.5), 1.6);
        const swell = p ** 2.2 * Math.min(1, (length - t) / 0.02);
        return swell * (0.55 * Math.sin(phase) + 0.25 * Math.sin(phase * 2.01) + air);
      });
    },
  },
  thud: {
    what: "low and soft: a landing, a stamp, a number that arrives",
    length: 0.45,
    seed: 6,
    moment: 0,
    make: ({ length, seed }) => {
      const n = noise(seed);
      const low = lowPass(900);
      let phase = 0;
      return render(length, (t) => {
        const f = 52 + 70 * Math.exp(-t / 0.03);
        phase += (2 * Math.PI * f) / RATE;
        const body = Math.sin(phase) * Math.min(1, t / 0.003) * Math.exp(-t / 0.12);
        return body + 0.5 * low(n.white()) * Math.exp(-t / 0.012);
      });
    },
  },
  chime: {
    what: "a bell's partials dying away at their own rates: an ending, a result, a reveal",
    length: 1.8,
    seed: 1,
    moment: 0,
    make: ({ length }) => {
      const partials = [
        { ratio: 1, gain: 1, decay: 0.9 },
        { ratio: 2.0, gain: 0.45, decay: 0.6 },
        { ratio: 2.76, gain: 0.35, decay: 0.45 },
        { ratio: 5.4, gain: 0.18, decay: 0.25 },
        { ratio: 8.93, gain: 0.08, decay: 0.12 },
      ];
      return render(length, (t) => {
        let sum = 0;
        for (const p of partials) sum += p.gain * Math.sin(2 * Math.PI * 880 * p.ratio * t) * Math.exp(-t / p.decay);
        return sum * Math.min(1, t / 0.002);
      });
    },
  },
  hit: {
    what: "an impact: a falling sub and a crack of low noise, for a cut that lands hard",
    length: 1.2,
    seed: 7,
    moment: 0,
    make: ({ length, seed }) => {
      const n = noise(seed);
      const low = lowPass(1800);
      let phase = 0;
      return render(length, (t) => {
        const f = 38 + 90 * Math.exp(-t / 0.05);
        phase += (2 * Math.PI * f) / RATE;
        const body = Math.sin(phase) * Math.min(1, t / 0.002) * Math.exp(-t / (length * 0.35));
        return body + 0.7 * low(n.white()) * Math.exp(-t / 0.03);
      });
    },
  },
  boom: {
    what: "a deep cinematic boom with a long rumbling tail: the big moment, a reveal, a title",
    length: 3,
    seed: 8,
    moment: 0,
    make: ({ length, seed }) => {
      const n = noise(seed);
      const rumble = brown(noise(seed + 1));
      const tailLow = lowPass(250);
      const low = lowPass(600);
      let phase = 0;
      return render(length, (t) => {
        const f = 32 + 40 * Math.exp(-t / 0.12);
        phase += (2 * Math.PI * f) / RATE;
        const sub = Math.sin(phase) * Math.min(1, t / 0.004) * Math.exp(-t / (length * 0.4));
        const tail = 0.9 * tailLow(rumble()) * Math.exp(-t / (length * 0.5));
        return sub + tail + 0.6 * low(n.white()) * Math.exp(-t / 0.05);
      });
    },
  },
  downer: {
    what: "a fall away: pitch and air sinking to nothing, after a hit or out of a scene",
    length: 2,
    seed: 9,
    moment: 0,
    make: ({ length, seed }) => {
      const n = noise(seed);
      const band = movingBandPass();
      let phase = 0;
      return render(length, (t) => {
        const p = t / length;
        const f = 600 * 2 ** (-p * 2.5);
        phase += (2 * Math.PI * f) / RATE;
        const air = band(n.white(), 3000 * 2 ** (-p * 3), 1.2);
        return (1 - p) ** 1.5 * Math.min(1, t / 0.01) * (0.6 * Math.sin(phase) + air);
      });
    },
  },
  suck: {
    what: "a reversed whoosh, swelling into a cut: place it to end on the moment",
    length: 1,
    seed: 10,
    moment: 1,
    make: ({ length, seed }) => {
      const n = noise(seed);
      const band = movingBandPass();
      return render(length, (t) => {
        const p = t / length;
        return p ** 3 * band(n.white(), 300 * 10 ** p, 1.3);
      });
    },
  },
  snap: {
    what: "a dry crack: a twig, a strip snapping into place, a fast cut",
    length: 0.08,
    seed: 11,
    moment: 0,
    make: ({ length, seed }) => {
      const n = noise(seed);
      const high = highPass(2500);
      return render(length, (t) => {
        const crack = high(n.white()) * Math.exp(-t / 0.006);
        return crack + 0.5 * Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t / 0.004);
      });
    },
  },
  shimmer: {
    what: "high glassy partials that swell and fade: light, a reveal, wonder",
    length: 2,
    seed: 12,
    moment: 0.4,
    make: ({ length, seed }) => {
      const n = noise(seed);
      const parts = [1760, 2637, 3520, 5274, 7040].map((f, i) => ({
        f,
        phase: n.white() * Math.PI,
        gain: 1 / (i + 1),
      }));
      return render(length, (t) => {
        const p = t / length;
        const swell = Math.sin(Math.PI * Math.min(1, p / 0.4) * 0.5) ** 2 * Math.exp(-Math.max(0, p - 0.4) * 4);
        let sum = 0;
        for (const q of parts)
          sum +=
            q.gain * Math.sin(2 * Math.PI * q.f * t + q.phase) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 6 * t + q.phase));
        return swell * sum;
      });
    },
  },
  wind: {
    what: "wind that gusts: open country, a mountain, a sky",
    length: 8,
    seed: 20,
    bed: true,
    moment: 0,
    make: ({ length, seed }) => {
      const n = noise(seed);
      const band = movingBandPass();
      const pitch = wander(seed + 1, 0.13);
      const gust = wander(seed + 2, 0.21);
      return render(length, (t) => {
        const centre = 500 * 2 ** (1.2 * pitch(t));
        return (0.55 + 0.45 * gust(t)) * band(n.white(), centre, 0.9);
      });
    },
  },
  rain: {
    what: "steady rain with drops landing near: rain, wet leaves, a storm's start",
    length: 8,
    seed: 21,
    bed: true,
    moment: 0,
    make: ({ length, seed }) => {
      const n = noise(seed);
      const hiss = highPass(1500);
      const drops = scattered(seed, 40);
      const ping = movingBandPass();
      return render(length, (t) => {
        const d = drops();
        const drop = d.size * Math.exp(-d.since / 0.012) * ping(n.white(), 1800 + 3000 * d.pitch, 4);
        return 0.35 * hiss(n.white()) * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.2 * t)) + drop;
      });
    },
  },
  crackle: {
    what: "a fire: a low roar with crackles and the odd pop",
    length: 8,
    seed: 22,
    bed: true,
    moment: 0,
    make: ({ length, seed }) => {
      const n = noise(seed);
      const roar = brown(noise(seed + 1));
      const roarLow = lowPass(400);
      const crackHigh = highPass(2000);
      const crackles = scattered(seed, 22);
      const pops = scattered(seed + 50, 1.5);
      const popBand = movingBandPass();
      const flicker = wander(seed + 2, 0.8);
      return render(length, (t) => {
        const c = crackles();
        const p = pops();
        const crack = c.size * Math.exp(-c.since / (0.002 + 0.006 * c.pitch)) * crackHigh(n.white());
        const pop = p.size * Math.exp(-p.since / 0.03) * popBand(n.white(), 300 + 500 * p.pitch, 3);
        return 0.5 * roarLow(roar()) * (0.8 + 0.2 * flicker(t)) + 0.8 * crack + 1.2 * pop;
      });
    },
  },
  water: {
    what: "running water, a stream or a waterfall's near side: bubbling in several bands",
    length: 8,
    seed: 23,
    bed: true,
    moment: 0,
    make: ({ length, seed }) => {
      const n = noise(seed);
      const bands = [400, 900, 2000].map((centre, i) => ({
        centre,
        band: movingBandPass(),
        move: wander(seed + 10 + i, 3 + 1.5 * i),
      }));
      const spray = highPass(4000);
      return render(length, (t) => {
        let sum = 0;
        for (const b of bands) sum += b.band(n.white(), b.centre * 2 ** (0.5 * b.move(t)), 2.5);
        return sum + 0.25 * spray(n.white());
      });
    },
  },
  rumble: {
    what: "a low rumble that swells: distant thunder, a storm, the ground",
    length: 8,
    seed: 24,
    bed: true,
    moment: 0,
    make: ({ length, seed }) => {
      const deep = brown(noise(seed));
      const low = lowPass(200);
      const swell = wander(seed + 1, 0.09);
      return render(length, (t) => (0.6 + 0.4 * swell(t)) * low(deep()));
    },
  },
  air: {
    what: "room tone, the quiet of a place: under silence, so it is never dead",
    length: 8,
    seed: 25,
    bed: true,
    moment: 0,
    make: ({ length, seed }) => {
      const n = noise(seed);
      const soft = lowPass(900);
      const softer = lowPass(900);
      const deep = brown(noise(seed + 1));
      return render(length, () => 0.6 * softer(soft(n.white())) + 0.3 * deep());
    },
  },
};

/** Makes a sound of the kit: its own length and take unless others are asked for. */
export function makeSound(name: string, options: { length?: number; seed?: number } = {}): Float32Array {
  const spec = SOUND_KIT[name];
  if (!spec) throw new Error(`no sound "${name}" in the kit; there are ${Object.keys(SOUND_KIT).join(", ")}`);
  const length = options.length ?? spec.length;
  if (!(length > 0 && length <= 120)) throw new Error(`a sound is between 0 and 120 seconds long, got ${length}`);
  return spec.make({ length, seed: options.seed ?? spec.seed });
}
