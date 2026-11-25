import { Audio, Clip, Composition, googleFont, Shape, Title, Track } from "@uberscene/kit";

/**
 * The interview edit as a vertical reel (1080x1920, for TikTok, Reels and Shorts): the same cut, words, timing and
 * sound as `video.tsx`, laid out for the tall frame. The words sit in the upper part, inside both TikTok's and Reels'
 * safe zones (x 120 to 960, y 270 to 1248); the speaker, cut out, stands low in the frame, where the platform's
 * buttons and caption cover only his jacket. Check it with `--check-layout --safe-zone reels` and `tiktok`.
 *
 * Footage: Dr. Joe Westlake, NASA, and Voyager b-roll, NASA's Scientific Visualization Studio (svs.gsfc.nasa.gov/15111).
 * Sound effects: Kenney's Interface Sounds (CC0). The music is synthesized for this film. The media is made by
 * `scripts/prepare.sh` (see README.md).
 */
const caps = googleFont("Antonio", { weights: [700] });
const light = googleFont("Inter Tight", { weights: [400] });
const BLUE = "#0d2cf5";
const INK = "#0b0b0d";
const WHITE = "#ffffff";

/** The cut-out with its green removed, and the same in black and white for the quote cards. */
const KEY = { type: "colorKey", color: "#00ff00", tolerance: 0.36, softness: 0.14, spill: 1 } as const;
const MONO = [KEY, { type: "grayscale", amount: 1 }, { type: "contrast", amount: 0.25 }] as const;
/** B-roll on a blue card: black and white, its black turned blue by the `screen` blend. */
const SPACE = [
  { type: "grayscale", amount: 1 },
  { type: "contrast", amount: 0.3 },
] as const;
/** The spacecraft is dim in its shot: lifted two stops so it reads on the blue. */
const CRAFT = [{ type: "exposure", stops: 2 }, ...SPACE] as const;

