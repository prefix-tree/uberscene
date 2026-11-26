import { Audio, Camera, Clip, Composition, googleFont, Shape, Title, Track } from "@uberscene/kit";

/**
 * One beat of the interview in the style of a short-form "edited" reel: the speaker cut out onto a blue ground with a
 * sticker edge, a word standing behind him, and a card for each of his three "wouldn't it be amazing" lines. Each
 * card is written where it belongs beside him, the later ones outside the frame, and the camera makes room as it
 * lands (`push`), so the speaker and the cards already there slide aside together. Nothing rests: the cards bob on a
 * `wiggle`, the view closes in on a `drift` and sways a little. No pan, zoom or idle move here is keyed by hand.
 *
 * What is under the camera moves with it; the caps in the corner are on a track outside it and stay put. Everything
 * is timed to the words he says (`anchor="voice" at="word:N"`).
 *
 * Done another way than the reel this follows, because UberScene has no way yet:
 * - a card is a frame, a picture and a label, three elements that cannot turn about one pivot, so cards bob and do
 *   not tilt;
 * - a title is one colour, so the blue word in the stack is a title of its own (BACKLOG.md item 7);
 * - the cut-out is the take over green, keyed out with `colorKey`, as in `video.tsx` (items 2 and 6 replace it).
 *
 * Footage: Dr. Joe Westlake, NASA, and Voyager b-roll, NASA's Scientific Visualization Studio (svs.gsfc.nasa.gov/15111).
 * Sounds: Kenney's Interface Sounds (CC0), by way of soundcn; the music is synthesized for the example.
 * The media is not in the repository: `scripts/prepare.sh` makes it (see README.md).
 */
const caps = googleFont("Antonio", { weights: [700] });
const BLUE = "#0d2cf5";
const INK = "#0b0b0d";
const WHITE = "#ffffff";

/** The speaker: green removed, black and white, and a white edge around his outline, as a sticker has. */
const STICKER = [
  { type: "colorKey", color: "#00ff00", tolerance: 0.36, softness: 0.14, spill: 1 },
  { type: "grayscale", amount: 1 },
  { type: "contrast", amount: 0.25 },
  { type: "outline", thickness: 9, color: WHITE },
] as const;
/** A card's picture: black and white, printed in dots. The b-roll is slowed so each shot lasts as long as its card. */
const PRINT = [
  { type: "grayscale", amount: 1 },
  { type: "contrast", amount: 0.35 },
  { type: "halftone", size: 7 },
] as const;

/** A card is never quite still: its frame, picture and label bob together, on one seed. */
const bob = (y: number, seed: number) => ({ type: "wiggle", base: y, amount: 10, frequency: 0.4, seed }) as const;
const POP = { type: "pop", duration: 0.28 } as const;
const LABEL = { font: caps, size: 44, weight: 700, color: BLUE, letterSpacing: 2 } as const;
const STACK = { font: caps, size: 92, weight: 700, color: INK, background: WHITE, align: "left" } as const;

