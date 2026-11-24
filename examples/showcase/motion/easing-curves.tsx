import { Composition, Shape, Track } from "@uberscene/kit";

// Ease out: fast off the mark, gentle into place. The top square moves at an even speed; the bottom one eases out.
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
          id="linear"
          type="rectangle"
          start={0}
          duration={3}
          width={56}
          height={56}
          cornerRadius={8}
          fill={MUTED}
          box={{
            y: 130,
            origin: "center",
            x: [
              { at: 0.4, value: 120 },
              { at: 1.4, value: 520 },
            ],
          }}
        />
        <Shape
          id="eased"
          type="rectangle"
          start={0}
          duration={3}
          width={56}
          height={56}
          cornerRadius={8}
          fill={ACCENT}
          box={{
            y: 230,
            origin: "center",
            x: [
              { at: 0.4, value: 120, easing: "easeOutQuart" },
              { at: 1.4, value: 520 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
