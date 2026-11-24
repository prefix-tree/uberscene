import { Composition, Shape, Track } from "@uberscene/kit";

// Stagger: the same entrance, started one after another, so a group arrives as a wave.
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
          id="card1"
          type="rectangle"
          start={0}
          duration={3}
          width={60}
          height={60}
          cornerRadius={8}
          fill={INK}
          box={{
            x: 160,
            origin: "center",
            y: [
              { at: 0.3, value: 240, easing: "easeOutQuart" },
              { at: 0.9, value: 180 },
            ],
          }}
          transform={{
            opacity: [
              { at: 0.3, value: 0 },
              { at: 0.6, value: 1 },
            ],
          }}
        />
        <Shape
          id="card2"
          type="rectangle"
          start={0}
          duration={3}
          width={60}
          height={60}
          cornerRadius={8}
          fill={INK}
          box={{
            x: 240,
            origin: "center",
            y: [
              { at: 0.38, value: 240, easing: "easeOutQuart" },
              { at: 0.98, value: 180 },
            ],
          }}
          transform={{
            opacity: [
              { at: 0.38, value: 0 },
              { at: 0.68, value: 1 },
            ],
          }}
        />
        <Shape
          id="card3"
          type="rectangle"
          start={0}
          duration={3}
          width={60}
          height={60}
          cornerRadius={8}
          fill={ACCENT}
          box={{
            x: 320,
            origin: "center",
            y: [
              { at: 0.46, value: 240, easing: "easeOutQuart" },
              { at: 1.06, value: 180 },
            ],
          }}
          transform={{
            opacity: [
              { at: 0.46, value: 0 },
              { at: 0.76, value: 1 },
            ],
          }}
        />
        <Shape
          id="card4"
          type="rectangle"
          start={0}
          duration={3}
          width={60}
          height={60}
          cornerRadius={8}
          fill={INK}
          box={{
            x: 400,
            origin: "center",
            y: [
              { at: 0.54, value: 240, easing: "easeOutQuart" },
              { at: 1.14, value: 180 },
            ],
          }}
          transform={{
            opacity: [
              { at: 0.54, value: 0 },
              { at: 0.84, value: 1 },
            ],
          }}
        />
        <Shape
          id="card5"
          type="rectangle"
          start={0}
          duration={3}
          width={60}
          height={60}
          cornerRadius={8}
          fill={INK}
          box={{
            x: 480,
            origin: "center",
            y: [
              { at: 0.62, value: 240, easing: "easeOutQuart" },
              { at: 1.22, value: 180 },
            ],
          }}
          transform={{
            opacity: [
              { at: 0.62, value: 0 },
              { at: 0.92, value: 1 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
