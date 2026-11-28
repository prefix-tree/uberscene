// Nature in 16 seconds, every sound laid by hand: the film the sound-breakdown post shows above its own timeline.
// 1080x880 (the band a breakdown post gives its film), 120 BPM, so beat N is at N / 2 seconds.
//
//   beats 0–1    a skier, full frame, passing by
//   beats 1–6    six tall strips slide in, one every half beat, each with a whoosh and its own place's sound
//   beats 6–8    the collage closes into a thin band, then black
//   beats 8–12   "moving sounds from", then THE WILD in red, its letters settling one a tick
//   beats 12–20  footage in a band behind the title, a cut every beat, the band widening
//   beats 20–32  the band opens to full frame on the drop, a cut every two beats, ending on the fire pit
//
// The footage plays silent: its sound is laid as sound elements of its own, so each one is a lane in the breakdown and
// can start before its picture (a J-cut). The music (score.ts) is dark synth-pop techno on the same grid.
// Media: scripts/prepare.ts, from Pixabay and Freesound (sources.ts, CREDITS.md).
import { Audio, Clip, Composition, googleFont, Marker, Shape, Title, Track } from "@uberscene/kit";

const W = 1080;
const H = 880;
/** Seconds a beat lasts at 120 BPM. */
const BEAT = 0.5;
const at = (beat: number) => beat * BEAT;
/** How early a sound comes in before its picture: the ear is led into the next shot. */
const LEAD = 0.25;

const condensed = googleFont("Barlow Condensed", { weights: [800] });
const body = googleFont("Barlow", { weights: [500] });
const RED = "#ff2b1c";

/** The six strips, left to right, landing one every half beat from beat 1, each with its own place's sound. */
const STRIPS = [
  { src: "skier", sound: "ski-run", in: 0.5 },
  { src: "ridge", sound: "ridge-sound", in: 1 },
  { src: "falls", sound: "falls-sound", in: 1 },
  { src: "surf", sound: "surf-sound", in: 2 },
  { src: "skier-2", sound: "poles", in: 1 },
  { src: "grass", sound: "grass-sound", in: 2 },
] as const;
const STRIP_W = W / STRIPS.length;
const LANDS = 1;
/** The collage starts closing on beat 6 and is gone on beat 8. */
const CLOSE = 6;
const BLACK = 8;
/** The words: the line on beat 8, the word's letters settling from beat 9.5, one a sixteenth from beat 10. */
const WORDS = 8;
const WORD = "THE WILD";
const SCRAMBLE = 9.5;
const SETTLE = 10;
/** The band from beat 12, a cut every beat; it opens on the drop (beat 20); the title leaves on beat 24. */
const BAND = 12;
const DROP = 20;
const TITLE_OUT = 24;
const END = 32;

/** The band's shots, a beat each, each with its sound. */
const BAND_SHOTS = [
  { src: "falls", sound: "falls-sound" },
  { src: "skier-3", sound: "ski-passby" },
  { src: "surf", sound: "surf-sound" },
  { src: "rain", sound: "rain-sound" },
  { src: "ridge", sound: "ridge-sound" },
  { src: "skier", sound: "ski-run" },
  { src: "grass", sound: "grass-sound" },
  { src: "storm", sound: "thunder" },
] as const;

/** The full-frame shots from the drop, a cut every two beats; the fire pit holds to the end. */
const DROP_SHOTS = [
  { id: "surf-wide", src: "surf", beat: 20, sound: "surf-sound" },
  { id: "skier-wide", src: "skier-3", beat: 22, sound: "snow-slide" },
  { id: "storm-wide", src: "storm", beat: 24, sound: "thunder" },
  { id: "stork-wide", src: "stork", beat: 26, sound: undefined },
  { id: "fire-pit", src: "embers", beat: 28, sound: "crackle" },
] as const;

/** The letters a settling letter shows before it settles. */
const GLYPHS = "ABCDEFGHJKLMNOPQRSTUVWXYZ#%&@";
/** Steps of the scramble, one every two frames at 30 fps. */
const STEP = 1 / 15;

/**
 * THE WILD as it decodes: from beat 9.5 every letter shows a random glyph each step, and letter k settles on the k-th
 * sixteenth from beat 10, on the score's ticks. Seeded, so every render shows the same letters.
 */
