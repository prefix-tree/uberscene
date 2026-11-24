import { Clip, Composition, Shape, Track } from "@uberscene/kit";

// A rack focus: sharpness moves from the background to a card in front, to move attention without a cut.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";

export default function Video() {
  return (
    <Composition
      fps={30}
      width={640}
      height={360}
      background={{ type: "color", color: PAPER }}
      theme={{
        extends: "paper",
        motion: "none",
        fonts: { heading: "Inter", body: "Inter" },
        palette: { primary: ACCENT, accent: ACCENT, background: PAPER, text: INK },
      }}
    >
      <Clip
        id="shot"
        src="asset:redCup"
        in={18}
        out={21}
        fit="cover"
        effects={[
          {
            type: "blur",
            radius: [
              { at: 0.9, value: 0, easing: "easeInOutSine" },
              { at: 1.6, value: 8 },
            ],
          },
        ]}
      />
      <Track id="front" layout="free">
        <Shape
          id="card"
          type="rectangle"
          start={0}
          duration={3}
          width={220}
          height={120}
          cornerRadius={14}
          fill={PAPER}
          box={{ x: 320, y: 180, origin: "center" }}
          effects={[
            {
              type: "blur",
              radius: [
                { at: 0.9, value: 10, easing: "easeInOutSine" },
                { at: 1.6, value: 0 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
