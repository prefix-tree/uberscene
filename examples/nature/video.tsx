// Nature in 25 seconds, every sound laid by hand: the film the sound-breakdown post shows above its own timeline.
// 1080x880 (the band a breakdown post gives its film), 120 BPM, so beat N is at N / 2 seconds.
//
//   0–3 s     the fire, full frame, with its crackle
//   3–6 s     six tall strips land one a beat over the fire, each with a whoosh, each strip's own sound starting 0.3 s early
//   9–15 s    the strips rotate: new footage every beat, then every half beat; the clock in the music speeds up
//   15 s      a quarter beat of silence, then the storm full frame on a braam and thunder
//   15–22 s   a cut every two beats: surf, waterfall, rain, snow, grass, the stork with its wings
//   22–25 s   the fire pit, the last low note ringing out
//
// The music (score.ts) is punctuation only; the film's own sounds carry it. The footage plays silent: its sound is laid
// as sound elements of its own, so each one is a lane in the breakdown and can start before its picture (a J-cut).
// Media: scripts/prepare.ts, from Pixabay and Freesound (sources.ts, CREDITS.md).
import { Audio, Clip, Composition, Marker, Track } from "@uberscene/kit";

const W = 1080;
const H = 880;
/** Seconds a beat lasts at 120 BPM. */
const BEAT = 0.5;
/** How early a sound comes in before its picture: the ear is led into the next shot. */
const LEAD = 0.3;

/** The six strips, left to right, each landing on its beat with its own sound. */
const STRIPS = [
  { src: "drops", sound: "drops-sound", in: 1 },
  { src: "falls", sound: "falls-sound", in: 1 },
  { src: "surf", sound: "surf-sound", in: 2 },
  { src: "rain", sound: "rain-sound", in: 1 },
  { src: "grass", sound: "grass-sound", in: 2 },
  { src: "ridge", sound: "ridge-sound", in: 1 },
] as const;
const STRIP_W = W / STRIPS.length;
/** The first strip lands on beat 6, one a beat after it. */
const LANDS = 6;
/** The strips rotate from beat 18, every beat to beat 24, then every half beat to the merge on beat 30. */
const ROTATE = 18;
const MERGE = 30;
/** What the strips cycle through as they rotate. */
const POOL = ["falls", "surf", "drops", "rain", "grass", "ridge", "stork", "embers", "storm", "fire"] as const;

/** The swaps of each strip, from the rotation to the merge: [start beat, length in beats]. */
const SWAPS: readonly (readonly [number, number])[] = [
  ...Array.from({ length: 6 }, (_, k) => [ROTATE + k, 1] as const),
  ...Array.from({ length: 12 }, (_, k) => [ROTATE + 6 + k / 2, 0.5] as const),
];

/** The full-frame shots after the merge, a cut every two beats, each with its sound. */
const CUTS = [
  { id: "storm-wide", src: "storm", beat: 30, sound: "thunder" },
  { id: "surf-wide", src: "surf", beat: 32, sound: "surf-sound" },
  { id: "falls-wide", src: "falls", beat: 34, sound: "falls-sound" },
  { id: "rain-wide", src: "rain", beat: 36, sound: "rain-sound" },
  { id: "ridge-wide", src: "ridge", beat: 38, sound: "ridge-sound" },
  { id: "grass-wide", src: "grass", beat: 40, sound: "grass-sound" },
  { id: "stork-wide", src: "stork", beat: 42, sound: undefined },
  { id: "embers-wide", src: "embers", beat: 44, sound: "crackle" },
] as const;
const END = 50;