function scrambleSteps(): { from: number; text: string }[] {
  let seed = 7;
  const random = () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed / 2_147_483_648;
  };
  const start = at(SCRAMBLE);
  const settled = at(SETTLE) + (WORD.length - 1) * (BEAT / 4);
  const steps: { from: number; text: string }[] = [];
  for (let k = 0; start + k * STEP < settled; k++) {
    const t = start + k * STEP;
    const text = [...WORD]
      .map((ch, i) =>
        ch === " " || t >= at(SETTLE) + i * (BEAT / 4) - 1e-9 ? ch : GLYPHS[Math.floor(random() * GLYPHS.length)],
      )
      .join("");
    steps.push({ from: t, text });
  }
  steps.push({ from: settled, text: WORD });
  return steps;
}

/** One black bar of the matte, its height over time as [seconds from beat 6, pixels]. */
function matteBar(id: string, edge: "top" | "bottom") {
  const gap = (band: number) => (H - band) / 2;
  const keys: [number, number][] = [
    [0, 1],
    [at(CLOSE + 1.5) - at(CLOSE), gap(90)],
    [at(BLACK) - at(CLOSE), H / 2 + 1],
    [at(BAND) - at(CLOSE), gap(70)],
    [at(DROP) - at(CLOSE), gap(280)],
    [at(DROP) - at(CLOSE) + 0.35, 1],
  ];
  return (
    <Shape
      id={id}
      type="rectangle"
      start={at(CLOSE)}
      duration={at(DROP + 1) - at(CLOSE)}
      width={W}
      height={keys.map(([t, value], i) => ({
        at: t,
        value,
        // The close and the opening on the drop are eased; the band widens evenly.
        easing: i === 0 || i === 4 ? "easeInOutCubic" : "linear",
      }))}
      fill="#000000"
      box={{ x: 0, y: edge === "top" ? 0 : H, origin: edge === "top" ? "topLeft" : "bottomLeft" }}
    />
  );
}

