import { Audio, Clip, Composition, Title, Track } from "@uberscene/kit";

/**
 * Cut on the beat: the music is the clock. `uberscene add groove.wav` found the track's 34 beats (119.97 BPM), and
 * every shot, label and title here starts on one with `anchor="song" at="beat:N"`; nothing is timed in seconds. Two
 * bars of two-beat shots, two bars where the cup changes colour on every beat, two bars of the pour with the words,
 * and two bars where the title punches on each beat. Trim the song and all of it follows.
 */
const INK = "#0f1012";
const TEXT = "#f4f1ea";
const ACCENT = "#ffd43b";
/** The cup's red, for the `recolor` effect. */
const RED = "#c3292a";

export default function Video() {
  return (
    <Composition fps={30} width={1280} height={720} background={{ type: "color", color: INK }}>
      {/* The music, from its first beat to the end of its eighth bar. */}
      <Track id="music" layout="free" role="music">
        <Audio id="song" src="asset:groove" start={0} in="beat:0" out="beat:31.end" volume={0.7} fade={{ out: 0.4 }} />
      </Track>

      {/* Every shot starts on a beat of the song and lasts whole beats (0.5 s each). */}
      <Track id="shots" layout="free">
        <Clip id="wide" src="asset:redCup" anchor="song" at="beat:0" in={2} duration={1.1} fit="cover" volume={0} />
        <Clip
          id="cup"
          src="asset:redCup"
          anchor="song"
          at="beat:2"
          in={6}
          duration={1.1}
          fit="cover"
          volume={0}
          transform={{ scale: 1.9, anchor: { x: 0.55, y: 0.5 } }}
        />
        <Clip
          id="spout"
          src="asset:redCup"
          anchor="song"
          at="beat:4"
          in={10}
          duration={1.1}
          fit="cover"
          volume={0}
          transform={{ scale: 2.6, anchor: { x: 0.5, y: 0.14 } }}
        />
        <Clip
          id="badge"
          src="asset:redCup"
          anchor="song"
          at="beat:6"
          in={14}
          duration={1.1}
          fit="cover"
          volume={0}
          transform={{ scale: 2.6, anchor: { x: 0.27, y: 0.38 } }}
        />
        <Clip
          id="green"
          src="asset:redCup"
          anchor="song"
          at="beat:8"
          in={18.0}
          duration={0.6}
          fit="cover"
          volume={0}
          transform={{ scale: 2.3, anchor: { x: 0.62, y: 0.5 } }}
          effects={[{ type: "recolor", from: RED, to: "#2f9e4f" }]}
        />
        <Clip
          id="blue"
          src="asset:redCup"
          anchor="song"
          at="beat:9"
          in={19.5}
          duration={0.6}
          fit="cover"
          volume={0}
          transform={{ scale: 2.3, anchor: { x: 0.62, y: 0.5 } }}
          effects={[{ type: "recolor", from: RED, to: "#1c7ed6" }]}
        />
        <Clip
          id="yellow"
          src="asset:redCup"
          anchor="song"
          at="beat:10"
          in={21.0}
          duration={0.6}
          fit="cover"
          volume={0}
          transform={{ scale: 2.3, anchor: { x: 0.62, y: 0.5 } }}
          effects={[{ type: "recolor", from: RED, to: "#f5c211" }]}
        />
        <Clip
          id="violet"
          src="asset:redCup"
          anchor="song"
          at="beat:11"
          in={22.5}
          duration={0.6}
          fit="cover"
          volume={0}
          transform={{ scale: 2.3, anchor: { x: 0.62, y: 0.5 } }}
          effects={[{ type: "recolor", from: RED, to: "#7950f2" }]}
        />
        <Clip
          id="orange"
          src="asset:redCup"
          anchor="song"
          at="beat:12"
          in={24.0}
          duration={0.6}
          fit="cover"
          volume={0}
          transform={{ scale: 2.3, anchor: { x: 0.62, y: 0.5 } }}
          effects={[{ type: "recolor", from: RED, to: "#f76707" }]}
        />
        <Clip
          id="teal"
          src="asset:redCup"
          anchor="song"
          at="beat:13"
          in={25.5}
          duration={0.6}
          fit="cover"
          volume={0}
          transform={{ scale: 2.3, anchor: { x: 0.62, y: 0.5 } }}
          effects={[{ type: "recolor", from: RED, to: "#0ca678" }]}
        />
        <Clip
          id="pink"
          src="asset:redCup"
          anchor="song"
          at="beat:14"
          in={27.0}
          duration={0.6}
          fit="cover"
          volume={0}
          transform={{ scale: 2.3, anchor: { x: 0.62, y: 0.5 } }}
          effects={[{ type: "recolor", from: RED, to: "#e64980" }]}
        />
        <Clip
          id="cyan"
          src="asset:redCup"
          anchor="song"
          at="beat:15"
          in={28.5}
          duration={0.6}
          fit="cover"
          volume={0}
          transform={{ scale: 2.3, anchor: { x: 0.62, y: 0.5 } }}
          effects={[{ type: "recolor", from: RED, to: "#22b8cf" }]}
        />
        <Clip id="hand" src="asset:redCup" anchor="song" at="beat:16" in={38} duration={1.1} fit="cover" volume={0} />
        <Clip
          id="jug"
          src="asset:redCup"
          anchor="song"
          at="beat:18"
          in={41}
          duration={1.1}
          fit="cover"
          volume={0}
          transform={{ scale: 1.5, anchor: { x: 0.6, y: 0.5 } }}
        />
        <Clip
          id="pour"
          src="asset:redCup"
          anchor="song"
          at="beat:20"
          in={45}
          duration={1.1}
          fit="cover"
          volume={0}
          transform={{ scale: 1.8, anchor: { x: 0.5, y: 0.35 } }}
        />
        <Clip id="lift" src="asset:redCup" anchor="song" at="beat:22" in={49} duration={1.1} fit="cover" volume={0} />
        {/* The last two bars: one shot that punches in a little on every beat. */}
        <Clip
          id="last"
          src="asset:redCup"
          anchor="song"
          at="beat:24"
          in={30}
          duration={4}
          fit="cover"
          volume={0}
          transform={{
            anchor: { x: 0.55, y: 0.5 },
            scale: [
              { at: 0, value: 1.12, easing: "easeOutQuart" },
              { at: 0.45, value: 1.05, easing: "hold" },
              { at: 0.5, value: 1.15, easing: "easeOutQuart" },
              { at: 0.95, value: 1.08, easing: "hold" },
              { at: 1, value: 1.18, easing: "easeOutQuart" },
              { at: 1.45, value: 1.11, easing: "hold" },
              { at: 1.5, value: 1.21, easing: "easeOutQuart" },
              { at: 1.95, value: 1.14, easing: "hold" },
              { at: 2, value: 1.24, easing: "easeOutQuart" },
              { at: 2.45, value: 1.17, easing: "hold" },
              { at: 2.5, value: 1.27, easing: "easeOutQuart" },
              { at: 2.95, value: 1.2, easing: "hold" },
              { at: 3, value: 1.3, easing: "easeOutQuart" },
              { at: 3.45, value: 1.23, easing: "hold" },
              { at: 3.5, value: 1.33, easing: "easeOutQuart" },
              { at: 3.95, value: 1.26, easing: "hold" },
            ],
          }}
        />
      </Track>

      {/* The reference each shot is cut on, as its label. */}
      <Track id="labels" layout="free">
        <Title
          id="l0"
          anchor="song"
          at="beat:0"
          duration={1}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:0
        </Title>
        <Title
          id="l2"
          anchor="song"
          at="beat:2"
          duration={1}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:2
        </Title>
        <Title
          id="l4"
          anchor="song"
          at="beat:4"
          duration={1}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:4
        </Title>
        <Title
          id="l6"
          anchor="song"
          at="beat:6"
          duration={1}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:6
        </Title>
        <Title
          id="l8"
          anchor="song"
          at="beat:8"
          duration={0.5}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:8
        </Title>
        <Title
          id="l9"
          anchor="song"
          at="beat:9"
          duration={0.5}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:9
        </Title>
        <Title
          id="l10"
          anchor="song"
          at="beat:10"
          duration={0.5}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:10
        </Title>
        <Title
          id="l11"
          anchor="song"
          at="beat:11"
          duration={0.5}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:11
        </Title>
        <Title
          id="l12"
          anchor="song"
          at="beat:12"
          duration={0.5}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:12
        </Title>
        <Title
          id="l13"
          anchor="song"
          at="beat:13"
          duration={0.5}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:13
        </Title>
        <Title
          id="l14"
          anchor="song"
          at="beat:14"
          duration={0.5}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:14
        </Title>
        <Title
          id="l15"
          anchor="song"
          at="beat:15"
          duration={0.5}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:15
        </Title>
        <Title
          id="l16"
          anchor="song"
          at="beat:16"
          duration={1}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:16
        </Title>
        <Title
          id="l18"
          anchor="song"
          at="beat:18"
          duration={1}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:18
        </Title>
        <Title
          id="l20"
          anchor="song"
          at="beat:20"
          duration={1}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:20
        </Title>
        <Title
          id="l22"
          anchor="song"
          at="beat:22"
          duration={1}
          style={{ font: "$mono", size: 34, weight: 700, color: INK, background: ACCENT, align: "left" }}
          box={{ x: 72, y: 48, width: 200, height: 58, origin: "topLeft" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          beat:22
        </Title>
      </Track>

      {/* The words, two beats each, then the title for the last two bars. */}
      <Track id="words" layout="free">
        <Title
          id="w1"
          anchor="song"
          at="beat:16"
          duration={1}
          style={{ size: 64, weight: 800, color: TEXT, background: "rgba(15, 16, 18, 0.72)" }}
          box={{ x: 640, y: 610, width: 700, height: 96, origin: "center" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          Every cut
        </Title>
        <Title
          id="w2"
          anchor="song"
          at="beat:18"
          duration={1}
          style={{ size: 64, weight: 800, color: TEXT, background: "rgba(15, 16, 18, 0.72)" }}
          box={{ x: 640, y: 610, width: 700, height: 96, origin: "center" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          is on a beat.
        </Title>
        <Title
          id="w3"
          anchor="song"
          at="beat:20"
          duration={1}
          style={{ size: 64, weight: 800, color: TEXT, background: "rgba(15, 16, 18, 0.72)" }}
          box={{ x: 640, y: 610, width: 700, height: 96, origin: "center" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          Trim the song,
        </Title>
        <Title
          id="w4"
          anchor="song"
          at="beat:22"
          duration={1}
          style={{ size: 64, weight: 800, color: TEXT, background: "rgba(15, 16, 18, 0.72)" }}
          box={{ x: 640, y: 610, width: 700, height: 96, origin: "center" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          they follow.
        </Title>
        <Title
          id="title"
          anchor="song"
          at="beat:24"
          duration={4}
          style={{ size: 96, weight: 900, color: TEXT, background: "rgba(15, 16, 18, 0.72)" }}
          box={{ x: 640, y: 360, width: 900, height: 150, origin: "center" }}
          enter={{ type: "none" }}
          exit={{ type: "none" }}
        >
          Cut on the beat.
        </Title>
      </Track>
    </Composition>
  );
}
