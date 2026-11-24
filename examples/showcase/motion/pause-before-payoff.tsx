import { Composition, Shape, Track } from "@uberscene/kit";

// The pause before the payoff: action, a half-second of stillness, then the result lands.
const PAPER = "#f2eee6";
const INK = "#151515";
const ACCENT = "#d6336c";
const MUTED = "#c9c2b6";

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
          id="button"
          type="rectangle"
          start={0}
          duration={3}
          width={140}
          height={52}
          cornerRadius={26}
          fill={INK}
          box={{ x: 220, y: 180, origin: "center" }}
          transform={{
            scale: [
              { at: 0.95, value: 1, easing: "easeOutQuad" },
              { at: 1.02, value: 0.9, easing: "easeOutQuad" },
              { at: 1.15, value: 1 },
            ],
          }}
        />
        <Shape
          id="pointer"
          type="circle"
          start={0}
          duration={3}
          width={26}
          height={26}
          fill={MUTED}
          box={{
            x: [
              { at: 0.2, value: 80, easing: "easeInOutCubic" },
              { at: 0.95, value: 225 },
            ],
            y: [
              { at: 0.2, value: 300, easing: "easeInOutCubic" },
              { at: 0.95, value: 186 },
            ],
          }}
        />
        <Shape
          id="result"
          type="star"
          start={0}
          duration={3}
          width={120}
          height={120}
          fill={ACCENT}
          box={{ x: 450, y: 180, origin: "center" }}
          transform={{
            scale: [
              { at: 1.6, value: 0.01, easing: "easeOutBack" },
              { at: 2.1, value: 1 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
