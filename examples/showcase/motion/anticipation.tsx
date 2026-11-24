import { Composition, Shape, Track } from "@uberscene/kit";

// Anticipation: a small pull back before the move, so the eye knows it is coming.
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
          id="runner"
          type="rectangle"
          start={0}
          duration={3}
          width={64}
          height={64}
          cornerRadius={8}
          fill={ACCENT}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0.4, value: 200, easing: "easeOutCubic" },
              { at: 0.8, value: 160, easing: "easeOutQuart" },
              { at: 1.3, value: 500 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
