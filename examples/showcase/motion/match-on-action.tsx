import { Composition, Shape, Track } from "@uberscene/kit";

// A cut on motion: the subject leaves fast one way and the next one arrives already moving the same way.
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
      <Track id="main">
        <Shape
          id="leaving"
          type="circle"
          duration={1.5}
          width={90}
          height={90}
          fill={INK}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0.6, value: 320, easing: "easeInQuart" },
              { at: 1.5, value: 40 },
            ],
          }}
        />
        <Shape
          id="arriving"
          type="rectangle"
          duration={1.5}
          width={90}
          height={90}
          cornerRadius={12}
          fill={ACCENT}
          box={{
            y: 180,
            origin: "center",
            x: [
              { at: 0, value: 600, easing: "easeOutQuart" },
              { at: 0.6, value: 320 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