export default function Video() {
  return (
    <Composition fps={30} width={W} height={H} background={{ type: "color", color: "#000000" }}>
      <Marker id="strips-land" start={LANDS * BEAT} label="strips land" />
      <Marker id="rotation" start={ROTATE * BEAT} label="rotation" />
      <Marker id="merge" start={MERGE * BEAT} label="the merge" />
      <Marker id="fire-pit" start={44 * BEAT} label="the fire pit" />
      <Track id="music" layout="free" role="music">
        <Audio id="score" src="asset:score" start={0} volume={0.85} />
      </Track>

      {/* The full-frame film: the fire behind the strips as they land, then the cuts after the merge. */}
      <Track id="shots">
        <Clip id="fire-open" src="asset:fire" in={0} out={8} volume={0} fit="cover" />
        <Clip id="embers-under" src="asset:embers" in={1} out={8} volume={0} fit="cover" />
        {CUTS.map((c, i) => {
          const next = CUTS[i + 1]?.beat ?? END;
          return (
            <Clip
              key={c.id}
              id={c.id}
              src={`asset:${c.src}`}
              in={1}
              out={1 + (next - c.beat) * BEAT}
              volume={0}
              fit="cover"
            />
          );
        })}
      </Track>

      {/* The strips: each lands on its beat, then rotates through the pool until the merge. */}
      {STRIPS.map((strip, i) => (
        <Track key={strip.src} id={`strips-${i + 1}`} layout="free">
          <Clip
            id={`strip-${i + 1}`}
            src={`asset:${strip.src}`}
            anchor="score"
            at={`beat:${LANDS + i}`}
            in={strip.in}
            duration={(ROTATE - LANDS - i) * BEAT}
            volume={0}
            fit="cover"
            // It drops in from above the frame in a quarter of a second.
            box={{
              x: STRIP_W * i + STRIP_W / 2,
              y: [
                { at: 0, value: -H / 2, easing: "easeOutCubic" },
                { at: 0.25, value: H / 2 },
              ],
              width: STRIP_W + 1,
              height: H,
              origin: "center",
            }}
          />
          {SWAPS.map(([beat, beats], k) => (
            <Clip
              key={`${i}-${k}`}
              id={`strip-${i + 1}-${k + 1}`}
              src={`asset:${POOL[(i * 3 + k) % POOL.length]}`}
              anchor="score"
              at={`beat:${Math.floor(beat)}`}
              offset={(beat % 1) * BEAT}
              in={1 + ((k * 0.4) % 5)}
              duration={beats * BEAT}
              volume={0}
              fit="cover"
              box={{ x: STRIP_W * i + STRIP_W / 2, y: H / 2, width: STRIP_W + 1, height: H, origin: "center" }}
            />
          ))}
        </Track>
      ))}

      {/* The places' own sounds: the fire's at the open, each strip's 0.3 s before it lands, each cut's before it. */}
      <Track id="places" layout="free" role="ambience">
        <Audio
          id="fire-crackle"
          src="asset:fire-sound"
          start={0}
          in={1.8}
          duration={3.4}
          volume={1.2}
          fade={{ out: 0.4 }}
        />
        {STRIPS.map((strip, i) => (
          <Audio
            key={strip.sound}
            id={`${strip.src}-near`}
            src={`asset:${strip.sound}`}
            anchor="score"
            at={`beat:${LANDS + i}`}
            offset={-LEAD}
            in={1}
            duration={1.1}
            volume={1.3}
            fade={{ in: 0.15, out: 0.4 }}
          />
        ))}
        <Audio
          id="rain-bed"
          src="asset:rain-sound"
          anchor="score"
          at={`beat:${ROTATE}`}
          in={0}
          duration={(MERGE - ROTATE) * BEAT - 0.25}
          volume={1}
          fade={{ in: 0.6, out: 0.1 }}
        />
        {CUTS.map((c, i) =>
          c.sound ? (
            <Audio
              key={c.id}
              id={`${c.src}-wide-sound`}
              src={`asset:${c.sound}`}
              anchor="score"
              at={`beat:${c.beat}`}
              offset={c.beat === MERGE ? 0 : -LEAD}
              in={0.5}
              duration={((CUTS[i + 1]?.beat ?? END) - c.beat) * BEAT + (c.beat === MERGE ? 0.8 : LEAD + 0.3)}
              volume={c.sound === "thunder" ? 0.55 : 0.8}
              fade={{ in: c.beat === MERGE ? 0 : 0.2, out: c.beat === 44 ? 1.2 : 0.4 }}
            />
          ) : null,
        )}
      </Track>

      {/* The cues on the picture: a whoosh as each strip lands, the braam on the merge, the stork's wings. */}
      <Track id="cues" layout="free" role="effects">
        {STRIPS.map((_, i) => (
          <Audio
            key={`whoosh-${i}`}
            id={`whoosh-${i + 1}`}
            src="asset:whoosh"
            anchor={`strip-${i + 1}`}
            align="onset"
            volume={0.7}
          />
        ))}
        <Audio id="braam" src="asset:braam" anchor="storm-wide" align="onset" volume={0.5} />
        <Audio
          id="wings"
          src="asset:wings"
          anchor="stork-wide"
          align="onset"
          duration={1.5}
          volume={0.45}
          fade={{ out: 0.3 }}
        />
      </Track>
    </Composition>
  );
}
