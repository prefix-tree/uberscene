import { Audio, Clip, Composition, googleFont, Title, Track } from "@uberscene/kit";

import { LIGHTNING } from "./lightning";

/**
 * Earth at night: thirty-two seconds of night timelapses from the space station, cut to its music. The music is the
 * clock: 16 bars at 120 BPM, and every shot and every title starts on a beat with `anchor="song" at="beat:N"`.
 *
 *   bars 1–4   intro   the dark Earth drifting, one shot a bar; the title on bar 3
 *   bars 5–8   build   cities, then a cut on every beat, and lightning on every snare: each storm shot starts on the
 *                      frame a flash begins (lightning.ts, found by scripts/flashes.ts), so the flash is the cut
 *   bars 9–12  drop    the aurora, a cut on every beat, then every two
 *   bars 13–16 outro   cities, a bar each, ending on the sunrise; the end line on bar 15
 *
 * `npx uberscene video.tsx --check-sync` says every cut is on its beat.
 */
const display = googleFont("Inter Tight", { weights: [700] });

const W = 1080,
  H = 1920;

/** The film's shots, in order: each one's id, the beat it starts on, its footage, where in it, and where to centre the crop. */
const SHOTS: readonly {
  id: string;
  beat: number;
  src: string;
  from: number;
  focus: number;
  zoom?: number;
  strike?: true;
}[] = [
  // Intro: a shot a bar.
  { id: "milky-way", beat: 0, src: "stars", from: 1, focus: 0.4 },
  { id: "clouds", beat: 4, src: "earth", from: 0, focus: 0.4 },
  { id: "limb", beat: 8, src: "storm", from: 4, focus: 0.55 },
  { id: "storm-dark", beat: 12, src: "storms", from: 6, focus: 0.75 },
  // Build: two cities, then a cut on every beat, the lightning on the snares (beats 21, 23 … 31).
  { id: "cities", beat: 16, src: "earth", from: 12, focus: 0.55 },
  { id: "city-lights", beat: 18, src: "earth", from: 20, focus: 0.5 },
  { id: "coast", beat: 20, src: "earth", from: 26, focus: 0.45 },
  { id: "strike-1", beat: 21, ...lightning(0) },
  { id: "stars", beat: 22, src: "stars", from: 10, focus: 0.45 },
  { id: "strike-2", beat: 23, ...lightning(2) },
  { id: "shore", beat: 24, src: "earth", from: 8, focus: 0.55 },
  { id: "strike-3", beat: 25, ...lightning(1) },
  { id: "night-land", beat: 26, src: "earth", from: 16, focus: 0.5 },
  { id: "strike-4", beat: 27, ...lightning(3) },
  { id: "storm-cities", beat: 28, src: "storms", from: 15, focus: 0.7 },
  { id: "strike-5", beat: 29, ...lightning(4) },
  { id: "cloud-cities", beat: 30, src: "earth", from: 30, focus: 0.45 },
  { id: "strike-6", beat: 31, ...lightning(6) },
  // Drop: the aurora, a cut on every beat for two bars, then every two beats; wide and close by turns.
  { id: "aurora-1", beat: 32, src: "storm", from: 30, focus: 0.5 },
  { id: "aurora-2", beat: 33, src: "aurora", from: 24, focus: 0.45 },
  { id: "aurora-3", beat: 34, src: "storm", from: 22, focus: 0.62, zoom: 1.5 },
  { id: "aurora-4", beat: 35, src: "aurora", from: 8, focus: 0.5 },
  { id: "aurora-5", beat: 36, src: "storm", from: 2, focus: 0.55 },
  { id: "aurora-6", beat: 37, src: "aurora", from: 20, focus: 0.4, zoom: 1.4 },
  { id: "aurora-7", beat: 38, src: "storm", from: 34, focus: 0.8, zoom: 1.4 },
  { id: "aurora-8", beat: 39, src: "aurora", from: 12, focus: 0.5 },
  { id: "aurora-9", beat: 40, src: "storm", from: 10, focus: 0.7 },
  { id: "aurora-10", beat: 42, src: "aurora", from: 28, focus: 0.5 },
  { id: "aurora-11", beat: 44, src: "storm", from: 26, focus: 0.35 },
  { id: "aurora-12", beat: 46, src: "aurora", from: 40, focus: 0.45 },
  // Outro: a bar each, cities, ending on the sunrise.
  { id: "coastline", beat: 48, src: "earth", from: 46, focus: 0.45 },
  { id: "aurora-cities", beat: 52, src: "storm", from: 46, focus: 0.7 },
  { id: "lights", beat: 56, src: "earth", from: 9, focus: 0.55 },
  { id: "sunrise", beat: 60, src: "earth", from: 53, focus: 0.35 },
];