export default function Video() {
  return (
    <Composition
      fps="23.976"
      width={1920}
      height={1080}
      background={{ type: "color", color: BLUE }}
      motionBlur={{ shutterAngle: 180, samples: 8 }}
    >
      {/* His voice: the three lines, heard under everything. Every time below is one of its words. */}
      <Track id="voice-track" layout="free" role="dialogue">
        <Audio id="voice" src="asset:talk" start={0} in="word:42" out="word:95.end" volume={0.8} />
      </Track>
      <Track id="music" layout="free" role="music">
        <Audio
          id="bed"
          src="asset:music"
          start={0}
          duration="fill"
          volume={0.5}
          duck={{ under: "dialogue", to: 0.3, attack: 0.15, release: 0.5 }}
          fade={{ in: 0.2, out: 0.8 }}
        />
      </Track>

      {/*
        The camera makes room for each card's frame as it starts, and never rests. It keeps the word in the middle in
        view, and with it the speaker in front of that word. Keeping the speaker himself would lift him off the
        bottom of the frame: a push holds what it keeps inside the margin on every side, and he stands on the edge.
      */}
      <Camera
        id="cam"
        push={{ on: ["frame-message", "frame-planets", "frame-farther"], keep: ["word"], duration: 0.32 }}
        zoom={{ type: "drift", base: 1, speed: 0.004 }}
        rotation={{ type: "wiggle", amount: 0.5, frequency: 0.25 }}
      >
        {/* Written before the speaker's track, so it stands behind him. */}
        <Track id="behind" layout="free">
          <Title
            id="word"
            start={0}
            duration="fill"
            box={{ x: 960, y: 470, origin: "center" }}
            style={{ font: caps, size: 470, weight: 700, color: "#3a55ff", letterSpacing: -6 }}
          >
            VOYAGER
          </Title>
        </Track>
        <Track id="subject" layout="free">
          <Clip
            id="speaker"
            src="asset:cutout"
            start={0}
            in="word:42"
            out="word:95.end"
            volume={0}
            fit="cover"
            box={{ x: 960, y: 1080, width: 900, height: 900, origin: "bottom" }}
            effects={STICKER}
          />
        </Track>
        <Track id="frames" layout="free">
          <Shape
            id="frame-message"
            type="rectangle"
            anchor="voice"
            at="word:51"
            duration="fill"
            width={380}
            height={470}
            cornerRadius={20}
            fill={WHITE}
            box={{ x: 150, y: bob(520, 1), origin: "center" }}
            enter={POP}
          />
          <Shape
            id="frame-planets"
            type="rectangle"
            anchor="voice"
            at="word:66"
            duration="fill"
            width={380}
            height={470}
            cornerRadius={20}
            fill={WHITE}
            box={{ x: 1830, y: bob(520, 2), origin: "center" }}
            enter={POP}
          />
          <Shape
            id="frame-farther"
            type="rectangle"
            anchor="voice"
            at="word:83"
            duration="fill"
            width={380}
            height={470}
            cornerRadius={20}
            fill={WHITE}
            box={{ x: -330, y: bob(520, 3), origin: "center" }}
            enter={POP}
          />
        </Track>
        <Track id="pictures" layout="free">
          <Clip
            id="picture-message"
            src="asset:voyager"
            speed={0.28}
            anchor="voice"
            at="word:51"
            duration="fill"
            fit="cover"
            box={{ x: 150, y: bob(488, 1), width: 332, height: 332, origin: "center" }}
            transform={{ borderRadius: 12 }}
            effects={PRINT}
          />
          <Clip
            id="picture-planets"
            src="asset:saturn"
            speed={0.45}
            anchor="voice"
            at="word:66"
            duration="fill"
            fit="cover"
            box={{ x: 1830, y: bob(488, 2), width: 332, height: 332, origin: "center" }}
            transform={{ borderRadius: 12 }}
            effects={PRINT}
          />
          <Clip
            id="picture-farther"
            src="asset:voyager"
            in={1.5}
            speed={0.5}
            anchor="voice"
            at="word:83"
            duration="fill"
            fit="cover"
            box={{ x: -330, y: bob(488, 3), width: 332, height: 332, origin: "center" }}
            transform={{ borderRadius: 12 }}
            effects={PRINT}
          />
        </Track>
        <Track id="labels" layout="free">
          <Title
            id="label-message"
            anchor="voice"
            at="word:51"
            duration="fill"
            box={{ x: 150, y: bob(706, 1), origin: "center" }}
            style={LABEL}
            enter={POP}
          >
            A MESSAGE
          </Title>
          <Title
            id="label-planets"
            anchor="voice"
            at="word:66"
            duration="fill"
            box={{ x: 1830, y: bob(706, 2), origin: "center" }}
            style={LABEL}
            enter={POP}
          >
            THE PLANETS
          </Title>
          <Title
            id="label-farther"
            anchor="voice"
            at="word:83"
            duration="fill"
            box={{ x: -330, y: bob(706, 3), origin: "center" }}
            style={LABEL}
            enter={POP}
          >
            FARTHER
          </Title>
        </Track>
      </Camera>

      {/* Outside the camera, fixed to the screen: the line he keeps coming back to, stacked in the corner. */}
      <Track id="stack" layout="free">
        <Title
          id="stack-1"
          anchor="voice"
          at="word:42"
          duration="fill"
          box={{ x: 90, y: 86, width: 560, height: 122, origin: "topLeft" }}
          transform={{ rotation: -3 }}
          style={STACK}
          enter={POP}
        >
          WOULDN'T IT BE
        </Title>
        <Title
          id="stack-2"
          anchor="voice"
          at="word:45"
          duration="fill"
          box={{ x: 104, y: 214, width: 400, height: 122, origin: "topLeft" }}
          transform={{ rotation: -3 }}
          style={{ ...STACK, color: BLUE }}
          enter={POP}
        >
          AMAZING
        </Title>
      </Track>

      {/* A click as each card lands. */}
      <Track id="clicks" layout="free" role="effects">
        <Audio id="click-message" src="asset:click" anchor="voice" at="word:51" volume={0.6} />
        <Audio id="click-planets" src="asset:click" anchor="voice" at="word:66" volume={0.6} />
        <Audio id="click-farther" src="asset:click" anchor="voice" at="word:83" volume={0.6} />
      </Track>
    </Composition>
  );
}