export default function Reel() {
  return (
    <Composition fps="23.976" width={1080} height={1920} background={{ type: "color", color: WHITE }}>
      {/* The hook: the line the answer builds to, said first, on a track of its own. */}
      <Track id="hook-voice" layout="free" role="dialogue">
        <Clip id="hook" src="asset:talk" start={0} in="word:42" out="word:54.end" fit="cover" volume={0.8} />
      </Track>

      {/* The answer, whole, from where the hook ends: its sound runs under everything. */}
      <Track id="main" layout="free" role="dialogue">
        <Clip id="talk" src="asset:talk" anchor="hook.end" in="word:0" out="word:95.end" fit="cover" volume={0.8} />
      </Track>

      {/* The music: under the whole film, down to a quarter under his voice, up again for the end card. */}
      <Track id="music" layout="free" role="music">
        <Audio
          id="bed"
          src="asset:music"
          start={0}
          duration="fill"
          volume={0.5}
          duck={{ under: "dialogue", to: 0.3, attack: 0.15, release: 0.5 }}
          fade={{ in: 0.2, out: 1.2 }}
        />
      </Track>

      {/* The cards: a full frame of white or blue over the speaker. */}
      <Track id="cards" layout="free">
        <Clip id="card-craft" src="asset:blue" anchor="talk" at="word:33" duration={3.48} fit="cover" />
        <Clip id="card-quote" src="asset:white" anchor="talk" at="word:42" duration={3.8} fit="cover" />
        <Clip id="card-planets" src="asset:blue" anchor="talk" at="word:55" duration={5.26} fit="cover" />
        <Clip id="card-farther" src="asset:white" anchor="talk" at="word:82" duration={5.26} fit="cover" />
      </Track>

      {/* What sits on the cards: the b-roll, and the speaker cut out of his background. */}
      <Track id="pictures" layout="free">
        <Clip
          id="craft"
          src="asset:voyager"
          anchor="talk"
          at="word:33"
          duration={3.48}
          fit="cover"
          volume={0}
          in={0.2}
          blend="screen"
          effects={CRAFT}
          box={{ x: -420, y: 760, width: 1920, height: 1080 }}
          transform={{
            scale: [
              { at: 0, value: 1.0, easing: "easeOutCubic" },
              { at: 3.4, value: 1.1 },
            ],
            anchor: { x: 0.3, y: 0.5 },
          }}
        />
        <Clip
          id="cut-quote"
          src="asset:cutout"
          anchor="talk"
          at="word:42"
          duration={3.8}
          fit="cover"
          volume={0}
          in="word:42"
          effects={MONO}
          box={{ x: -440, y: 840, width: 1920, height: 1080 }}
          transform={{ scale: 1.12, anchor: { x: 0.47, y: 1 } }}
        />
        <Clip
          id="saturn"
          src="asset:saturn"
          anchor="talk"
          at="word:55"
          duration={5.26}
          fit="cover"
          volume={0}
          in={0}
          speed={0.9}
          blend="screen"
          effects={SPACE}
          box={{ x: -420, y: 760, width: 1920, height: 1080 }}
          transform={{
            scale: [
              { at: 0, value: 1.1, easing: "easeOutCubic" },
              { at: 5.2, value: 1.3 },
            ],
          }}
        />
        <Clip
          id="cut-planets"
          src="asset:cutout"
          anchor="talk"
          at="word:55"
          duration={5.26}
          fit="cover"
          volume={0}
          in="word:55"
          effects={[KEY]}
          box={{ x: -440, y: 840, width: 1920, height: 1080 }}
          transform={{ scale: 1.15, anchor: { x: 0.47, y: 1 } }}
        />
        <Clip
          id="close"
          src="asset:talk"
          anchor="talk"
          at="word:75"
          duration={2.46}
          fit="cover"
          volume={0}
          in="word:75"
          transform={{
            scale: [
              { at: 0, value: 1.45, easing: "easeOutCubic" },
              { at: 2.4, value: 1.55 },
            ],
            anchor: { x: 0.47, y: 0.28 },
          }}
        />
        <Clip
          id="cut-farther"
          src="asset:cutout"
          anchor="talk"
          at="word:82"
          duration={5.26}
          fit="cover"
          volume={0}
          in="word:82"
          effects={MONO}
          box={{ x: -440, y: 840, width: 1920, height: 1080 }}
          transform={{ scale: 1.12, anchor: { x: 0.47, y: 1 } }}
        />
      </Track>

      {/* The hook's pictures: his cut-out on white for "wouldn't it be amazing", then the spacecraft on blue. */}
      <Track id="hook-pictures" layout="free">
        <Clip id="hook-white" src="asset:white" anchor="hook" at="word:42" duration={1.36} fit="cover" />
        <Clip
          id="hook-cut"
          src="asset:cutout"
          anchor="hook"
          at="word:42"
          duration={1.36}
          fit="cover"
          volume={0}
          in="word:42"
          effects={MONO}
          box={{ x: -440, y: 840, width: 1920, height: 1080 }}
          transform={{
            scale: [
              { at: 0, value: 1.12, easing: "easeOutCubic" },
              { at: 1.3, value: 1.18 },
            ],
            anchor: { x: 0.47, y: 1 },
          }}
        />
        <Clip id="hook-blue" src="asset:blue" anchor="hook" at="word:47" duration={1.88} fit="cover" />
        <Clip
          id="hook-craft"
          src="asset:voyager"
          anchor="hook"
          at="word:47"
          duration={1.88}
          fit="cover"
          volume={0}
          in={0.9}
          blend="screen"
          effects={CRAFT}
          box={{ x: -420, y: 760, width: 1920, height: 1080 }}
          transform={{
            scale: [
              { at: 0, value: 1.05, easing: "easeOutCubic" },
              { at: 2.2, value: 1.25 },
            ],
            anchor: { x: 0.3, y: 0.5 },
          }}
        />
      </Track>

      {/* The hook's words, each line on its word. */}
      <Track id="hook-text" layout="free">
        <Title
          id="hook-1"
          anchor="hook"
          at="word:42"
          duration={1.36}
          style={{ font: caps, size: 120, weight: 700, color: BLUE, align: "left" }}
          box={{ x: 120, y: 300, width: 840, height: 150, origin: "topLeft" }}
          enter={{ type: "slideUp", duration: 0.22, easing: "easeOutQuart" }}
          exit={{ type: "none" }}
        >
          WOULDN’T IT BE
        </Title>
        <Title
          id="hook-2"
          anchor="hook"
          at="word:45"
          duration={1.06}
          style={{ font: caps, size: 250, weight: 700, color: INK, align: "left" }}
          box={{ x: 120, y: 420, width: 840, height: 300, origin: "topLeft" }}
          enter={{ type: "slideUp", duration: 0.22, easing: "easeOutQuart" }}
          exit={{ type: "none" }}
        >
          AMAZING
        </Title>
        <Title
          id="hook-3"
          anchor="hook"
          at="word:47"
          duration={1.88}
          style={{ font: caps, size: 110, weight: 700, color: WHITE, align: "left" }}
          box={{ x: 120, y: 290, width: 840, height: 140, origin: "topLeft" }}
          enter={{ type: "slideUp", duration: 0.22, easing: "easeOutQuart" }}
          exit={{ type: "none" }}
        >
          IF WE COULD SEND
        </Title>
        <Title
          id="hook-4"
          anchor="hook"
          at="word:50"
          duration={1.26}
          style={{ font: caps, size: 170, weight: 700, color: BLUE, align: "left", background: WHITE }}
          box={{ x: 120, y: 440, width: 720, height: 210, origin: "topLeft" }}
          enter={{ type: "slideUp", duration: 0.22, easing: "easeOutQuart" }}
          exit={{ type: "none" }}
        >
          A MESSAGE
        </Title>
        <Title
          id="hook-5"
          anchor="hook"
          at="word:52"
          duration={0.82}
          style={{ font: caps, size: 130, weight: 700, color: WHITE, align: "left" }}
          box={{ x: 120, y: 670, width: 840, height: 200, origin: "topLeft" }}
          enter={{ type: "slideUp", duration: 0.22, easing: "easeOutQuart" }}
          exit={{ type: "none" }}
        >
          INTO THE STARS
        </Title>
      </Track>

      {/* 1. Tall caps beside him, each line on its word. */}
      <Track id="caps" layout="free">
        <Title
          id="caps-1"
          anchor="talk"
          at="word:5"
          duration={3.76}
          style={{ font: caps, size: 112, weight: 700, color: WHITE, align: "left" }}
          box={{ x: 120, y: 700, width: 840, height: 130, origin: "topLeft" }}
          enter={{ type: "slideUp", duration: 0.22, easing: "easeOutQuart" }}
          exit={{ type: "none" }}
        >
          COMPELLING
        </Title>
        <Title
          id="caps-2"
          anchor="talk"
          at="word:6"
          duration={2.68}
          style={{ font: caps, size: 112, weight: 700, color: WHITE, align: "left" }}
          box={{ x: 120, y: 836, width: 840, height: 130, origin: "topLeft" }}
          enter={{ type: "slideUp", duration: 0.22, easing: "easeOutQuart" }}
          exit={{ type: "none" }}
        >
          THINGS
        </Title>
        <Title
          id="caps-3"
          anchor="talk"
          at="word:7"
          duration={2.22}
          style={{ font: caps, size: 112, weight: 700, color: BLUE, align: "left", background: WHITE }}
          box={{ x: 120, y: 972, width: 440, height: 130, origin: "topLeft" }}
          enter={{ type: "slideUp", duration: 0.22, easing: "easeOutQuart" }}
          exit={{ type: "none" }}
        >
          HUMANITY
        </Title>
        <Title
          id="caps-4"
          anchor="talk"
          at="word:8"
          duration={1.84}
          style={{ font: caps, size: 112, weight: 700, color: WHITE, align: "left" }}
          box={{ x: 120, y: 1108, width: 840, height: 130, origin: "topLeft" }}
          enter={{ type: "slideUp", duration: 0.22, easing: "easeOutQuart" }}
          exit={{ type: "none" }}
        >
          CAN DO
        </Title>
      </Track>

      {/* 2. "Someone sat down": two cards, each held long enough to read. */}
      <Track id="flash" layout="free">
        <Shape
          id="flash-blue"
          type="rectangle"
          anchor="talk"
          at="word:11"
          duration={0.8}
          width={1080}
          height={1920}
          fill={BLUE}
          box={{ x: 540, y: 960, origin: "center" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        />
        <Title
          id="flash-someone"
          anchor="talk"
          at="word:11"
          duration={0.8}
          style={{ font: caps, size: 210, weight: 700, color: WHITE, align: "center" }}
          box={{ x: 540, y: 760, width: 900, height: 280, origin: "center" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          SOMEONE
        </Title>
        <Shape
          id="flash-white"
          type="rectangle"
          anchor="talk"
          at="word:11"
          offset={0.8}
          duration={1.1}
          width={1080}
          height={1920}
          fill={WHITE}
          box={{ x: 540, y: 960, origin: "center" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        />
        <Title
          id="flash-sat"
          anchor="talk"
          at="word:11"
          offset={0.8}
          duration={1.1}
          style={{ font: caps, size: 210, weight: 700, color: BLUE, align: "center" }}
          box={{ x: 540, y: 760, width: 900, height: 280, origin: "center" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          SAT DOWN
        </Title>
      </Track>

      {/* 3. The blue card with the spacecraft. */}
      <Track id="craft-text" layout="free">
        <Title
          id="craft-1"
          anchor="talk"
          at="word:33"
          duration={3.48}
          style={{ font: light, size: 92, weight: 400, color: WHITE, align: "left", letterSpacing: -4 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 300, width: 840, height: 110, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          these amazing
        </Title>
        <Title
          id="craft-2"
          anchor="talk"
          at="word:35"
          duration={1.72}
          style={{
            font: light,
            size: 92,
            weight: 400,
            color: BLUE,
            align: "left",
            background: WHITE,
            letterSpacing: -4,
          }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 412, width: 840, height: 112, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          pieces of hardware
        </Title>
        <Title
          id="craft-3"
          anchor="talk"
          at="word:37"
          duration={1.0}
          style={{ font: caps, size: 250, weight: 700, color: WHITE, align: "left" }}
          box={{ x: 120, y: 560, width: 840, height: 290, origin: "topLeft" }}
          enter={{ type: "slideUp", duration: 0.22, easing: "easeOutQuart" }}
          exit={{ type: "none" }}
        >
          VOYAGER
        </Title>
      </Track>

      {/* 4. The quote, phrase by phrase, beside the cut-out. */}
      <Track id="quote" layout="free">
        <Title
          id="quote-1"
          anchor="talk"
          at="word:42"
          duration={3.8}
          style={{ font: light, size: 80, weight: 400, color: INK, align: "left", letterSpacing: -4 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 300, width: 840, height: 100, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          wouldn’t it be amazing
        </Title>
        <Title
          id="quote-2"
          anchor="talk"
          at="word:46"
          duration={3.04}
          style={{ font: light, size: 80, weight: 400, color: INK, align: "left", letterSpacing: -4 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 400, width: 840, height: 100, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          if we could send
        </Title>
        <Title
          id="quote-3"
          anchor="talk"
          at="word:50"
          duration={1.82}
          style={{ font: light, size: 80, weight: 400, color: BLUE, align: "left", letterSpacing: -4 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 500, width: 840, height: 100, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          a message
        </Title>
        <Title
          id="quote-4"
          anchor="talk"
          at="word:52"
          duration={1.38}
          style={{ font: light, size: 80, weight: 400, color: INK, align: "left", letterSpacing: -4 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 600, width: 840, height: 100, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          into the stars
        </Title>
      </Track>

      {/* 5. The blue card with Saturn behind him. */}
      <Track id="planets-text" layout="free">
        <Title
          id="planets-1"
          anchor="talk"
          at="word:62"
          duration={2.36}
          style={{ font: light, size: 96, weight: 400, color: WHITE, align: "left", letterSpacing: -4 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 300, width: 840, height: 110, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          understand
        </Title>
        <Title
          id="planets-2"
          anchor="talk"
          at="word:63"
          duration={1.76}
          style={{ font: light, size: 96, weight: 400, color: WHITE, align: "left", letterSpacing: -4 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 410, width: 840, height: 110, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          all of these
        </Title>
        <Title
          id="planets-3"
          anchor="talk"
          at="word:66"
          duration={1.08}
          style={{
            font: light,
            size: 96,
            weight: 400,
            color: BLUE,
            align: "left",
            background: WHITE,
            letterSpacing: -4,
          }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 522, width: 380, height: 112, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          planets
        </Title>
        <Title
          id="voyage-1"
          anchor="talk"
          at="word:68"
          duration={1.6}
          style={{ font: light, size: 96, weight: 400, color: WHITE, align: "left", letterSpacing: -4 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 300, width: 840, height: 110, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          this grand
        </Title>
        <Title
          id="voyage-2"
          anchor="talk"
          at="word:70"
          duration={1.1}
          style={{
            font: light,
            size: 96,
            weight: 400,
            color: BLUE,
            align: "left",
            background: WHITE,
            letterSpacing: -4,
          }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 412, width: 380, height: 112, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          voyage
        </Title>
      </Track>

      {/* 6. "Farther and farther and farther", each one bigger; then where to. */}
      <Track id="farther" layout="free">
        <Title
          id="far-1"
          anchor="talk"
          at="word:82"
          duration={1.96}
          style={{ font: light, size: 80, weight: 400, color: INK, align: "left", letterSpacing: -3 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 300, width: 840, height: 96, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          punch farther
        </Title>
        <Title
          id="far-2"
          anchor="talk"
          at="word:84"
          duration={1.0}
          style={{ font: light, size: 106, weight: 400, color: BLUE, align: "left", letterSpacing: -5 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 400, width: 840, height: 124, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          and farther
        </Title>
        <Title
          id="far-3"
          anchor="talk"
          at="word:86"
          duration={0.52}
          style={{ font: light, size: 136, weight: 400, color: BLUE, align: "left", letterSpacing: -7 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 530, width: 840, height: 160, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          and farther
        </Title>
        <Title
          id="beyond-1"
          anchor="talk"
          at="word:88"
          duration={3.3}
          style={{ font: light, size: 76, weight: 400, color: INK, align: "left", letterSpacing: -4 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 300, width: 840, height: 100, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beyond our capability
        </Title>
        <Title
          id="beyond-2"
          anchor="talk"
          at="word:91"
          duration={1.66}
          style={{ font: light, size: 84, weight: 400, color: INK, align: "left", letterSpacing: -4 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 400, width: 840, height: 100, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          inside of our
        </Title>
        <Title
          id="beyond-3"
          anchor="talk"
          at="word:94"
          duration={0.68}
          style={{ font: light, size: 84, weight: 400, color: BLUE, align: "left", letterSpacing: -4 }}
          animation={{ type: "typewriter", in: 0.3 }}
          box={{ x: 120, y: 500, width: 840, height: 100, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          solar system
        </Title>
      </Track>

      {/* The end card. */}
      <Track id="end" layout="free">
        <Shape
          id="end-card"
          type="rectangle"
          anchor="talk.end"
          duration={2.2}
          width={1080}
          height={1920}
          fill={BLUE}
          box={{ x: 540, y: 960, origin: "center" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        />
        <Title
          id="end-name"
          anchor="talk.end"
          duration={2.2}
          style={{ font: light, size: 160, weight: 400, color: WHITE, align: "center", letterSpacing: -9 }}
          box={{ x: 540, y: 900, width: 960, height: 200, origin: "center" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          uberscene
        </Title>
        <Title
          id="end-credit"
          anchor="talk.end"
          duration={2.2}
          style={{ font: light, size: 40, weight: 400, color: WHITE, align: "center" }}
          box={{ x: 540, y: 1040, width: 600, height: 50, origin: "center" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          footage: NASA
        </Title>
      </Track>

      {/* One key click where a big word or a flash card lands. */}
      <Track id="clicks" layout="free" role="effects">
        <Audio id="click-amazing" src="asset:click" anchor="hook" at="word:45" volume={0.6} />
        <Audio id="click-message" src="asset:click" anchor="hook" at="word:50" volume={0.6} />
        <Audio id="click-stars" src="asset:click" anchor="hook" at="word:52" volume={0.6} />
        <Audio id="click-someone" src="asset:click" anchor="talk" at="word:11" volume={0.6} />
        <Audio id="click-sat" src="asset:click" anchor="talk" at="word:11" offset={0.8} volume={0.6} />
        <Audio id="click-voyager" src="asset:click" anchor="talk" at="word:37" volume={0.6} />
      </Track>

      {/* Keys, as each line types itself in. */}
      <Track id="typing" layout="free" role="effects">
        <Audio id="keys-craft-1" src="asset:type" anchor="talk" at="word:33" volume={0.45} />
        <Audio id="keys-craft-2" src="asset:type" anchor="talk" at="word:35" volume={0.45} />
        <Audio id="keys-quote-1" src="asset:type" anchor="talk" at="word:42" volume={0.45} />
        <Audio id="keys-quote-2" src="asset:type" anchor="talk" at="word:46" volume={0.45} />
        <Audio id="keys-quote-3" src="asset:type" anchor="talk" at="word:50" volume={0.45} />
        <Audio id="keys-quote-4" src="asset:type" anchor="talk" at="word:52" volume={0.45} />
        <Audio id="keys-planets-1" src="asset:type" anchor="talk" at="word:62" volume={0.45} />
        <Audio id="keys-planets-2" src="asset:type" anchor="talk" at="word:63" volume={0.45} />
        <Audio id="keys-planets-3" src="asset:type" anchor="talk" at="word:66" volume={0.45} />
        <Audio id="keys-voyage-1" src="asset:type" anchor="talk" at="word:68" volume={0.45} />
        <Audio id="keys-voyage-2" src="asset:type" anchor="talk" at="word:70" volume={0.45} />
        <Audio id="keys-far-1" src="asset:type" anchor="talk" at="word:82" volume={0.45} />
        <Audio id="keys-far-2" src="asset:type" anchor="talk" at="word:84" volume={0.45} />
        <Audio id="keys-far-3" src="asset:type" anchor="talk" at="word:86" volume={0.45} />
        <Audio id="keys-beyond-1" src="asset:type" anchor="talk" at="word:88" volume={0.45} />
        <Audio id="keys-beyond-2" src="asset:type" anchor="talk" at="word:91" volume={0.45} />
        <Audio id="keys-beyond-3" src="asset:type" anchor="talk" at="word:94" volume={0.45} />
      </Track>
    </Composition>
  );
}
