import { z } from "zod";

import { Audio, Clip, Composition, googleFont, Title, Track } from "@uberscene/kit";

import { IGNITIONS } from "./ignitions";

/**
 * Liftoff: forty seconds of launches, from Apollo to Starship, cut to its music. The music is the clock: 20 bars at
 * 120 BPM, and every shot and every title starts on a beat with `anchor="song" at="beat:N"`.
 *
 *   bars 1–4    countdown  the Saturn V on its pad; ten to one on the beats
 *   bar 5       ignition   Apollo 11's engines light on the downbeat: the shot starts so its first flame is beat 16
 *   bars 5–8    Apollo     the climb, the stages falling away
 *   bars 9–12   Shuttle    Atlantis's engines light on beat 32 the same way; the climb, Endeavour at night
 *   bars 13–18  SpaceX     the drop: a Falcon Heavy lights on beat 48, then a cut a beat, Artemis and Falcon Heavy by
 *                          turns, the side boosters landing, the Starship booster coming home to the tower
 *   bars 19–20  end        the booster caught; "Every launch starts at zero."
 *
 * One edit, two shapes: `--props '{"aspect":"16:9"}'` makes the wide one. Every shot is framed with a focus on its
 * rocket, so the vertical crop keeps it. `npx uberscene video.tsx --check-sync` says every cut is on its beat.
 */
export const schema = z.object({ aspect: z.enum(["9:16", "16:9"]) });
export const defaults: z.infer<typeof schema> = { aspect: "9:16" };

const display = googleFont("Barlow Condensed", { weights: [700] });
const mono = googleFont("JetBrains Mono", { weights: [500] });

/** Seconds a beat lasts at 120 BPM. */
const BEAT = 0.5;
/** The beat the film ends on; the music's last chord rings past it. */
const END = 80;

