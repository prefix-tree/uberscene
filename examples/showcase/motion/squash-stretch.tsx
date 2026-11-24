import { Composition, Shape, Track } from "@uberscene/kit";

// Squash and stretch: a ball that stretches as it falls and squashes on impact, so it reads as soft and heavy.
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
          id="floor"
          type="rectangle"
          start={0}
          duration={3}
          width={360}
          height={4}
          fill={INK}
          box={{ x: 320, y: 302, origin: "center" }}
        />
        <Shape
          id="ball"
          type="circle"
          start={0}
          duration={3}
          width={70}
          height={70}
          fill={ACCENT}
          box={{
            x: 320,
            origin: "bottom",
            y: [
              { at: 0.3, value: 110, easing: "easeInQuad" },
              { at: 0.8, value: 300 },
              { at: 0.95, value: 300, easing: "easeOutQuad" },
              { at: 1.45, value: 160, easing: "easeInQuad" },
              { at: 1.95, value: 300 },
            ],
          }}
          transform={{
            anchor: { x: 0.5, y: 1 },
            scale: [
              { at: 0.3, value: { x: 1, y: 1 } },
              { at: 0.74, value: { x: 0.86, y: 1.16 } },
              { at: 0.82, value: { x: 1.35, y: 0.68 } },
              { at: 0.97, value: { x: 1, y: 1 } },
              { at: 1.9, value: { x: 0.92, y: 1.08 } },
              { at: 1.99, value: { x: 1.2, y: 0.82 } },
              { at: 2.12, value: { x: 1, y: 1 } },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