export default function Video() {
  return (
    <Composition fps={30} width={W} height={H} background={{ type: "color", color: "#000000" }}>
      <Marker id="collage" start={at(LANDS)} label="the collage" />
      <Marker id="close" start={at(CLOSE)} label="it closes" />
      <Marker id="words" start={at(WORDS)} label="the title" />
      <Marker id="band" start={at(BAND)} label="the band" />
      <Marker id="drop" start={at(DROP)} label="the drop" />
      <Marker id="end" start={at(28)} label="the fire pit" />
      <Track id="music" layout="free" role="music">
        <Audio id="score" src="asset:score" start={0} duration={at(END)} volume={0.8} fade={{ out: 0.8 }} />
      </Track>

      {/* The full-frame film: the skier under the strips, the band's shots, then the drop. */}
      <Track id="shots" layout="free">
        <Clip id="skier-open" src="asset:skier" start={0} in={0} duration={at(BLACK)} volume={0} fit="cover" />
        {BAND_SHOTS.map((s, i) => (
          <Clip
            key={`band-${i}`}
            id={`band-${i + 1}`}
            src={`asset:${s.src}`}
            start={at(BAND + i)}
            in={2 + i * 0.3}
            duration={BEAT}
            volume={0}
            fit="cover"
          />
        ))}
        {DROP_SHOTS.map((s, i) => (
          <Clip
            key={s.id}
            id={s.id}
            src={`asset:${s.src}`}
            start={at(s.beat)}
            in={1}
            duration={at((DROP_SHOTS[i + 1]?.beat ?? END) - s.beat)}
            volume={0}
            fit="cover"
          />
        ))}
      </Track>

      {/* The strips: each drops in from above the frame in a fifth of a second and stays until the collage closes. */}
      {STRIPS.map((strip, i) => (
        <Track key={strip.src} id={`strips-${i + 1}`} layout="free">
          <Clip
            id={`strip-${i + 1}`}
            src={`asset:${strip.src}`}
            start={at(LANDS + i / 2)}
            in={strip.in}
            duration={at(BLACK) - at(LANDS + i / 2)}
            volume={0}
            fit="cover"
            box={{
              x: STRIP_W * i + STRIP_W / 2,
              y: [
                { at: 0, value: -H / 2, easing: "easeOutCubic" },
                { at: 0.2, value: H / 2 },
              ],
              width: STRIP_W + 1,
              height: H,
              origin: "center",
            }}
          />
        </Track>
      ))}

      {/* The matte: two black bars that close the collage into a band, then open the band behind the title. */}
      <Track id="matte" layout="free">
        {matteBar("matte-top", "top")}
        {matteBar("matte-bottom", "bottom")}
      </Track>

      {/* The title: a line, then the word decoding in red; the line leaves on the drop, the word on beat 24. */}
      <Track id="title" layout="free">
        <Title
          id="moving-sounds"
          start={at(WORDS)}
          duration={at(DROP) - at(WORDS)}
          style={{ font: body, size: 40, weight: 500, color: "#ffffff", align: "center", letterSpacing: 2 }}
          box={{ x: W / 2, y: H / 2 - 185, width: 900, height: 60, origin: "center" }}
        >
          moving sounds from
        </Title>
        {scrambleSteps().map((s, i, all) => (
          <Title
            key={`wild-${i}`}
            id={`the-wild-${i + 1}`}
            start={s.from}
            duration={(all[i + 1]?.from ?? at(TITLE_OUT)) - s.from}
            style={{ font: condensed, size: 250, weight: 800, color: RED, align: "center", letterSpacing: 4 }}
            box={{ x: W / 2, y: H / 2 + 10, width: 1000, height: 260, origin: "center" }}
          >
            {s.text}
          </Title>
        ))}
      </Track>

      {/* The places' own sounds, each in a little before its picture. */}
      <Track id="places" layout="free" role="ambience">
        <Audio id="ski-open" src="asset:ski-passby" start={0} in={0} duration={1.4} volume={1.1} fade={{ out: 0.5 }} />
        {STRIPS.map((strip, i) => (
          <Audio
            key={strip.sound}
            id={`${strip.src}-near`}
            src={`asset:${strip.sound}`}
            start={at(LANDS + i / 2) - LEAD}
            in={1}
            // Each place stays in as the next comes, a layer more every half beat, and all close with the collage.
            duration={at(CLOSE + 1.5) - at(LANDS + i / 2) + LEAD}
            volume={0.75}
            fade={{ in: 0.1, out: 0.6 }}
          />
        ))}
        <Audio id="snow-step" src="asset:crunch" start={at(BLACK)} volume={0.9} />
        {BAND_SHOTS.map((s, i) => (
          <Audio
            key={`band-sound-${i}`}
            id={`band-${i + 1}-sound`}
            src={`asset:${s.sound}`}
            start={at(BAND + i) - LEAD}
            in={0.8}
            duration={BEAT + LEAD + 0.1}
            volume={0.8}
            fade={{ in: 0.08, out: 0.15 }}
          />
        ))}
        {DROP_SHOTS.map((s, i) =>
          s.sound ? (
            <Audio
              key={`${s.id}-sound`}
              id={`${s.id}-sound`}
              src={`asset:${s.sound}`}
              start={at(s.beat) - (s.beat === DROP ? 0 : LEAD)}
              in={0.5}
              duration={at((DROP_SHOTS[i + 1]?.beat ?? END) - s.beat) + (s.beat === DROP ? 0.2 : LEAD + 0.2)}
              volume={s.sound === "thunder" ? 0.6 : 0.85}
              fade={{ in: s.beat === DROP ? 0 : 0.15, out: s.id === "fire-pit" ? 1.2 : 0.3 }}
            />
          ) : null,
        )}
      </Track>

      {/* The cues on the picture: a whoosh as each strip lands, the skier's spray on the drop, the stork's wings. */}
      <Track id="cues" layout="free" role="effects">
        {STRIPS.map((_, i) => (
          <Audio
            key={`whoosh-${i}`}
            id={`whoosh-${i + 1}`}
            src="asset:whoosh"
            anchor={`strip-${i + 1}`}
            align="onset"
            volume={0.55}
          />
        ))}
        <Audio id="spray" src="asset:ski-passby" anchor="skier-wide" align="onset" duration={1.2} volume={0.9} />
        <Audio
          id="wings"
          src="asset:wings"
          anchor="stork-wide"
          align="onset"
          duration={1.5}
          volume={0.5}
          fade={{ out: 0.3 }}
        />
      </Track>
    </Composition>
  );
}
