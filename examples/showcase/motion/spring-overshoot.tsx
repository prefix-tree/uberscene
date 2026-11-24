import { Composition, Shape, Track } from "@uberscene/kit";

// Overshoot: an entrance that passes its size and settles back, for something that should feel alive.
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
      <Track id="shapes" layout="free">
        <Shape
          id="pop"
          type="rectangle"
          start={0}
          duration={3}
          width={120}
          height={120}
          cornerRadius={14}
          fill={ACCENT}
          box={{ x: 320, y: 180, origin: "center" }}
          transform={{
            scale: [
              { at: 0.3, value: 0.01, easing: "easeOutBack" },
              { at: 0.9, value: 1 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
