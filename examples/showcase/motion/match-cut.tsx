import { Composition, Shape, Track } from "@uberscene/kit";

// A match cut: the next scene starts with the same shape in the same place, so the change reads as one move.
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
          id="before"
          type="circle"
          duration={1.5}
          width={120}
          height={120}
          fill={ACCENT}
          box={{ x: 320, y: 180, origin: "center" }}
          transform={{
            scale: [
              { at: 0, value: 0.6, easing: "easeOutCubic" },
              { at: 1.5, value: 1 },
            ],
          }}
        />
        <Shape
          id="after"
          type="circle"
          duration={1.5}
          width={120}
          height={120}
          fill={INK}
          box={{ x: 320, y: 180, origin: "center" }}
          transform={{
            scale: [
              { at: 0, value: 1, easing: "easeOutCubic" },
              { at: 1.5, value: 1.4 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