interface Shot {
  readonly id: string;
  readonly beat: number;
  readonly src: string;
  /** Where in the asset the shot starts, in seconds; or, for an ignition shot, the beat its first flame lands on. */
  readonly from: number | { readonly lights: number };
  /** Where the rocket is across the frame (0 left, 1 right) and down it, for the crop. */
  readonly x: number;
  readonly y?: number;
  /** In the wide frame, the part of the source to show instead (fractions): the 4:3 film inside its own black bars,
   * or a corner kept clear of a sign. */
  readonly wide?: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

/** The 4:3 picture of a 1960s film transferred inside a 16:9 frame, as a 16:9 crop of it. */
const FILM = { x: 0.125, y: 0.125, width: 0.75, height: 0.75 };

const SHOTS: readonly Shot[] = [
  // Countdown: the pad, a shot a bar, the engines from beat 14 so the fireball bursts on 16.
  { id: "pad-wide", beat: 0, src: "pad", from: 0.5, x: 0.38, wide: FILM },
  { id: "pad-tower", beat: 4, src: "pad", from: 6, x: 0.32, wide: FILM },
  { id: "pad-top", beat: 8, src: "pad", from: 94, x: 0.74, wide: FILM },
  { id: "engines", beat: 14, src: "engines", from: { lights: 16 }, x: 0.55 },
  // Apollo: the climb and the stages.
  { id: "saturn-climb", beat: 20, src: "saturn", from: 2.5, x: 0.5, wide: FILM },
  { id: "saturn-close", beat: 22, src: "saturn", from: 9, x: 0.5, wide: FILM },
  { id: "interstage", beat: 24, src: "interstage", from: 10, x: 0.5, y: 0.5 },
  { id: "stages", beat: 28, src: "apollo4", from: 4, x: 0.5, wide: FILM },
  // Shuttle: Atlantis's engines light on 32, then a cut every two beats.
  { id: "atlantis-engines", beat: 30, src: "shuttle", from: { lights: 32 }, x: 0.55 },
  { id: "atlantis-clears", beat: 34, src: "shuttle", from: 20, x: 0.52 },
  { id: "endeavour-night", beat: 36, src: "night", from: 12, x: 0.5 },
  { id: "atlantis-climb", beat: 38, src: "shuttle", from: 38, x: 0.55 },
  { id: "endeavour-climb", beat: 40, src: "night", from: 46, x: 0.55 },
  { id: "atlantis-boosters", beat: 42, src: "shuttle", from: 46, x: 0.45 },
  { id: "atlantis-plume", beat: 44, src: "shuttle", from: 62, x: 0.6 },
  { id: "booster-camera", beat: 46, src: "shuttle", from: 42, x: 0.5 },
  // SpaceX and Artemis: the drop, a cut a beat, then every two.
  {
    id: "heavy-lights",
    beat: 48,
    src: "roman",
    from: { lights: 48 },
    x: 0.27,
    y: 0.6,
    wide: { x: 0, y: 0.25, width: 0.55, height: 0.55 },
  },
  { id: "heavy-clears", beat: 50, src: "heavy-lift", from: 6, x: 0.56 },
  { id: "artemis-lifts", beat: 51, src: "artemis", from: 8, x: 0.47 },
  {
    id: "heavy-rises",
    beat: 52,
    src: "roman",
    from: 18,
    x: 0.27,
    y: 0.4,
    wide: { x: 0, y: 0.05, width: 0.55, height: 0.55 },
  },
  { id: "heavy-tracks", beat: 53, src: "heavy-climb", from: 2, x: 0.5 },
  { id: "artemis-climbs", beat: 54, src: "artemis", from: 17, x: 0.47 },
  { id: "heavy-high", beat: 55, src: "heavy-climb", from: 12, x: 0.56 },
  { id: "artemis-high", beat: 56, src: "artemis", from: 56, x: 0.42 },
  { id: "boosters-part", beat: 58, src: "heavy-climb", from: 23, x: 0.4 },
  { id: "boosters-land", beat: 60, src: "heavy-land", from: 13.6, x: 0.45 },
  { id: "booster-returns", beat: 62, src: "return", from: 34, x: 0.5, y: 0.35 },
  // The booster lowered into the arms, so the catch's flare is the downbeat of bar 19.
  { id: "catch", beat: 64, src: "catch", from: 13.2 - 8 * BEAT, x: 0.5, y: 0.4 },
  // The end: the second booster home at dusk.
  { id: "home", beat: 72, src: "return", from: 52, x: 0.5, y: 0.6 },
];

const W9 = 1080,
  H9 = 1920;

/** A launch clip's start, so the frame its engines light (ignitions.ts, found by scripts/ignition.ts) is `lights`. */
function start(shot: Shot): number {
  if (typeof shot.from === "number") return shot.from;
  const at = IGNITIONS[shot.src];
  if (at === undefined) throw new Error(`ignitions.ts has no ${shot.src}`);
  return Math.max(0, at - (shot.from.lights - shot.beat) * BEAT);
}

/** The countdown on the beats, ten on beat 6 to one on beat 15. */
const COUNT = Array.from({ length: 10 }, (_, i) => ({ n: 10 - i, beat: 6 + i }));

/** Where each era starts, and its label. */
const ERAS = [
  { beat: 20, label: "1969 · SATURN V" },
  { beat: 32, label: "2010 · SPACE SHUTTLE" },
  { beat: 48, label: "2018 – 2026 · FALCON HEAVY · SLS" },
  { beat: 62, label: "2024 · STARSHIP" },
];

const HALO = { color: "rgba(0, 0, 0, 0.7)", blur: 28, y: 2 };

export default function Video(props: z.infer<typeof schema>) {
  const tall = props.aspect === "9:16";
  const W = tall ? W9 : H9,
    H = tall ? H9 : W9;
  // The words sit inside TikTok's safe zone in the tall frame, and a little above the middle in the wide one.
  const middle = tall ? 820 : 480;
  const labelY = tall ? 300 : 90;
  return (
    <Composition fps={30} width={W} height={H} background={{ type: "color", color: "#000000" }}>
      <Track id="music" layout="free" role="music">
        <Audio id="song" src="asset:song" start={0} in="beat:0" out="beat:79.end" />
      </Track>

      <Track id="shots" layout="free">
        {SHOTS.map((shot, i) => {
          const next = SHOTS[i + 1]?.beat ?? END;
          return (
            <Clip
              key={shot.id}
              id={shot.id}
              src={`asset:${shot.src}`}
              anchor="song"
              at={`beat:${shot.beat}`}
              in={start(shot)}
              // A tenth longer than its beats, so the next shot covers it; the last one runs into the music's tail.
              duration={(next - shot.beat) * BEAT + (next < END ? 0.1 : 2)}
              fit="cover"
              {...(!tall && shot.wide
                ? { transform: { crop: shot.wide } }
                : { frame: { focus: { x: shot.x, ...(shot.y === undefined ? {} : { y: shot.y }) } } })}
            />
          );
        })}
      </Track>

      <Track id="words" layout="free">
        {COUNT.map(({ n, beat }) => (
          <Title
            key={n}
            id={`count-${n}`}
            anchor="song"
            at={`beat:${beat}`}
            duration={BEAT}
            style={{
              font: display,
              size: tall ? 260 : 220,
              weight: 700,
              color: "#ffffff",
              align: "center",
              shadow: HALO,
            }}
            box={{ x: W / 2, y: middle, width: 600, height: 300, origin: "center" }}
            enter={{ type: "fade", duration: 0.05 }}
          >
            {String(n)}
          </Title>
        ))}
        {ERAS.map(({ beat, label }) => (
          <Title
            key={label}
            id={`era-${beat}`}
            anchor="song"
            at={`beat:${beat}`}
            duration={3}
            style={{ font: mono, size: tall ? 30 : 26, weight: 500, color: "#ffffff", align: "center", shadow: HALO }}
            box={{ x: W / 2, y: labelY, width: W - 120, height: 50, origin: "center" }}
            enter={{ type: "fade", duration: 0.2 }}
            exit={{ type: "fade", duration: 0.3 }}
          >
            {label}
          </Title>
        ))}
        <Title
          id="end"
          anchor="song"
          at="beat:72"
          duration={5.5}
          style={{
            font: display,
            size: tall ? 120 : 110,
            weight: 700,
            color: "#ffffff",
            align: "center",
            shadow: HALO,
          }}
          box={{ x: W / 2, y: middle, width: W - 160, height: tall ? 300 : 150, origin: "center" }}
          enter={{ type: "fade", duration: 0.6 }}
        >
          {tall ? "EVERY LAUNCH\nSTARTS AT ZERO" : "EVERY LAUNCH STARTS AT ZERO"}
        </Title>
      </Track>
    </Composition>
  );
}