/**
 * A storm shot that starts on the frame the footage's n-th flash begins, with the crop centred on the flash and a
 * short flare of exposure as it strikes.
 */
function lightning(n: number): { src: string; from: number; focus: number; strike: true } {
  const f = LIGHTNING[n];
  if (!f) throw new Error(`lightning.ts has no flash ${n}`);
  return { src: "storms", from: f.time, focus: Math.min(0.85, Math.max(0.15, f.x)), strike: true };
}

/** Seconds a beat lasts at 120 BPM. A shot runs a tenth longer than its beats, so the next one covers it. */
const BEAT = 0.5;

/** The flare on a lightning cut: a stop brighter on the snare, back to normal in a fifth of a second. */
const STRIKE = [
  { at: 0, value: 1 },
  { at: 0.2, value: 0, easing: "easeOutCubic" as const },
];

/** A soft dark halo under the words, so they read over bright cities as over black. */
const HALO = { color: "rgba(0, 0, 0, 0.75)", blur: 24, y: 2 };

export default function Video() {
  return (
    <Composition fps={30} width={W} height={H} background={{ type: "color", color: "#000000" }}>
      <Track id="music" layout="free" role="music">
        <Audio id="song" src="asset:song" start={0} in="beat:0" out="beat:63.end" />
      </Track>

      <Track id="shots" layout="free">
        {SHOTS.map((shot, i) => {
          const next = SHOTS[i + 1]?.beat ?? 64;
          return (
            <Clip
              key={shot.id}
              id={shot.id}
              src={`asset:${shot.src}`}
              anchor="song"
              at={`beat:${shot.beat}`}
              in={shot.from}
              duration={(next - shot.beat) * BEAT + (next < 64 ? 0.1 : 0)}
              fit="cover"
              frame={{ focus: { x: shot.focus } }}
              {...(shot.zoom ? { transform: { scale: shot.zoom } } : {})}
              {...(shot.strike ? { effects: [{ type: "exposure", stops: STRIKE }] } : {})}
            />
          );
        })}
      </Track>

      <Track id="words" layout="free">
        <Title
          id="title"
          anchor="song"
          at="beat:8"
          duration={4}
          style={{ font: display, size: 104, weight: 700, color: "#ffffff", align: "center", shadow: HALO }}
          box={{ x: W / 2, y: 980, width: 840, height: 130, origin: "center" }}
          enter={{ type: "fade", duration: 0.8 }}
          exit={{ type: "fade", duration: 0.4 }}
        >
          Earth at night
        </Title>
        <Title
          id="height"
          anchor="song"
          at="beat:16"
          duration={2}
          style={{ font: display, size: 64, weight: 700, color: "#ffffff", align: "center", shadow: HALO }}
          box={{ x: W / 2, y: 980, width: 840, height: 90, origin: "center" }}
          enter={{ type: "fade", duration: 0.3 }}
          exit={{ type: "fade", duration: 0.3 }}
        >
          from 400 km up
        </Title>
        <Title
          id="end"
          anchor="song"
          at="beat:56"
          duration={4}
          style={{ font: display, size: 80, weight: 700, color: "#ffffff", align: "center", shadow: HALO }}
          box={{ x: W / 2, y: 940, width: 840, height: 220, origin: "center" }}
          enter={{ type: "fade", duration: 0.8 }}
        >
          {"Every light\nis someone."}
        </Title>
        <Title
          id="credit"
          anchor="song"
          at="beat:58"
          duration={3}
          style={{ font: display, size: 32, weight: 700, color: "#e4e7ec", align: "center", shadow: HALO }}
          box={{ x: W / 2, y: 1120, width: 840, height: 46, origin: "center" }}
          enter={{ type: "fade", duration: 0.6 }}
        >
          Footage: NASA, from the International Space Station
        </Title>
      </Track>
    </Composition>
  );
}
